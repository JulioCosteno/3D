// Escena 2 — Representar dimensiones.
// Sistema cartesiano 3D con estudiantes ficticios como puntos. Se pueden asignar variables a los
// ejes X, Y, Z, pasar de 1 a 3 dimensiones de representación, normalizar (mín–máx o z) y
// seleccionar puntos para consultar sus valores originales y transformados.
import * as THREE from 'three';
import { BaseScene } from '../core/sceneBase.js';
import { makeLabel } from '../core/text.js';
import { COLORS } from '../core/theme.js';

const L = 1.4; // longitud de cada eje (m)

const VARS = {
  minutos_plataforma: { label: 'Minutos en plataforma', unit: 'min', kind: 'continua', dec: 0 },
  participaciones_foro: { label: 'Mensajes en foro', unit: 'mensajes', kind: 'discreta', dec: 0 },
  asistencia_sincronica: { label: 'Sesiones sincrónicas', unit: 'de 8', kind: 'discreta', dec: 0 },
  casos: { label: 'Análisis de casos', unit: '0–10', kind: 'continua', dec: 1 },
  carteles: { label: 'Carteles', unit: '0–10', kind: 'continua', dec: 1 },
  ensayos: { label: 'Ensayos', unit: '0–10', kind: 'continua', dec: 1 },
  exposicion: { label: 'Exposición', unit: '0–10', kind: 'continua', dec: 1 },
  calificacion_final: { label: 'Calificación final', unit: '0–10', kind: 'continua', dec: 2 },
  dominio_tic_codigo: { label: 'Dominio de TIC', unit: 'código ordinal', kind: 'ordinal', dec: 0, cats: ['Básico', 'Intermedio', 'Avanzado'] },
  modalidad_preferida: { label: 'Modalidad preferida', unit: 'código nominal', kind: 'nominal', dec: 0 },
  estatura_cm: { label: 'Estatura', unit: 'cm', kind: 'continua', dec: 0 },
  peso_kg: { label: 'Peso', unit: 'kg', kind: 'continua', dec: 0 },
  edad: { label: 'Edad', unit: 'años', kind: 'discreta', dec: 0 },
  hermanos: { label: 'Hermanos', unit: 'personas', kind: 'discreta', dec: 0 },
  horas_estudio_semana: { label: 'Horas de estudio', unit: 'h/sem', kind: 'continua', dec: 1 },
  calificacion_estadistica: { label: 'Calificación', unit: '0–10', kind: 'continua', dec: 1 },
  ind_media: { label: 'Ind. media', unit: '0–10', kind: 'continua', dec: 1 },
  ind_desviacion: { label: 'Ind. desviación', unit: '0–10', kind: 'continua', dec: 1 },
  ind_distribucion: { label: 'Ind. distribución', unit: '0–10', kind: 'continua', dec: 1 },
  nivel_educativo_codigo: { label: 'Nivel educativo', unit: 'código ordinal', kind: 'ordinal', dec: 0, cats: ['Primaria', 'Secundaria', 'Bachillerato', 'Licenciatura', 'Posgrado'] },
  carrera: { label: 'Carrera', unit: 'código nominal', kind: 'nominal', dec: 0 },
};
const AX = ['x', 'y', 'z'];
const RAMP = ['#f59e0b', '#db2777', '#4c1d95'];            // bajo → alto (secuencial)
const CAT_COLORS = ['#2563eb', '#db2777', '#16a34a', '#f59e0b', '#7c3aed'];
const CAT_NAMES = ['azul', 'rosa', 'verde', 'ámbar', 'morado'];
const AX_COLOR = { x: COLORS.axisX, y: COLORS.axisY, z: COLORS.axisZ };

export default class Scene2 extends BaseScene {
  constructor(app) {
    super(app, 'escena2', { title: 'Representar dimensiones', short: 'Dimensiones' });
    this.state = { dims: 1, axes: { x: 'v1', y: 'v1', z: 'v1' }, norm: 'minmax', selected: null, auto: false,
      view: 'cartesian', colorVar: null, sizeVar: null,
      parVars: [] };
    this.cameraPreset = { position: [1.2, 1.95, 1.6], target: [0, 1.3, -2] };
    this.rotTarget = 0.5;
    this.zoomTarget = 1;
  }

