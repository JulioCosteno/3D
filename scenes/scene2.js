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
  ensayos: { label: 'Ensayos', unit: '0–10', kind: 'continua', dec: 1 },
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
const AX_COLOR = { x: COLORS.axisX, y: COLORS.axisY, z: COLORS.axisZ };

export default class Scene2 extends BaseScene {
  constructor(app) {
    super(app, 'escena2', { title: 'Representar dimensiones', short: 'Dimensiones' });
    this.state = { dims: 1, axes: { x: 'minutos_plataforma', y: 'participaciones_foro', z: 'casos' }, norm: 'minmax', selected: null, auto: false };
    this.cameraPreset = { position: [1.3, 1.85, 1.35], target: [0, 1.15, -2] };
    this.rotTarget = 0.5;
    this.zoomTarget = 1;
  }

  async init() {
    const rows = this.app.data.estudiantes;
    this.rows = rows;
    VARS.carrera.cats = this.app.data.variables.carrera.categorias;
    VARS.modalidad_preferida.cats = this.app.data.variables.modalidad_preferida.categorias;
    // Estadísticos descriptivos para la normalización explícita
    this.stats = {};
    for (const k of Object.keys(VARS)) {
      const vals = rows.map((r) => this.raw(r, k));
      const n = vals.length;
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
      this.stats[k] = { min: Math.min(...vals), max: Math.max(...vals), mean, sd };
    }
    if (VARS.nivel_educativo_codigo) Object.assign(this.stats.nivel_educativo_codigo, { min: 1, max: 5 });
    for (const [k, v] of Object.entries(VARS)) if (v.cats) Object.assign(this.stats[k], { min: 1, max: v.cats.length });

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

    this.layout();
  }

  raw(r, k) {
    if (k === 'carrera') return VARS.carrera.cats.indexOf(r.carrera) + 1;
    if (k === 'modalidad_preferida') return VARS.modalidad_preferida.cats.indexOf(r.modalidad_preferida) + 1;
    return r[k];
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
    if (st.selected !== null) this.updateSelection();
  }

  buildTicks(a, k) {
    const o = this.axisObjs[a];
    for (const c of [...o.ticks.children]) { c.material?.map?.dispose(); c.material?.dispose(); o.ticks.remove(c); }
    const v = VARS[k], s = this.stats[k];
    const ticks = [];
    if (v.cats) v.cats.forEach((c, i) => ticks.push({ val: i + 1, text: `${i + 1}·${c.slice(0, 5)}` }));
    else if (this.state.norm === 'z') [-2, -1, 0, 1, 2].forEach((z) => ticks.push({ val: s.mean + z * s.sd, text: `z=${z > 0 ? '+' : ''}${z} (${(s.mean + z * s.sd).toFixed(v.dec)})` }));
    else [0, 0.25, 0.5, 0.75, 1].forEach((n) => ticks.push({ val: s.min + n * (s.max - s.min), text: `${n} (${(s.min + n * (s.max - s.min)).toFixed(v.dec)})` }));
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
    this.activeAxes().forEach((a) => {
      const k = st.axes[a];
      const raw = this.raw(r, k);
      const shown = VARS[k].cats ? `${VARS[k].cats[raw - 1]} (código ${raw})` : `${raw} ${VARS[k].unit}`;
      rowsOut.push([`${a.toUpperCase()} · ${VARS[k].label}`, `${shown} → ${st.norm === 'z' ? 'z' : 'n'} = ${this.normValue(k, raw).toFixed(2)}`]);
    });
    rowsOut.push(['Minutos en plataforma', `${r.minutos_plataforma} min`], ['Mensajes en foro', r.participaciones_foro], ['Sesiones sincrónicas', `${r.asistencia_sincronica} de 8`], ['Modalidad preferida', r.modalidad_preferida], ['Dominio de TIC', r.dominio_tic], ['Casos · carteles · ensayos · exposición', `${r.casos} · ${r.carteles} · ${r.ensayos} · ${r.exposicion}`], ['Calificación final', r.calificacion_final], ['Carrera', r.carrera]);
    this.detail({ kicker: 'Estudiante ficticio', title: `${r.nombre} · ${r.id}`, rows: rowsOut, text: 'Las coordenadas son valores transformados; los valores originales se conservan en la tabla.' });
  }

  updateSelection() {
    const i = this.state.selected;
    const p = this.points[i];
    const t = p.userData.target;
    this.halo.visible = true;
    this.halo.position.copy(t);
    this.selLabel.visible = true;
    this.selLabel.setText(`${p.userData.row.nombre} (${p.userData.row.id})`);
    this.selLabel.position.copy(t).add(new THREE.Vector3(0, 0.09, 0));
    const pts = [];
    const d = this.state.dims;
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
    this.detail(null);
  }

