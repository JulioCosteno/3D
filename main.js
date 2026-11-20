// Laboratorio inmersivo de variables y dimensiones — v2.0
// Inicialización, navegación entre escenas, WebXR y diagnóstico.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { buildEnvironment } from './core/environment.js';
import { Interaction } from './core/interaction.js';
import { UI } from './core/ui.js';
import { COLORS } from './core/theme.js';

import Scene1 from './scenes/scene1.js';
import Scene2 from './scenes/scene2.js';
import Scene3 from './scenes/scene3.js';
import Scene4 from './scenes/scene4.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class App {
  constructor() {
    this.isStandalone = /OculusBrowser|Quest|Pico|Mobile VR/i.test(navigator.userAgent);
    this.tweens = [];
    this.scenes = [];
    this.currentIndex = -1;
    this.transitioning = false;
    this.errors = [];
    this.colors = COLORS;
  }

  async start() {
    (window.__labErrors || []).forEach((m) => this.showFatal(m));

    // ---------- Renderizador ----------
    const canvas = document.getElementById('scene-canvas');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      throw new Error('No fue posible crear el contexto WebGL. Verifica que la aceleración por hardware esté activa. Detalle: ' + e.message);
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isStandalone ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');

    // ---------- Escena y cámara ----------
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 80);
    this.camera.position.set(0, 1.65, 1.6);
    this.scene.add(this.camera);
    this.onResize();
    buildEnvironment(this.scene, { quality: this.isStandalone ? 'low' : 'high' });

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 1.2, -2);
    this.controls.update();

    // Velo para transiciones suaves (hijo de la cámara: funciona también en el visor).
    this.fader = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: '#e6ecf4', transparent: true, opacity: 1, depthTest: false, depthWrite: false }));
    this.fader.position.z = -0.12;
    this.fader.renderOrder = 999;
    this.camera.add(this.fader);

    this.interaction = new Interaction(this);
    this.interaction.setupXR(renderer, this.scene);
    this.ui = new UI(this);

    // ---------- WebXR ----------
    await this._setupXR();

    // ---------- Datos ----------
    try {
      const res = await fetch('data/students.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.data = await res.json();
    } catch (e) {
      throw new Error('No se pudo cargar data/students.json (' + e.message + '). Ejecuta el proyecto desde un servidor local.');
    }

    // ---------- Escenas ----------
    this.scenes = [new Scene1(this), new Scene2(this), new Scene3(this), new Scene4(this)];
    for (const s of this.scenes) {
      s.group.visible = false;
      this.scene.add(s.group);
      await s.init();
    }

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      if (e.key >= '1' && e.key <= '4') this.goTo(+e.key - 1);
      if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('panels-hidden');
      if (e.key === 'ArrowRight') this.ui.step(1);
      if (e.key === 'ArrowLeft') this.ui.step(-1);
    });

    this.clock = new THREE.Clock();
    this.fps = { frames: 0, t: 0, value: 0 };
    renderer.setAnimationLoop(() => this.loop());

    const initial = Math.min(3, Math.max(0, (parseInt(new URLSearchParams(location.search).get('escena'), 10) || 1) - 1));
    this.goTo(initial, true);
    document.getElementById('loading').classList.add('hide');
    window.__labStarted = true;
    window.__lab = this; // útil para depuración desde la consola
  }

  async _setupXR() {
    this.xrStatus = 'no disponible';
    const slot = document.getElementById('xr-slot');
    if (!window.isSecureContext) {
      this.xrStatus = 'requiere HTTPS o localhost';
    } else if ('xr' in navigator) {
      try {
        const ok = await navigator.xr.isSessionSupported('immersive-vr');
        this.xrStatus = ok ? 'disponible' : 'no compatible en este dispositivo';
      } catch (e) { this.xrStatus = 'error: ' + e.message; }
    }
    // VRButton se muestra siempre: si no hay soporte, el propio botón lo indica.
    const btn = VRButton.createButton(this.renderer, { optionalFeatures: ['hand-tracking'] });
    slot.append(btn);

    const r = this.renderer;
    r.xr.addEventListener('sessionstart', () => {
      this._desktopPose = { p: this.camera.position.clone(), t: this.controls.target.clone() };
      this.controls.enabled = false;
      try { r.xr.setFoveation(1); } catch (_) { /* opcional */ }
      this.ui.updateVisibility();
      this.ui.refresh();
      this.current?.onXRChange?.(true);
    });
    r.xr.addEventListener('sessionend', () => {
      this.controls.enabled = true;
      this.ui.updateVisibility();
      if (this._desktopPose) { this.camera.position.copy(this._desktopPose.p); this.controls.target.copy(this._desktopPose.t); this.controls.update(); }
      this.current?.onXRChange?.(false);
    });
  }

  get current() { return this.scenes[this.currentIndex]; }
  isXR() { return this.renderer.xr.isPresenting; }

  tween(duration, onUpdate, onDone) {
    const tw = { t: 0, duration, onUpdate, onDone };
    this.tweens.push(tw);
    onUpdate(0);
    return tw;
  }

  setCameraPreset(p, animate = true) {
    if (!p || this.isXR()) return;
    const fromP = this.camera.position.clone(), fromT = this.controls.target.clone();
    const toP = new THREE.Vector3(...p.position), toT = new THREE.Vector3(...p.target);
    if (!animate) { this.camera.position.copy(toP); this.controls.target.copy(toT); this.controls.update(); return; }
    this.tween(0.9, (k) => {
      const e = ease(k);
      this.camera.position.lerpVectors(fromP, toP, e);
      this.controls.target.lerpVectors(fromT, toT, e);
    });
  }

  goTo(index, instant = false, which = null) {
    if (!this.scenes[index]) return;
    if (this.transitioning) { this._pending = index; return; }
    if (index === this.currentIndex) return;
    this.transitioning = true;
    const swap = () => {
      const old = this.current;
      if (old) { old.exit?.(); old.group.visible = false; }
      this.currentIndex = index;
      const s0 = this.scenes[index];
      this.ui.detail = null;
      if (which === 'last') s0.stepIndex = s0.getGuide().steps.length - 1;
      const s = this.current;
      s.group.visible = true;
      s.enter?.();
      this.setCameraPreset(s.cameraPreset, false);
      this.ui.enterStep();
      // Animación de entrada: el contenido se eleva y se escala suavemente.
      s.group.scale.setScalar(0.94); s.group.position.y = -0.15;
      this.tween(0.7, (k) => { const e = ease(k); s.group.scale.setScalar(0.94 + 0.06 * e); s.group.position.y = -0.15 * (1 - e); });
      this.tween(instant ? 0.6 : 0.45, (k) => { this.fader.material.opacity = 1 - ease(k); }, () => {
        this.fader.visible = false; this.transitioning = false;
        if (this._pending !== undefined) { const p = this._pending; this._pending = undefined; this.goTo(p); }
      });
      history.replaceState(null, '', '?escena=' + (index + 1));
    };
    if (instant) { swap(); return; }
    this.fader.visible = true;
    this.tween(0.3, (k) => { this.fader.material.opacity = ease(k); }, swap);
  }

  onEmptySelect() { this.current?.onEmptySelect?.(); }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // Desplaza el centro óptico hacia arriba para que la tarjeta guía no tape los modelos (solo escritorio).
    this.camera.setViewOffset(w, h, 0, Math.round(Math.min(150, h * 0.15)), w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  reportError(err) {
    console.error(err);
    this.showFatal((err && err.message) || String(err));
  }
  showFatal(msg) { if (window.__labShowFatal) window.__labShowFatal(msg); }

  _pollThumbsticks(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || gp.axes.length < 4) continue;
      const x = gp.axes[2], y = gp.axes[3];
      if (Math.abs(x) > 0.15 || Math.abs(y) > 0.15) this.current?.onThumbstick?.(x, y, dt, src.handedness);
    }
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.cancel) { this.tweens.splice(i, 1); continue; }
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.duration);
      tw.onUpdate(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.onDone && tw.onDone(); }
    }
    if (!this.isXR()) this.controls.update();
    else this._pollThumbsticks(dt);
    this.interaction.update();
    try { this.current?.update?.(dt, t); } catch (e) { if (!this._updErr) { this._updErr = true; this.reportError(e); } }
    this.renderer.render(this.scene, this.camera);

    this.fps.frames++; this.fps.t += dt;
    if (this.fps.t >= 1) {
      this.fps.value = Math.round(this.fps.frames / this.fps.t); this.fps.frames = 0; this.fps.t = 0;
      const gl = this.renderer.capabilities.isWebGL2 ? 'WebGL 2' : 'WebGL 1';
      const xrCls = this.xrStatus === 'disponible' ? '' : ' class="warn"';
      document.getElementById('diag').innerHTML = `${gl} · WebXR: <span${xrCls}>${this.xrStatus}</span> · ${this.fps.value} fps`;
    }
  }
}

const app = new App();
app.start().catch((e) => {
  console.error(e);
  app.showFatal(e.message || String(e));
  document.getElementById('loading')?.classList.add('hide');
});