  async init() {
    // Filas propias (solo identificador y nombre): las variables v1, v2… se generan al agregarlas.
    this.rows = this.app.data.estudiantes.map((r) => ({ id: r.id, nombre: r.nombre }));
    const rows = this.rows;
    for (const k of Object.keys(VARS)) delete VARS[k];
    this.stats = {};
    this.vlist = [];
    this.nextType = 'continua';
    this.labelMode = 'ocultar';   // vista limpia al inicio; el botón o la tecla E muestran las coordenadas
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'e' || e.key === 'E') && this.app.current === this && !(e.target.closest && e.target.closest('input,select,textarea'))) this.toggleLabels();
    });
    // Factor común ficticio: hace que algunas variables queden correlacionadas entre sí
    const rng = mulberry32(2026);
    this.F = rows.map(() => gauss(rng));
    this.addVariable('continua', false);
    Object.assign(this.state, { numVars: ['v1'], catVars: [], shapeVar: null, labelVar: null, parVars: ['v1'] });

    // Pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.36, 48), BaseScene.mat('#ffffff', { roughness: 0.6 }));
    ped.position.y = 0.18; ped.receiveShadow = true; ped.castShadow = true;
    this.root.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.01, 6, 80), new THREE.MeshBasicMaterial({ color: COLORS.dimension }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.36;
    this.root.add(ring);

    this.pivot = new THREE.Group();
    this.pivot.position.set(0, 0.42 + L / 2 + 0.05, 0);
    this.root.add(this.pivot);
    this.plot = new THREE.Group();
    this.plot.position.set(-L / 2, -L / 2, -L / 2);
    this.pivot.add(this.plot);

    // Planos de referencia (rejillas tenues)
    const mkGrid = () => { const gh = new THREE.GridHelper(L, 8, 0x3b4f74, 0x23324d); gh.material.transparent = true; gh.material.opacity = 0.55; return gh; };
    this.gridXZ = mkGrid(); this.gridXZ.position.set(L / 2, 0, L / 2);
    this.gridXY = mkGrid(); this.gridXY.rotation.x = Math.PI / 2; this.gridXY.position.set(L / 2, L / 2, 0);
    this.gridYZ = mkGrid(); this.gridYZ.rotation.z = Math.PI / 2; this.gridYZ.position.set(0, L / 2, L / 2);
    this.plot.add(this.gridXZ, this.gridXY, this.gridYZ);

    // Ejes
    this.axisObjs = {};
    for (const a of AX) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: AX_COLOR[a], emissive: AX_COLOR[a], emissiveIntensity: 0.35, roughness: 0.4 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, L + 0.12, 10), mat);
      shaft.position.y = (L + 0.12) / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 14), mat);
      tip.position.y = L + 0.16;
      g.add(shaft, tip);
      if (a === 'x') g.rotation.z = -Math.PI / 2;
      if (a === 'z') g.rotation.x = Math.PI / 2;
      const title = makeLabel('', { height: 0.06, border: AX_COLOR[a] });
      const ticks = new THREE.Group();
      this.plot.add(g, title, ticks);
      this.axisObjs[a] = { g, title, ticks, mat };
    }
    this.axisObjs.x.title.position.set(L + 0.42, -0.02, 0);
    this.axisObjs.y.title.position.set(0, L + 0.28, 0);
    this.axisObjs.z.title.position.set(0, -0.06, L + 0.32);

    // Puntos (estudiantes)
    const geo = new THREE.SphereGeometry(0.026, 16, 12);
    this.points = rows.map((r, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLORS.variable, emissive: COLORS.variable, emissiveIntensity: 0.25, roughness: 0.35 }));
      m.castShadow = true;
      m.userData = { row: r, i, target: new THREE.Vector3(), hover: false };
      this.plot.add(m);
      this.reg(m, { onSelect: () => this.select(i), onHover: (on) => { m.userData.hover = on; } });
      return m;
    });

    // Elementos de selección
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 32), new THREE.MeshBasicMaterial({ color: '#0f172a' }));
    this.halo.visible = false;
    this.plot.add(this.halo);
    const dashMat = new THREE.LineDashedMaterial({ color: '#334155', dashSize: 0.025, gapSize: 0.018, transparent: true, opacity: 0.85 });
    this.projLines = new THREE.LineSegments(new THREE.BufferGeometry(), dashMat);
    this.projLines.visible = false;
    this.plot.add(this.projLines);
    this.selLabel = makeLabel('', { height: 0.055, border: '#ffffff' });
    this.selLabel.visible = false;
    this.plot.add(this.selLabel);

    // Aviso para variables nominales
    this.warn = makeLabel('', { height: 0.05, color: '#fde68a', border: COLORS.indicator, maxWidthPx: 900 });
    this.warn.position.set(0, 2.45, 0);
    this.warn.visible = false;
    this.root.add(this.warn);

    // Leyendas de las variables codificadas con color y tamaño (4.ª y 5.ª variable)
    this.colorLegend = makeLabel('', { height: 0.05, border: '#db2777', maxWidthPx: 1100 });
    this.colorLegend.position.set(-1.45, 1.75, 0.3);
    this.sizeLegend = makeLabel('', { height: 0.05, border: '#475569', maxWidthPx: 1100 });
    this.sizeLegend.position.set(-1.45, 1.63, 0.3);
    this.colorLegend.visible = this.sizeLegend.visible = false;
    this.root.add(this.colorLegend, this.sizeLegend);

    // Coordenadas paralelas: tantos ejes como variables
    this.par = new THREE.Group();
    this.par.position.set(0, 0.5, 0.35);
    this.par.visible = false;
    this.root.add(this.par);
    this.parMarkers = new THREE.Group();
    this.par.add(this.parMarkers);
    this.app.interaction.raycaster.params.Line.threshold = 0.02;

    this.layout();
  }

  raw(r, k) {
    const v = VARS[k];
    if (v && v.cats && typeof r[k] === 'string') return v.cats.indexOf(r[k]) + 1;
    return r[k];
  }

  // ---------- Variables genéricas v1, v2, v3… ----------
  addVariable(type = 'continua', relayout = true) {
    if (this.vlist.length >= 40) return;
    const n = this.vlist.length + 1;
    const key = `v${n}`;
    const rng = mulberry32(7919 * n + 13);
    const neg = rng() < 0.25 ? -1 : 1;
    const load = neg * (0.15 + 0.8 * rng());           // fuerza de relación con el factor común
    const e = Math.sqrt(1 - load * load);
    const zs = this.rows.map((_, i) => load * this.F[i] + e * gauss(rng));
    let meta;
    if (type === 'discreta') {
      this.rows.forEach((r, i) => { r[key] = Math.max(0, Math.min(10, Math.round(5 + 2 * zs[i]))); });
      meta = { label: key, unit: '0–10', kind: 'discreta', dec: 0 };
    } else if (type === 'ordinal') {
      const cats = ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5'];
      this.rows.forEach((r, i) => { r[key] = cats[Math.max(1, Math.min(5, Math.round(3 + zs[i] * 1.1))) - 1]; });
      meta = { label: key, unit: 'código ordinal', kind: 'ordinal', dec: 0, cats };
    } else if (type === 'nominal') {
      const cats = ['A', 'B', 'C', 'D'];
      this.rows.forEach((r) => { r[key] = cats[Math.floor(rng() * cats.length)]; });
      meta = { label: key, unit: 'código nominal', kind: 'nominal', dec: 0, cats };
    } else {
      this.rows.forEach((r, i) => { r[key] = Math.max(0, Math.min(10, Math.round((5 + 2 * zs[i]) * 10) / 10)); });
      meta = { label: key, unit: '0–10', kind: 'continua', dec: 1 };
    }
    VARS[key] = meta;
    this.computeStats(key);
    this.vlist.push(key);
    if (relayout) this.syncVars(true);
  }

  removeVariable() {
    if (this.vlist.length <= 1) return;
    const rest = this.vlist.slice(0, -1);
    if (!rest.some((k) => this.isNum(k))) return;
    const key = this.vlist.pop();
    delete VARS[key]; delete this.stats[key];
    this.rows.forEach((r) => { delete r[key]; });
    this.syncVars(true);
  }

  computeStats(k) {
    const vals = this.rows.map((r) => this.raw(r, k));
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) || 1;
    this.stats[k] = { min: Math.min(...vals), max: Math.max(...vals), mean, sd };
    if (VARS[k].cats) Object.assign(this.stats[k], { min: 1, max: VARS[k].cats.length });
    else Object.assign(this.stats[k], { min: 0, max: 10 });   // escala común 0–10
  }

  // ---------- Casos extremos: 0 en todo y 10 en todo ----------
  refRow(val) {
    const r = { nombre: val === 0 ? 'Mínimo' : 'Máximo', id: val === 0 ? 'MIN' : 'MAX', ref: true };
    for (const k of this.vlist) r[k] = this.isNum(k) ? val : '—';
    return r;
  }

  layoutRefs() {
    const st = this.state;
    if (!this.refs) {
      this.refs = [0, 10].map((val) => {
        const col = val === 0 ? '#0f172a' : '#dc2626';
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.038, 20, 14), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.3 }));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 32), new THREE.MeshBasicMaterial({ color: col }));
        const lbl = makeLabel('', { height: 0.045, border: col, maxWidthPx: 1400 });
        lbl.position.y = 0.09;
        g.add(core, ring, lbl);
        g.userData = { val, ring, lbl, target: new THREE.Vector3() };
        this.plot.add(g);
        this.reg(g, { onSelect: () => this.showRef(val) });
        return g;
      });
    }
    const par = st.view === 'parallel';
    for (const g of this.refs) {
      const { val } = g.userData;
      g.visible = !par;
      const t = g.userData.target.set(0, 0, 0);
      if (this.starMode && this.starInfo) {
        const { vars, dirs, A } = this.starInfo;
        vars.forEach((k, i) => t.addScaledVector(dirs[i], (val / 10) * A));
      } else {
        this.activeAxes().forEach((a) => { t[a] = this.toAxis(st.axes[a], val); });
      }
      const nums = (st.numVars || []).map(() => val).join(', ');
      g.userData.lbl.setText(this.labelMode === 'valores'
        ? `${val === 0 ? 'Mínimo' : 'Máximo'} (${nums})`
        : `${val === 0 ? 'Mínimo · 0 en todo' : 'Máximo · 10 en todo'}`);
    }
  }

  showRef(val) {
    const st = this.state;
    const nums = st.numVars || [];
    this.detail({
      kicker: 'Caso extremo de referencia',
      title: `${val === 0 ? 'Mínimo' : 'Máximo'} (${nums.map(() => val).join(', ')})`,
      rows: nums.map((k) => [k, `${val} de 10`]),
      text: val === 0
        ? 'Una estudiante hipotética con 0 en todas las variables: queda en el origen. Ninguna estudiante real puede estar «antes» de este punto.'
        : `Una estudiante hipotética con 10 en todas las variables: avanza el máximo en cada uno de los ${nums.length} ejes. Todas las estudiantes quedan entre el Mínimo y este punto.`,
    });
  }

  toggleLabels(refresh = true) {
    this.labelMode = this.labelMode === 'valores' ? 'ocultar' : 'valores';
    this.layout();
    if (refresh) this.refresh();
  }

  /** Nombre interpretable de un punto: «Ana (7, 3.5, 9 | A, N2)». */
  pointName(r, mode = 'valores') {
    if (mode === 'nombres') return r.nombre;
    const st = this.state;
    const nums = (st.numVars || []).map((k) => r[k]);
    const cats = (st.catVars || []).map((k) => String(r[k]).replace('Nivel ', 'N'));
    return `${r.nombre} (${nums.join(', ')}${cats.length ? ' | ' + cats.join(', ') : ''})`;
  }

  isNum(k) { const t = VARS[k].kind; return t === 'continua' || t === 'discreta'; }

  /** Numéricas → un eje cada una. Categóricas → color, forma y etiqueta (en ese orden). */
  syncVars(autoView = false) {
    const st = this.state;
    const nums = this.vlist.filter((k) => this.isNum(k));
    const cats = this.vlist.filter((k) => !this.isNum(k));
    st.numVars = nums;
    st.catVars = cats;
    st.dims = Math.max(1, Math.min(3, nums.length));
    st.axes = { x: nums[0], y: nums[1] || nums[0], z: nums[2] || nums[0] };
    st.colorVar = cats[0] || null;
    st.shapeVar = cats[1] || null;
    st.labelVar = null;
    st.sizeVar = null;
    st.parVars = [...nums];
    const prev = st.view;
    if (st.view === 'parallel' && nums.length < 2) st.view = 'cartesian';
    if (st.selected !== null) { st.selected = null; this.detail(null); }
    this.layout();
    if (prev !== st.view) this.app.setCameraPreset(st.view === 'parallel' ? PAR_CAMERA : this.cameraPreset);
  }


  /** Transforma un valor original a la coordenada del eje (0..L), de forma explícita. */
  toAxis(k, v) {
    const s = this.stats[k];
    if (this.state.norm === 'z') {
      const z = (v - s.mean) / s.sd;
      return THREE.MathUtils.clamp((z + 3) / 6, 0, 1) * L;
    }
    return ((v - s.min) / (s.max - s.min || 1)) * L;
  }
  normValue(k, v) {
    const s = this.stats[k];
    return this.state.norm === 'z' ? (v - s.mean) / s.sd : (v - s.min) / (s.max - s.min || 1);
  }

  activeAxes() { return AX.slice(0, this.state.dims); }

  layout() {
    const st = this.state;
    const act = this.activeAxes();
    const m = (st.numVars || []).length;
    this.starMode = m > 3 && st.view !== 'parallel';
    this.plotTarget = this.starMode ? new THREE.Vector3(0, -0.62, 0) : new THREE.Vector3(-L / 2, -L / 2, -L / 2);
    if (this.starGroup) this.starGroup.visible = this.starMode;
    if (this.starMode) {
      for (const a of AX) { const o = this.axisObjs[a]; o.g.visible = o.title.visible = o.ticks.visible = false; }
      this.gridXZ.visible = this.gridXY.visible = this.gridYZ.visible = false;
      this.warn.visible = false;
      this.layoutStar();
    } else {
    // Posiciones objetivo
    for (const p of this.points) {
      const r = p.userData.row;
      const t = p.userData.target.set(0, 0, 0);
      act.forEach((a) => {
        const k = st.axes[a];
        let c = this.toAxis(k, this.raw(r, k));
        if (VARS[k].kind === 'nominal') c += (((p.userData.i * 37) % 11) / 10 - 0.5) * 0.06; // separación visual
        t[a] = c;
      });
    }
    // Ejes, rejillas y marcas
    for (const a of AX) {
      const on = act.includes(a);
      const o = this.axisObjs[a];
      o.g.visible = on; o.title.visible = on; o.ticks.visible = on;
      if (on) {
        const k = st.axes[a];
        const v = VARS[k];
        o.title.setText(`${a.toUpperCase()} · ${v.label} (${v.unit})`);
        this.buildTicks(a, k);
      }
    }
    this.gridXZ.visible = st.dims >= 3 || st.dims === 1;
    this.gridXY.visible = st.dims >= 2;
    this.gridYZ.visible = st.dims >= 3;
    // Aviso para variables categóricas usadas como ejes
    const kinds = act.map((a) => VARS[st.axes[a]].kind);
    if (kinds.includes('nominal')) {
      const nom = act.map((a) => VARS[st.axes[a]]).find((v) => v.kind === 'nominal');
      this.warn.setText(`${nom.label}: nominal · las distancias no significan nada`, { color: '#fecaca', border: COLORS.bad });
      this.warn.visible = true;
    } else if (kinds.includes('ordinal')) {
      const ord = act.map((a) => VARS[st.axes[a]]).find((v) => v.kind === 'ordinal');
      this.warn.setText(`${ord.label}: ordinal · solo el orden tiene sentido`, { color: '#fde68a', border: COLORS.indicator });
      this.warn.visible = true;
    } else this.warn.visible = false;
    }
    this.layoutRefs();
    this.applyEncodings();
    const par = st.view === 'parallel';
    this.pivot.visible = !par;
    this.par.visible = par;
    if (par) { this.warn.visible = false; this.buildParallel(); }
    if (st.selected !== null) this.updateSelection();
  }

  // ---------- Ejes en estrella (4 o más variables numéricas) ----------
  starDirs(m) {
    const d = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    for (let j = 0; j < m - 3; j++) {
      const az = THREE.MathUtils.degToRad(200 + j * 137.5);
      const el = THREE.MathUtils.degToRad(j % 2 ? 55 : 22);
      d.push(new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize());
    }
    return d.slice(0, m);
  }

  layoutStar() {
    const st = this.state;
    const vars = st.numVars;
    const m = vars.length;
    const dirs = this.starDirs(m);
    // Longitud de cada eje: el Máximo (10 en todo) = suma de todos los ejes debe caber en la vista
    const sum = dirs.reduce((acc, d) => acc.add(d), new THREE.Vector3());
    const A = Math.min(L, 1.35 / Math.max(1e-6, sum.length()));
    this.starInfo = { vars, dirs, A };
    for (const p of this.points) {
      const t = p.userData.target.set(0, 0, 0);
      vars.forEach((k, i) => t.addScaledVector(dirs[i], this.unit01(k, p.userData.row) * A));
    }
    // Ejes
    if (!this.starGroup) { this.starGroup = new THREE.Group(); this.plot.add(this.starGroup); }
    const G = this.starGroup;
    for (const ch of [...G.children]) { ch.traverse((o) => { if (!o.isSprite) o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); G.remove(ch); }
    const Y = new THREE.Vector3(0, 1, 0);
    vars.forEach((k, i) => {
      const col = STAR_COLORS[i % STAR_COLORS.length];
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 });
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, A, 10), mat);
      shaft.position.y = A / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 14), mat);
      tip.position.y = A + 0.035;
      g.add(shaft, tip);
      g.quaternion.setFromUnitVectors(Y, dirs[i]);
      G.add(g);
      const v = VARS[k];
      const lbl = makeLabel(`${i < 3 ? 'XYZ'[i] + ' · ' : ''}${v.label} (${v.unit})`, { height: 0.05, border: col });
      lbl.position.copy(dirs[i]).multiplyScalar(A + 0.16);
      G.add(lbl);
      for (const val of [5, 10]) {
        const tick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat);
        tick.position.copy(dirs[i]).multiplyScalar((val / 10) * A);
        const tl = makeLabel(String(val), { height: 0.032, fontSize: 36, bold: false });
        tl.position.copy(tick.position).add(new THREE.Vector3(0, -0.045, 0));
        G.add(tick, tl);
      }
    });
    const o = makeLabel('origen = 0 en todos los ejes', { height: 0.045, bold: false });
    o.position.set(0, -0.06, 0);
    G.add(o);
    this.starGroup.visible = true;
  }

  // Valor normalizado 0..1 de una variable (para color, tamaño y ejes paralelos)
  unit01(k, r) {
    const s = this.stats[k];
    const v = this.raw(r, k);
    if (this.state.norm === 'z' && !VARS[k].cats) return THREE.MathUtils.clamp(((v - s.mean) / s.sd + 3) / 6, 0, 1);
    return (v - s.min) / (s.max - s.min || 1);
  }

  colorFor(k, r) {
    if (!k) return new THREE.Color(COLORS.variable);
    if (VARS[k].kind === 'nominal') return new THREE.Color(CAT_COLORS[(this.raw(r, k) - 1) % CAT_COLORS.length]);
    const n = this.unit01(k, r);
    const a = new THREE.Color(RAMP[0]), b = new THREE.Color(RAMP[1]), c = new THREE.Color(RAMP[2]);
    return n < 0.5 ? a.lerp(b, n * 2) : b.lerp(c, (n - 0.5) * 2);
  }

  applyEncodings() {
    const st = this.state;
    if (!this.shapeGeos) {
      this.shapeGeos = [new THREE.SphereGeometry(0.026, 16, 12), new THREE.BoxGeometry(0.044, 0.044, 0.044), new THREE.ConeGeometry(0.03, 0.06, 14), new THREE.OctahedronGeometry(0.034), new THREE.TorusGeometry(0.022, 0.009, 8, 18)];
      this.pointLabels = [];
    }
    this.points.forEach((p, i) => {
      const r = p.userData.row;
      p.userData.baseColor = this.colorFor(st.colorVar, r);
      p.userData.sizeK = 1;
      p.geometry = st.shapeVar ? this.shapeGeos[(this.raw(r, st.shapeVar) - 1) % this.shapeGeos.length] : this.shapeGeos[0];
      let lb = this.pointLabels[i];
      const mode = this.labelMode || 'ocultar';
      if (mode !== 'ocultar' && st.view !== 'parallel') {
        const txt = this.pointName(r, mode);
        if (!lb) { lb = makeLabel(txt, { height: 0.03, fontSize: 36, maxWidthPx: 1400 }); this.plot.add(lb); this.pointLabels[i] = lb; }
        else if (lb.userData.text !== txt) lb.setText(txt);
        lb.visible = true;
      } else if (lb) lb.visible = false;
    });
    const showLeg = st.view !== 'parallel';
    const catLine = (k, names) => VARS[k].cats.map((c, i) => `${names[i % names.length]} ${c}`).join(' · ');
    if (st.colorVar) {
      const v = VARS[st.colorVar];
      this.colorLegend.setText(v.kind === 'nominal' ? `Color = ${v.label}: ${catLine(st.colorVar, CAT_NAMES)}` : `Color = ${v.label} (ordinal): naranja = ${v.cats[0]} → morado = ${v.cats[v.cats.length - 1]}`);
      this.colorLegend.visible = true;
    } else this.colorLegend.visible = false;
    if (st.shapeVar && showLeg) { this.sizeLegend.setText(`Forma = ${VARS[st.shapeVar].label}: ${catLine(st.shapeVar, SHAPE_NAMES)}`); this.sizeLegend.visible = true; }
    else this.sizeLegend.visible = false;
    if (!this.labelLegend) { this.labelLegend = makeLabel('', { height: 0.05, border: '#0f172a', maxWidthPx: 1100 }); this.labelLegend.position.set(-1.45, 1.51, 0.3); this.root.add(this.labelLegend); }
    const nums = st.numVars || [], cs = st.catVars || [];
    if (this.labelMode === 'valores' && showLeg) {
      this.labelLegend.setText(`Etiqueta = nombre (${nums.join(', ')}${cs.length ? ' | ' + cs.join(', ') : ''})`);
      this.labelLegend.visible = true;
    } else this.labelLegend.visible = false;
  }

  buildParallel() {
    const st = this.state;
    const P = this.par;
    this.app.interaction.removeWhere((o) => o.userData && o.userData.parLine);
    for (const c of [...P.children]) {
      if (c === this.parMarkers) continue;
      c.traverse((m) => { if (!m.isSprite) m.geometry?.dispose(); if (m.material) { m.material.map?.dispose(); m.material.dispose(); } });
      P.remove(c);
    }
    const vars = st.parVars;
    const k = vars.length;
    const H = 1.35;
    const W = THREE.MathUtils.clamp(0.34 * (k - 1), 1.0, 4.2);
    const xs = vars.map((_, i) => (k === 1 ? 0 : -W / 2 + (i * W) / (k - 1)));
    this.parGeom = { xs, H };
    const kindColor = { nominal: COLORS.nominal, ordinal: COLORS.ordinal, discreta: COLORS.discrete, continua: COLORS.continuous };
    vars.forEach((key, i) => {
      const v = VARS[key], s = this.stats[key];
      const g = new THREE.Group();
      g.position.x = xs[i];
      const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, H, 8), new THREE.MeshBasicMaterial({ color: kindColor[v.kind] || '#334155' }));
      ax.position.y = H / 2;
      const name = makeLabel(v.label, { height: 0.05, border: kindColor[v.kind] });
      name.position.y = H + 0.08 + (i % 2) * 0.08;   // alterna alturas para que no se encimen
      const fmt = (x) => (v.cats ? v.cats[Math.round(x) - 1] : x.toFixed(v.dec));
      const lo = st.norm === 'z' && !v.cats ? s.mean - 3 * s.sd : s.min;
      const hi = st.norm === 'z' && !v.cats ? s.mean + 3 * s.sd : s.max;
      const top = makeLabel(fmt(hi), { height: 0.032, bold: false, fontSize: 36 });
      top.position.set(0.07, H - 0.02, 0);
      const bot = makeLabel(fmt(lo), { height: 0.032, bold: false, fontSize: 36 });
      bot.position.set(0.07, 0.02, 0);
      g.add(ax, name, top, bot);
      P.add(g);
    });
    // Casos extremos: línea en 0 y línea en 10
    for (const val of [0, 10]) {
      const col = val === 0 ? '#0f172a' : '#dc2626';
      const pts = vars.map((key, i) => new THREE.Vector3(xs[i], (VARS[key].cats ? 0 : val / 10) * H, 0.004));
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: col, dashSize: 0.05, gapSize: 0.025 }));
      ln.computeLineDistances();
      const lb = makeLabel(val === 0 ? 'Mínimo · 0 en todo' : 'Máximo · 10 en todo', { height: 0.045, border: col });
      lb.position.set(xs[0] - 0.32, (val / 10) * H, 0);
      const g = new THREE.Group(); g.add(ln, lb); P.add(g);
    }

    // Una línea por estudiante
    this.parLines = this.rows.map((r, idx) => {
      const pts = vars.map((key, i) => {
        let n = this.unit01(key, r);
        if (VARS[key].kind === 'nominal') n += (((idx * 37) % 11) / 10 - 0.5) * 0.04;
        return new THREE.Vector3(xs[i], n * H, 0);
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: this.colorFor(st.colorVar, r), transparent: true, opacity: 0.55 }));
      line.userData = { parLine: true, i: idx, pts, hover: false };
      P.add(line);
      this.reg(line, { onSelect: () => this.select(idx), onHover: (on) => { line.userData.hover = on; } });
      return line;
    });
  }

  buildTicks(a, k) {
    const o = this.axisObjs[a];
    for (const c of [...o.ticks.children]) { c.material?.map?.dispose(); c.material?.dispose(); o.ticks.remove(c); }
    const v = VARS[k], s = this.stats[k];
    const ticks = [];
    if (v.cats) v.cats.forEach((c, i) => ticks.push({ val: i + 1, text: `${i + 1}·${c.slice(0, 5)}` }));
    else if (this.state.norm === 'z') [-2, -1, 0, 1, 2].forEach((z) => ticks.push({ val: s.mean + z * s.sd, text: `z=${z > 0 ? '+' : ''}${z} (${(s.mean + z * s.sd).toFixed(v.dec)})` }));
    else [0, 2.5, 5, 7.5, 10].forEach((x) => ticks.push({ val: x, text: String(x) }));
    const geo = new THREE.BoxGeometry(0.004, 0.035, 0.004);
    for (const t of ticks) {
      const c = this.toAxis(k, t.val);
      const lbl = makeLabel(t.text, { height: 0.04, bold: false, bg: 'rgba(9,16,30,0.75)', color: '#dbe5f3', fontSize: 36 });
      const mark = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: AX_COLOR[a] }));
      if (a === 'x') { mark.position.set(c, 0, 0); lbl.position.set(c, -0.07, 0.04); }
      if (a === 'y') { mark.position.set(0, c, 0); mark.rotation.z = Math.PI / 2; lbl.position.set(-0.22, c, 0.02); }
      if (a === 'z') { mark.position.set(0, 0, c); mark.rotation.x = Math.PI / 2; lbl.position.set(-0.22, -0.04, c); }
      o.ticks.add(mark, lbl);
    }
  }

  select(i) {
    this.state.selected = i;
    this.updateSelection();
    const r = this.rows[i];
    const st = this.state;
    const rowsOut = [];
    const shownOf = (k) => { const raw = this.raw(r, k); return VARS[k].cats ? `${VARS[k].cats[raw - 1]} (código ${raw})` : `${raw}  (${VARS[k].kind}, ${VARS[k].unit})`; };
    if (st.view === 'parallel') {
      st.parVars.forEach((k) => rowsOut.push([`${VARS[k].label}`, shownOf(k)]));
    } else {
      (st.numVars || []).forEach((k, i) => {
        rowsOut.push([`Eje ${i < 3 ? 'XYZ'[i] : i + 1} · ${VARS[k].label}`, `${this.raw(r, k)} de 10`]);
      });
    }
    if (st.colorVar) rowsOut.push([`Color · ${VARS[st.colorVar].label}`, r[st.colorVar]]);
    if (st.shapeVar) rowsOut.push([`Forma · ${VARS[st.shapeVar].label}`, r[st.shapeVar]]);
    (st.catVars || []).slice(2).forEach((k) => rowsOut.push([`${VARS[k].label} (categórica)`, r[k]]));
    // (en esta versión solo hay variables genéricas v1, v2…)
    this.detail({ kicker: 'Estudiante ficticio', title: this.pointName(r), rows: rowsOut, text: 'Todas las variables numéricas usan la misma escala de 0 a 10: cada valor indica qué tan lejos del origen avanza el punto en ese eje.' });
  }

  updateSelection() {
    const i = this.state.selected;
    // Coordenadas paralelas: marcar los vértices de la línea seleccionada
    for (const c of [...this.parMarkers.children]) { if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } else c.geometry.dispose(); this.parMarkers.remove(c); }
    if (this.state.view === 'parallel') {
      this.halo.visible = false; this.projLines.visible = false; this.selLabel.visible = false;
      const line = this.parLines?.[i];
      if (line) {
        const m = new THREE.MeshBasicMaterial({ color: '#0f172a' });
        line.userData.pts.forEach((p) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), m); d.position.copy(p); this.parMarkers.add(d); });
        const lbl = makeLabel(`${this.rows[i].nombre} (${this.rows[i].id})`, { height: 0.05, border: '#0f172a' });
        const last = line.userData.pts[line.userData.pts.length - 1];
        lbl.position.set(last.x + 0.25, last.y, 0);
        this.parMarkers.add(lbl);
      }
      return;
    }
    const p = this.points[i];
    const t = p.userData.target;
    this.halo.visible = true;
    this.halo.position.copy(t);
    this.selLabel.visible = true;
    this.selLabel.setText(`${p.userData.row.nombre} (${p.userData.row.id})`);
    this.selLabel.position.copy(t).add(new THREE.Vector3(0, 0.09, 0));
    const pts = [];
    const d = this.state.dims;
    if (this.starMode && this.starInfo) {
      // Camino de la suma: el punto se construye avanzando por cada eje
      const { vars, dirs, A } = this.starInfo;
      const cur = new THREE.Vector3();
      vars.forEach((k, j) => { const nx = cur.clone().addScaledVector(dirs[j], this.unit01(k, p.userData.row) * A); pts.push(cur.clone(), nx); cur.copy(nx); });
      this.projLines.geometry.dispose();
      this.projLines.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      this.projLines.computeLineDistances();
      this.projLines.visible = true;
      return;
    }
    if (d >= 1) pts.push(t.clone(), new THREE.Vector3(t.x, 0, d >= 3 ? t.z : 0));
    if (d >= 2) pts.push(t.clone(), new THREE.Vector3(0, t.y, d >= 3 ? t.z : 0));
    if (d >= 3) pts.push(t.clone(), new THREE.Vector3(t.x, t.y, 0));
    this.projLines.geometry.dispose();
    this.projLines.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.projLines.computeLineDistances();
    this.projLines.visible = true;
  }

  onEmptySelect() {
    if (this.state.selected === null) return;
    this.state.selected = null;
    this.halo.visible = false; this.projLines.visible = false; this.selLabel.visible = false;
    for (const c of [...this.parMarkers.children]) { if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } else c.geometry?.dispose(); this.parMarkers.remove(c); }
    this.detail(null);
  }

  pearson(k1, k2) {
    const xs = this.rows.map((r) => this.raw(r, k1)), ys = this.rows.map((r) => this.raw(r, k2));
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy);
  }

  // ---------- Secuencia didáctica: agregar variables v1, v2, v3… ----------
  getGuide() {
    const st = this.state;
    const n = this.vlist.length;
    const nums = st.numVars || [], cats = st.catVars || [];
    const m = nums.length;
    const adds = { type: 'buttons', items: [
      { label: '+ Continua', onClick: () => this.addVariable('continua') },
      { label: '+ Discreta', onClick: () => this.addVariable('discreta') },
      { label: '+ Nominal', onClick: () => this.addVariable('nominal') },
      { label: '+ Ordinal', onClick: () => this.addVariable('ordinal') }] };
    const del = { label: `− Quitar v${n}`, onClick: () => this.removeVariable() };
    const on = this.labelMode === 'valores';
    const labels = { label: on ? 'Ocultar coordenadas' : 'Mostrar coordenadas', vrLabel: on ? 'Ocultar coordenadas' : 'Mostrar coordenadas', active: on, onClick: () => this.toggleLabels(false) };
    const rot = { type: 'buttons', items: [{ label: '↺', vrLabel: '↺ Girar', onClick: () => { this.rotTarget += Math.PI / 8; } }, { label: '↻', vrLabel: '↻ Girar', onClick: () => { this.rotTarget -= Math.PI / 8; } }] };
    const roles = ['color', 'forma', 'etiqueta'];
    const catTxt = cats.length ? ` · ${cats.length} categórica${cats.length > 1 ? 's' : ''} → ${cats.slice(0, 3).map((k, i) => `${k} ${roles[i]}`).join(', ')}` : '';
    const summary = `${n} variable${n > 1 ? 's' : ''}: ${m} numérica${m > 1 ? 's' : ''} = ${m} eje${m > 1 ? 's' : ''} (${nums.join(', ')})${catTxt}.`;
    const r12 = m >= 2 ? this.pearson(nums[0], nums[1]).toFixed(2) : '—';
    return {
      objective: 'Ver que cada variable agrega una dimensión de representación.',
      idea: 'Todas las variables numéricas usan la misma escala (0 a 10), así que sus valores se pueden comparar directamente. Cada variable numérica agrega un eje: una dimensión más. Hasta tres ejes pueden ser perpendiculares; desde el cuarto se dibujan en otras direcciones y cada punto es la suma de sus valores en cada eje. Las variables categóricas no son ejes: se representan con color, forma o etiqueta. Más ejes no significan necesariamente más ideas.',
      steps: [
        { title: 'Una variable, un eje', icon: 'axes', prompt: 'Cada esfera es una estudiante. Con una sola variable numérica, v1, hay una sola dimensión: un eje.',
          enter: () => { if (st.view !== 'cartesian') { st.view = 'cartesian'; this.layout(); this.app.setCameraPreset(this.cameraPreset); } },
          actions: [labels] },
        { title: 'Agrega variables', icon: 'layers', prompt: `${summary} Numéricas → ejes; categóricas → color, forma o etiqueta.`,
          enter: () => { if (st.view !== 'cartesian') { st.view = 'cartesian'; this.layout(); this.app.setCameraPreset(this.cameraPreset); } },
          actions: [adds, del, ...(m >= 2 ? [rot] : []), labels] },
        { title: 'Más de tres ejes', icon: 'cube', prompt: m > 3
            ? `${m} ejes: después del tercero ya no caben perpendiculares. Toca una esfera para ver cómo su posición suma un tramo en cada eje.`
            : `Tienes ${m} eje${m > 1 ? 's' : ''}. Agrega variables numéricas hasta tener 4 o más y observa los nuevos ejes.`,
          enter: () => {},
          actions: [{ label: '+ Eje numérico', primary: true, onClick: () => this.addVariable('continua') }, del,
            { type: 'buttons', items: [
              { label: 'Ejes en el espacio', active: st.view === 'cartesian', onClick: () => { st.view = 'cartesian'; this.layout(); this.app.setCameraPreset(this.cameraPreset); } },
              { label: 'Ejes paralelos', active: st.view === 'parallel', onClick: () => { if (m >= 2) { st.view = 'parallel'; this.layout(); this.app.setCameraPreset(PAR_CAMERA); } } }] },
            { label: 'Seleccionar una estudiante', onClick: () => this.select(Math.floor(Math.random() * this.rows.length)) }, labels] },
        { title: 'Interpreta un punto', icon: 'scale', prompt: `Todas las numéricas van de 0 a 10. El punto negro es el Mínimo (0 en todo) y el rojo, el Máximo (10 en todo). Lee una etiqueta: ${this.rows[0] ? this.pointName(this.rows[0]) : ''} significa ${nums.map((k) => k + ' = ' + (this.rows[0] ? this.rows[0][k] : '')).join(', ')}.`,
          enter: () => {},
          actions: [{ label: 'Seleccionar una estudiante', primary: true, onClick: () => this.select(Math.floor(Math.random() * this.rows.length)) },
            { label: 'Comparar dos estudiantes', onClick: () => this.compareTwo() },
            { label: 'Ver Mínimo', onClick: () => this.showRef(0) }, { label: 'Ver Máximo', onClick: () => this.showRef(10) }, labels] },
        { title: '¿Dos ejes, dos ideas?', icon: 'bulb', prompt: m >= 2 ? `${nums[0]} y ${nums[1]}: r = ${r12}. ¿Dos ejes significan dos ideas distintas?` : 'Agrega al menos dos variables numéricas para comparar.',
          enter: () => {},
          actions: [
            m < 2 ? { label: '+ Continua', onClick: () => this.addVariable('continua') } : null,
            { label: 'Ver respuesta', primary: true, onClick: () => this.detail({ kicker: 'Reflexión', title: 'Más ejes ≠ más ideas', text: ['Cada variable numérica ocupa su propio eje, pero si dos están muy correlacionadas comparten mucha información: pueden reflejar una misma dimensión conceptual.', 'Decidir cuántas dimensiones conceptuales hay requiere teoría y evidencia (escena 4).'] }) },
            m >= 2 ? { label: 'Ver correlaciones', onClick: () => this.showCorrelations() } : null, labels] },
      ],
    };
  }

  compareTwo() {
    const a = Math.floor(Math.random() * this.rows.length);
    let b = Math.floor(Math.random() * this.rows.length); if (b === a) b = (a + 1) % this.rows.length;
    const ra = this.rows[a], rb = this.rows[b];
    const st = this.state;
    const rows = (st.numVars || []).map((k) => [k, `${ra[k]}  vs  ${rb[k]}  (${ra[k] > rb[k] ? ra.nombre : ra[k] < rb[k] ? rb.nombre : 'empate'})`]);
    (st.catVars || []).forEach((k) => rows.push([k, `${ra[k]}  vs  ${rb[k]}`]));
    this.select(a);
    this.detail({ kicker: 'Comparación', title: `${ra.nombre} vs ${rb.nombre}`, rows, text: 'En cada eje gana quien tiene el valor más alto. Dos puntos cercanos tienen valores parecidos en la mayoría de las variables.' });
  }

  showCorrelations() {
    const L = this.vlist.filter((k) => this.isNum(k));
    const rows = [];
    for (let i = 0; i < L.length && rows.length < 10; i++) for (let j = i + 1; j < L.length && rows.length < 10; j++) rows.push([`${L[i]} – ${L[j]}`, `r = ${this.pearson(L[i], L[j]).toFixed(2)}`]);
    this.detail({ kicker: 'Correlaciones (datos ficticios)', title: 'Qué tanto se parecen los ejes', rows, text: 'Valores de r cercanos a 1 o a −1 indican que dos ejes comparten mucha información. Solo se incluyen variables numéricas.' });
  }

  showScaleFormula() {
    const st = this.state;
    const rows = this.activeAxes().map((a) => {
      const k = st.axes[a], s = this.stats[k], v = VARS[k];
      return [`${a.toUpperCase()} · ${v.label}`, st.norm === 'z' ? `z = (x − ${s.mean.toFixed(1)}) / ${s.sd.toFixed(2)}` : `n = (x − ${s.min.toFixed(0)}) / (${s.max.toFixed(0)} − ${s.min.toFixed(0)})`];
    });
    this.detail({ kicker: 'Escala explícita', title: st.norm === 'z' ? 'Estandarización z (−3 a +3)' : 'Mín–máx (0 a 1)', rows, text: 'Sin normalizar, la variable con números más grandes dominaría el espacio.' });
  }

  getControls() {
    const st = this.state;
    const opts = Object.entries(VARS).map(([k, v]) => ({ value: k, label: `${v.label} (${v.kind})` }));
    const setAxis = (a) => (val) => { st.axes[a] = val; this.layout(); this.refreshDetail(); };
    const c = [
      { type: 'text', text: 'Mismo ejemplo del Momento 1: cada columna de la matriz de datos puede ser un eje.' },
      { type: 'heading', label: 'Dimensiones de representación' },
      { type: 'buttons', items: [1, 2, 3].map((n) => ({ label: `${n}D`, active: st.dims === n, onClick: () => { st.dims = n; this.layout(); this.refreshDetail(); } })) },
      { type: 'select', label: 'Eje X', value: st.axes.x, options: opts, onChange: setAxis('x') },
    ];
    if (st.dims >= 2) c.push({ type: 'select', label: 'Eje Y', value: st.axes.y, options: opts, onChange: setAxis('y') });
    else c.push({ type: 'button', label: '+ Agregar segunda variable (eje Y)', onClick: () => { st.dims = 2; this.layout(); } });
    if (st.dims >= 3) c.push({ type: 'select', label: 'Eje Z', value: st.axes.z, options: opts, onChange: setAxis('z') });
    else if (st.dims === 2) c.push({ type: 'button', label: '+ Agregar tercera variable (eje Z)', onClick: () => { st.dims = 3; this.layout(); } });
    c.push(
      { type: 'heading', label: 'Escala' },
      { type: 'buttons', items: [
        { label: 'Mín–máx (0 a 1)', vrLabel: 'Mín–máx', active: st.norm === 'minmax', onClick: () => { st.norm = 'minmax'; this.layout(); this.refreshDetail(); } },
        { label: 'Puntuación z', vrLabel: 'z', active: st.norm === 'z', onClick: () => { st.norm = 'z'; this.layout(); this.refreshDetail(); } },
      ] },
      { type: 'heading', label: 'Navegación' },
      { type: 'buttons', items: [
        { label: '↺ Girar', onClick: () => { this.rotTarget += Math.PI / 8; } },
        { label: '↻ Girar', onClick: () => { this.rotTarget -= Math.PI / 8; } },
      ] },
      { type: 'buttons', items: [
        { label: 'Acercar +', onClick: () => { this.zoomTarget = Math.min(1.8, this.zoomTarget + 0.2); } },
        { label: 'Alejar −', onClick: () => { this.zoomTarget = Math.max(0.6, this.zoomTarget - 0.2); } },
      ] },
      { type: 'button', label: st.auto ? 'Detener rotación automática' : 'Rotación automática', active: st.auto, onClick: () => { st.auto = !st.auto; } },
      { type: 'button', label: 'Seleccionar estudiante al azar', onClick: () => this.select(Math.floor(Math.random() * this.rows.length)) },
    );
    return c;
  }

  refreshDetail() { if (this.state.selected !== null) this.select(this.state.selected); }

  getInfo() {
    const st = this.state;
    const act = this.activeAxes();
    const scale = act.map((a) => {
      const k = st.axes[a], s = this.stats[k], v = VARS[k];
      return st.norm === 'z'
        ? `${a.toUpperCase()}: z = (${v.label} − ${s.mean.toFixed(1)}) / ${s.sd.toFixed(2)}`
        : `${a.toUpperCase()}: n = (${v.label} − ${s.min.toFixed(1)}) / (${s.max.toFixed(1)} − ${s.min.toFixed(1)})`;
    });
    const corr = [];
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
      const r = this.pearson(st.axes[act[i]], st.axes[act[j]]);
      corr.push(`r(${act[i].toUpperCase()},${act[j].toUpperCase()}) = ${r.toFixed(2)}`);
    }
    const p = [
      `Cada punto es un estudiante ficticio (n = ${this.rows.length}). Ahora hay ${st.dims} ${st.dims === 1 ? 'variable asignada' : 'variables asignadas'} a ${st.dims === 1 ? 'un eje' : 'ejes'}: cada eje es una dimensión de representación.`,
      `Escala explícita (${st.norm === 'z' ? 'estandarización z; eje de −3 a +3' : 'mín–máx; eje de 0 a 1'}): ${scale.join(' · ')}.`,
      'Las unidades son distintas (minutos, mensajes, sesiones, puntos, cm, kg). Sin normalizar, la variable con números más grandes dominaría visualmente el espacio.',
    ];
    if (corr.length) p.push(`Correlación de Pearson en estos datos: ${corr.join(' · ')}. Si dos ejes están muy correlacionados, ocupan dimensiones de representación distintas pero pueden reflejar en gran parte la misma información.`);
    return {
      kicker: 'Escena 2 · Dimensiones',
      title: 'Variables como ejes',
      legend: [{ label: 'X', color: COLORS.axisX }, { label: 'Y', color: COLORS.axisY }, { label: 'Z', color: COLORS.axisZ }, { label: 'Estudiante', color: COLORS.variable }],
      paragraphs: p,
      vrParagraphs: [p[0], p[1], ...(corr.length ? [p[3]] : [])],
      notes: ['Una variable puede utilizarse como dimensión de representación, pero no necesariamente constituye una dimensión conceptual independiente. Ejemplo: minutos en plataforma y mensajes en foro son dos ejes, pero ambos pueden reflejar una misma dimensión conceptual (participación en línea).'],
    };
  }

  onThumbstick(x, y, dt) {
    this.rotTarget -= x * dt * 1.6;
    this.zoomTarget = THREE.MathUtils.clamp(this.zoomTarget - y * dt * 0.8, 0.6, 1.8);
  }

  update(dt, t) {
    const f = 1 - Math.exp(-dt * 5);
    if (this.state.auto) this.rotTarget += dt * 0.3;
    this.pivot.rotation.y = THREE.MathUtils.lerp(this.pivot.rotation.y, this.rotTarget, f);
    const z = THREE.MathUtils.lerp(this.pivot.scale.x, this.zoomTarget, f);
    this.pivot.scale.setScalar(z);
    if (this.plotTarget) this.plot.position.lerp(this.plotTarget, f);
    if (this.refs) for (const g of this.refs) {
      g.position.lerp(g.userData.target, f);
      g.userData.ring.lookAt(this.app.camera.getWorldPosition(this._camW || (this._camW = new THREE.Vector3())));
      g.userData.ring.scale.setScalar(1 + Math.sin(t * 2.5 + g.userData.val) * 0.08);
    }
    for (const p of this.points) {
      p.position.lerp(p.userData.target, f);
      const lb = this.pointLabels?.[p.userData.i];
      if (lb && lb.visible) lb.position.copy(p.position).add(LABEL_OFF);
      const sel = p.userData.i === this.state.selected;
      const s = (p.userData.sizeK || 1) * (sel ? 1.6 : p.userData.hover ? 1.4 : 1);
      p.scale.setScalar(THREE.MathUtils.lerp(p.scale.x, s, f));
      p.material.emissiveIntensity = sel ? 0.9 : p.userData.hover ? 0.7 : 0.25;
      if (sel) p.material.color.set('#0f172a'); else p.material.color.copy(p.userData.baseColor || new THREE.Color(COLORS.variable));
      p.material.emissive.copy(p.material.color);
    }
    if (this.par.visible && this.parLines) {
      for (const L of this.parLines) {
        const sel = L.userData.i === this.state.selected;
        const m = L.material;
        m.opacity = sel ? 1 : L.userData.hover ? 0.95 : (this.state.selected !== null ? 0.18 : 0.55);
        if (sel) m.color.set('#0f172a'); else m.color.copy(this.colorFor(this.state.colorVar, this.rows[L.userData.i]));
        L.renderOrder = sel ? 5 : 1;
      }
    }
    if (this.halo.visible) { this.halo.position.copy(this.points[this.state.selected].position); this.halo.lookAt(this.app.camera.getWorldPosition(new THREE.Vector3())); this.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.1); }
  }
}

const PAR_CAMERA = { position: [0, 1.45, 1.6], target: [0, 1.25, -1.65] };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
const STAR_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#64748b', '#84cc16', '#0ea5e9'];
const SHAPE_NAMES = ['esfera', 'cubo', 'cono', 'octaedro', 'anillo'];
const LABEL_OFF = new THREE.Vector3(0, 0.065, 0);