  pearson(k1, k2) {
    const xs = this.rows.map((r) => this.raw(r, k1)), ys = this.rows.map((r) => this.raw(r, k2));
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy);
  }

  // ---------- Secuencia didáctica ----------
  getGuide() {
    const st = this.state;
    const opts = Object.entries(VARS).map(([k, v]) => ({ value: k, label: v.label }));
    const axisSel = (a) => ({ type: 'select', label: `Eje ${a.toUpperCase()}`, value: st.axes[a], options: opts, onChange: (v) => { st.axes[a] = v; this.layout(); this.refreshDetail(); } });
    const set = (patch) => { Object.assign(st, patch); this.layout(); this.refreshDetail(); };
    const r = (a, b) => this.pearson(st.axes[a], st.axes[b]).toFixed(2);
    const rot = { type: 'buttons', items: [{ label: '↺', vrLabel: '↺ Girar', onClick: () => { this.rotTarget += Math.PI / 8; } }, { label: '↻', vrLabel: '↻ Girar', onClick: () => { this.rotTarget -= Math.PI / 8; } }] };
    return {
      objective: 'Representar estudiantes como puntos en un espacio de variables.',
      idea: 'Cada variable puede usarse como un eje: una dimensión de representación. Pero dos ejes no son necesariamente dos dimensiones conceptuales distintas: pueden medir casi lo mismo.',
      steps: [
        { title: 'Una variable, un eje', icon: 'axes', prompt: 'Cada esfera es una estudiante. Su posición indica sus minutos en la plataforma.',
          enter: () => set({ dims: 1, norm: 'minmax', axes: { x: 'minutos_plataforma', y: 'participaciones_foro', z: 'casos' } }),
          actions: [axisSel('x')] },
        { title: 'Agrega una segunda variable', icon: 'axes', prompt: 'Ahora cada estudiante tiene dos coordenadas. Toca una esfera para ver sus valores.',
          enter: () => set({ dims: 2 }), actions: [axisSel('y')] },
        { title: 'Entra en tres dimensiones', icon: 'cube', prompt: 'Gira el espacio o camina a su alrededor con las gafas. Cada punto es (x, y, z).',
          enter: () => { set({ dims: 3 }); this.rotTarget += 0.6; }, actions: [axisSel('z'), rot] },
        { title: 'Iguala las escalas', icon: 'scale', prompt: 'Minutos, mensajes y puntos tienen unidades distintas. Compara dos formas de normalizar.',
          enter: () => set({ dims: 3 }),
          actions: [{ type: 'buttons', items: [
            { label: 'Mín–máx (0 a 1)', vrLabel: 'Mín–máx', active: st.norm === 'minmax', onClick: () => set({ norm: 'minmax' }) },
            { label: 'Puntuación z', vrLabel: 'z', active: st.norm === 'z', onClick: () => set({ norm: 'z' }) }] },
            { label: '¿Qué fórmula se usa?', onClick: () => this.showScaleFormula() }] },
        { title: '¿Dos ejes, dos ideas?', icon: 'bulb', prompt: `${VARS[st.axes.x].label} y ${VARS[st.axes.y].label}: r = ${r('x', 'y')}. ¿Dos ejes significan dos ideas distintas?`,
          enter: () => set({ dims: 2, axes: { ...st.axes, x: 'minutos_plataforma', y: 'participaciones_foro' } }),
          actions: [{ label: 'Ver respuesta', primary: true, onClick: () => this.detail({ kicker: 'Reflexión', title: 'Dos ejes, una posible dimensión', text: ['Son dos variables distintas y ocupan dos ejes, pero ambas pueden reflejar una misma dimensión conceptual: la participación en línea.', 'Una correlación alta sugiere información compartida; decidir si es una sola dimensión requiere teoría y evidencia (escena 4).'] }) },
            { label: 'Probar con estatura', onClick: () => set({ axes: { ...st.axes, y: 'estatura_cm' } }) }] },
      ],
    };
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
    for (const p of this.points) {
      p.position.lerp(p.userData.target, f);
      const sel = p.userData.i === this.state.selected;
      const s = sel ? 1.6 : p.userData.hover ? 1.4 : 1;
      p.scale.setScalar(THREE.MathUtils.lerp(p.scale.x, s, f));
      p.material.emissiveIntensity = sel ? 0.9 : p.userData.hover ? 0.7 : 0.25;
      if (sel) p.material.color.set('#ffffff'); else p.material.color.set(COLORS.variable);
    }
    if (this.halo.visible) { this.halo.position.copy(this.points[this.state.selected].position); this.halo.lookAt(this.app.camera.getWorldPosition(new THREE.Vector3())); this.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.1); }
  }
}
