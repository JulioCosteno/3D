// Interacción unificada: ratón/táctil en escritorio y rayos de los controles (o manos) en WebXR.
// Cualquier objeto registrado con add(obj, {onSelect, onHover}) puede seleccionarse con ambos.
import * as THREE from 'three';

export class Interaction {
  constructor(app) {
    this.app = app;
    this.entries = new Map();          // Object3D -> {onSelect, onHover, owner}
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerActive = false;
    this.hovered = new Map();          // fuente -> objeto
    this.down = null;
    this.controllers = [];
    this._tmpMat = new THREE.Matrix4();
    this._list = [];
    this._dirty = true;

    const el = app.renderer.domElement;
    el.addEventListener('pointermove', (e) => { this._setPointer(e); this.pointerActive = true; });
    el.addEventListener('pointerleave', () => { this.pointerActive = false; this._setHover('mouse', null); });
    el.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!this.down) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      const dt = performance.now() - this.down.t;
      this.down = null;
      if (moved < 6 && dt < 700) {
        this._setPointer(e);
        this.raycaster.setFromCamera(this.pointer, app.camera);
        this._select(this._hit());
      }
    });
  }

  _setPointer(e) {
    const r = this.app.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  add(obj, { onSelect = null, onHover = null, owner = 'global', highlight = true } = {}) {
    this.entries.set(obj, { onSelect, onHover, owner, highlight });
    this._dirty = true;
    return obj;
  }
  remove(obj) { this.entries.delete(obj); this._dirty = true; }
  removeWhere(pred) {
    for (const [o, e] of this.entries) if (pred(o, e)) { this.entries.delete(o); }
    for (const [src, o] of this.hovered) if (!this.entries.has(o)) this.hovered.delete(src);
    this._dirty = true;
  }
  clearOwner(owner) { this.removeWhere((o, e) => e.owner === owner); }

  _visible(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

  _hit() {
    if (this._dirty) { this._list = [...this.entries.keys()]; this._dirty = false; }
    this.raycaster.camera = this.app.camera;
    const hits = this.raycaster.intersectObjects(this._list.filter((o) => this._visible(o)), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !this.entries.has(o)) o = o.parent;
      if (o) return { object: o, distance: h.distance, point: h.point };
    }
    return null;
  }

  _select(hit) {
    if (!hit) { this.app.onEmptySelect?.(); return; }
    const e = this.entries.get(hit.object);
    try { e?.onSelect?.(hit); } catch (err) { this.app.reportError(err); }
  }

  _setHover(source, obj) {
    const prev = this.hovered.get(source) || null;
    if (prev === obj) return;
    if (prev) {
      this.hovered.delete(source);
      if (![...this.hovered.values()].includes(prev)) this._applyHover(prev, false);
    }
    if (obj) { this.hovered.set(source, obj); this._applyHover(obj, true); }
    if (source === 'mouse') this.app.renderer.domElement.style.cursor = obj ? 'pointer' : 'default';
  }

  _applyHover(obj, on) {
    const e = this.entries.get(obj);
    if (!e) return;
    if (e.onHover) { try { e.onHover(on); } catch (err) { this.app.reportError(err); } return; }
    if (!e.highlight) return;
    obj.traverse((m) => {
      if (m.material && m.material.emissive) {
        if (on) { m.userData._em = m.userData._em ?? m.material.emissiveIntensity; m.material.emissiveIntensity = (m.userData._em || 0) + 0.6; if (m.material.emissive.getHex() === 0) { m.userData._emc = true; m.material.emissive.set('#335577'); } }
        else if (m.userData._em !== undefined) { m.material.emissiveIntensity = m.userData._em; if (m.userData._emc) { m.material.emissive.set(0); m.userData._emc = false; } }
      }
    });
  }

  // ---------- WebXR ----------
  setupXR(renderer, scene) {
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 }));
      line.scale.z = 4;
      controller.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.visible = false;
      scene.add(dot);
      controller.userData = { line, dot, index: i, connected: false };
      controller.addEventListener('connected', (e) => {
        controller.userData.connected = true;
        controller.userData.inputSource = e.data;
        line.visible = e.data.targetRayMode === 'tracked-pointer';
      });
      controller.addEventListener('disconnected', () => { controller.userData.connected = false; this._setHover('xr' + i, null); dot.visible = false; });
      controller.addEventListener('selectstart', () => {
        this._rayFromController(controller);
        this._select(this._hit());
      });
      scene.add(controller);

      // Modelo sencillo del control (sin descargar perfiles externos).
      const grip = renderer.xr.getControllerGrip(i);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 }));
      body.rotation.x = Math.PI / 2 - 0.35;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 8, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0e7490, emissiveIntensity: 0.6 }));
      ring.position.set(0, 0.02, -0.05); ring.rotation.x = 0.4;
      grip.add(body, ring);
      scene.add(grip);
      this.controllers.push(controller);
    }
  }

  _rayFromController(controller) {
    this._tmpMat.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tmpMat);
  }

  update() {
    const xr = this.app.renderer.xr.isPresenting;
    if (xr) {
      for (const c of this.controllers) {
        if (!c.userData.connected) continue;
        this._rayFromController(c);
        const hit = this._hit();
        this._setHover('xr' + c.userData.index, hit ? hit.object : null);
        c.userData.line.scale.z = hit ? hit.distance : 4;
        c.userData.dot.visible = !!hit;
        if (hit) c.userData.dot.position.copy(hit.point);
      }
      this._setHover('mouse', null);
    } else if (this.pointerActive && !this.down) {
      this.raycaster.setFromCamera(this.pointer, this.app.camera);
      const hit = this._hit();
      this._setHover('mouse', hit ? hit.object : null);
    }
  }
}
