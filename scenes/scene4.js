// Escena 4 — Dimensiones conceptuales.
// Modelo de nodos: un constructo latente (elipse) y tres indicadores observables (rectángulos), con
// términos de error. Los vínculos se presentan como HIPÓTESIS (λ = ? por estimar), nunca como
// relaciones psicométricas validadas. Se contrasta con un modelo alternativo de dos factores.
import * as THREE from 'three';
import { BaseScene } from '../core/sceneBase.js';
import { makeLabel, makeCard, Board } from '../core/text.js';
import { COLORS } from '../core/theme.js';

const EXAMPLES = {
  estadistica: {
    construct: 'Comprensión estadística',
    alt: ['Tendencia central', 'Comprensión de la variabilidad'],
    altMap: [0, 1, 1],
    ind: [
      { key: 'ind_media', name: 'Identificación de la media aritmética', task: 'Dado un conjunto de calificaciones, identifica cuál valor es la media y explica cómo se obtiene.' },
      { key: 'ind_desviacion', name: 'Interpretación de la desviación estándar', task: 'Dos grupos tienen la misma media y distinta desviación estándar: ¿cuál es más homogéneo y por qué?' },
      { key: 'ind_distribucion', name: 'Explicación de una distribución de datos', task: 'Describe la forma, el centro y la dispersión de un histograma.' },
    ],
  },
  tic: {
    construct: 'Competencia para integrar TIC y TAC',
    alt: ['Análisis pedagógico', 'Producción multimedia'],
    altMap: [0, 1, 0],
    ind: [
      { key: 'casos', name: 'Análisis de casos (rúbrica)', task: 'Analiza un caso real de incorporación de TIC/TAC y propone una solución justificada.' },
      { key: 'carteles', name: 'Carteles y recursos multimedia', task: 'Diseña un cartel o recurso multimedia que comunique información de manera clara.' },
      { key: 'ensayos', name: 'Ensayo argumentativo', task: 'Argumenta la solución de un caso vinculándola con referentes teóricos.' },
    ],
  },
};

export default class Scene4 extends BaseScene {
  constructor(app) {
    super(app, 'escena4', { title: 'Dimensiones conceptuales', short: 'Constructos' });
    this.cameraPreset = { position: [0.35, 1.7, 2.1], target: [0.35, 1.5, -2] };
    this.ex = 'estadistica';
    this.model = 1;
    this.showCorr = false;
    this.showRoute = false;
  }

  async init() {
    const R = this.root;
    // Nodos latentes (elipses)
    this.latents = [0, 1].map((i) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), new THREE.MeshStandardMaterial({ color: '#7c3aed', emissive: '#6d28d9', emissiveIntensity: 0.25, transparent: true, opacity: 0.82, roughness: 0.3, depthWrite: false }));
      core.scale.set(1.5, 0.75, 0.6);
      const shell = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.006, 6, 80), new THREE.MeshBasicMaterial({ color: '#5b21b6' }));
      shell.scale.set(1, 0.5, 1);
      const label = makeLabel('', { height: 0.065, border: COLORS.dimension, color: '#ede9fe' });
      label.position.y = 0.42;
      const tag = makeLabel('latente · no observable', { height: 0.04, bold: false, bg: 'rgba(9,16,30,0.8)', color: '#ddd6fe' });
      tag.position.y = -0.3;
      g.add(core, shell, label, tag);
      g.position.set(0, 2.05, 0);
      g.userData = { label, core, shell, target: new THREE.Vector3(0, 2.05, 0), targetScale: i === 0 ? 1 : 0.001 };
      if (i === 1) g.scale.setScalar(0.001);
      R.add(g);
      this.reg(g, { onSelect: () => this.showLatent(i) });
      return g;
    });

    // Indicadores (rectángulos) y errores
    this.indicators = [0, 1, 2].map((i) => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.08), new THREE.MeshStandardMaterial({ color: '#3a2d0b', emissive: COLORS.indicator, emissiveIntensity: 0.15, roughness: 0.5 }));
      const face = makeCard('', { width: 0.7, height: 0.3, fontSize: 30, border: COLORS.indicator, title: `Indicador ${i + 1} · observable`, titleColor: COLORS.indicator });
      face.position.z = 0.045;
      g.add(box, face);
      g.position.set(-1.0 + i * 1.0, 0.95, 0.15);
      g.userData = { face };
      R.add(BaseScene.shadow(g));
      this.reg(g, { onSelect: () => this.showIndicator(i) });
      // Error de medición
      const e = new THREE.Group();
      const circ = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 }));
      const el = makeLabel(`e${'₁₂₃'[i]}`, { height: 0.05, bg: null });
      el.position.z = 0.09;
      e.add(circ, el);
      e.position.set(g.position.x, 0.42, 0.15);
      R.add(e);
      this.reg(e, { onSelect: () => this.detail({ kicker: 'Error de medición', title: `e${'₁₂₃'[i]}`, text: 'Parte de la puntuación observada que no se explica por el constructo: errores, factores específicos de la tarea, condiciones de aplicación, etc. Ningún indicador es una medida perfecta.' }) });
      g.userData.err = e;
      return g;
    });

    // Flechas (líneas discontinuas + punta) y partículas
    const mkArrow = (color) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineDashedMaterial({ color, dashSize: 0.05, gapSize: 0.035 }));
      line.frustumCulled = false;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 14), new THREE.MeshBasicMaterial({ color }));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      R.add(line, cone, dot);
      return { line, cone, dot };
    };
    this.arrows = this.indicators.map(() => mkArrow('#7c3aed'));
    this.errArrows = this.indicators.map(() => mkArrow('#64748b'));
    this.lambdas = this.indicators.map((_, i) => {
      const l = makeLabel(`λ${'₁₂₃'[i]} = ? (hipótesis)`, { height: 0.045, bold: false, color: '#ddd6fe', bg: 'rgba(9,16,30,0.8)' });
      R.add(l);
      this.reg(l, { onSelect: () => this.detail({ kicker: 'Carga factorial', title: `λ${'₁₂₃'[i]} = ? · por estimar`, text: ['La flecha expresa una hipótesis: que el constructo influye en la puntuación del indicador. Su magnitud (carga) no se conoce de antemano.', 'Solo puede estimarse con datos suficientes y un modelo de medición (p. ej., análisis factorial confirmatorio) cuyo ajuste también debe evaluarse.'] }) });
      return l;
    });
    // Correlación entre factores (modelo alternativo)
    this.corrArc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#c026d3', dashSize: 0.04, gapSize: 0.03 }));
    this.corrArc.frustumCulled = false;
    R.add(this.corrArc);
    this.corrArcLabel = makeLabel('φ = ? (correlación entre factores)', { height: 0.045, bold: false, color: '#f5d0fe', bg: 'rgba(9,16,30,0.8)' });
    R.add(this.corrArcLabel);

    // Correlaciones observadas entre indicadores (datos ficticios)
    this.corrLines = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => {
      const pa = this.indicators[a].position, pb = this.indicators[b].position;
      const yOff = a === 0 && b === 2 ? -0.32 : -0.24;
      const pts = [new THREE.Vector3(pa.x + 0.15, pa.y + yOff + 0.05, 0.2), new THREE.Vector3((pa.x + pb.x) / 2, pa.y + yOff - (a === 0 && b === 2 ? 0.12 : 0.02), 0.2), new THREE.Vector3(pb.x - 0.15, pb.y + yOff + 0.05, 0.2)];
      const curve = new THREE.QuadraticBezierCurve3(...pts);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), new THREE.LineBasicMaterial({ color: COLORS.indicator, transparent: true, opacity: 0.8 }));
      const lbl = makeLabel('', { height: 0.045, border: COLORS.indicator });
      lbl.position.copy(curve.getPoint(0.5)).add(new THREE.Vector3(0, -0.03, 0.02));
      const g = new THREE.Group(); g.add(line, lbl); g.visible = false;
      R.add(g);
      return { g, lbl, a, b };
    });

    // Tablero: ruta de evidencia
    this.route = new Board({ width: 0.82, ppm: 820, maxHeight: 1.6, border: COLORS.dimension, anchorTop: true });
    this.route.group.position.set(1.4, 2.3, -0.55);
    this.route.group.rotation.y = -0.4;
    R.add(this.route.group);
    this.route.setBlocks([
      { type: 'kicker', text: 'Ruta de evidencia', color: COLORS.dimension },
      { type: 'title', text: '¿Es unidimensional?' },
      { type: 'p', text: '1 · Teoría del constructo' },
      { type: 'p', text: '2 · Juicio de expertos' },
      { type: 'p', text: '3 · Análisis factorial confirmatorio' },
      { type: 'p', text: '4 · Confiabilidad e invarianza' },
      { type: 'p', text: '5 · Relación con otras variables' },
      { type: 'note', text: 'Pendiente: los datos de este laboratorio son ficticios.' },
    ]);

    this.warn = makeLabel('Modelo hipotético · no validado', { height: 0.055, maxWidthPx: 1400, color: '#fde68a', border: COLORS.indicator });
    this.warn.position.set(0, 2.72, 0);
    R.add(this.warn);

    this.applyExample();
  }

  pearson(k1, k2) {
    const rows = this.app.data.estudiantes;
    const xs = rows.map((r) => r[k1]), ys = rows.map((r) => r[k2]);
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy);
  }

  applyExample() {
    const E = EXAMPLES[this.ex];
    this.indicators.forEach((g, i) => g.userData.face.setContent(E.ind[i].name, { fontSize: 28 }));
    this.corrLines.forEach((c) => c.lbl.setText(`r = ${this.pearson(E.ind[c.a].key, E.ind[c.b].key).toFixed(2)}`));
    this.applyModel();
  }

  applyModel() {
    const E = EXAMPLES[this.ex];
    const [L1, L2] = this.latents;
    if (this.model === 1) {
      L1.userData.target.set(0, 2.05, 0); L1.userData.targetScale = 1; L2.userData.targetScale = 0.001;
      L1.userData.label.setText(E.construct);
    } else {
      L1.userData.target.set(-0.8, 2.05, 0); L2.userData.target.set(0.8, 2.05, 0);
      L1.userData.targetScale = 0.8; L2.userData.targetScale = 0.8;
      L1.userData.label.setText(E.alt[0]); L2.userData.label.setText(E.alt[1]);
    }
    this.corrLines.forEach((c) => { c.g.visible = this.showCorr; });
    this.route.group.visible = this.showRoute;
  }

  sourceOf(i) { return this.model === 1 ? this.latents[0] : this.latents[EXAMPLES[this.ex].altMap[i]]; }

  showLatent(i) {
    const E = EXAMPLES[this.ex];
    const name = this.model === 1 ? E.construct : E.alt[i];
    this.detail({
      kicker: 'Constructo latente · dimensión conceptual',
      title: name,
      text: [
        'No se observa directamente. Se propone como la característica común que explicaría, en parte, el desempeño en los indicadores.',
        this.model === 1
          ? 'En este modelo se supone que un solo constructo (unidimensionalidad) da cuenta de los tres indicadores. Es una hipótesis que requiere fundamentación teórica y evidencia empírica.'
          : 'En el modelo alternativo, los indicadores se agrupan en dos factores correlacionados. Con los datos adecuados, ambos modelos se compararían; no se elige uno por apariencia.',
      ],
    });
  }

  showIndicator(i) {
    const E = EXAMPLES[this.ex];
    const ind = E.ind[i];
    const vals = this.app.data.estudiantes.map((r) => r[ind.key]);
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
    this.detail({
      kicker: `Indicador ${i + 1} · variable observable`,
      title: ind.name,
      rows: [['Tarea de ejemplo', ind.task], ['Escala', 'Puntaje 0–10 (rúbrica)'], ['Media (datos ficticios)', mean.toFixed(2)], ['Desviación estándar', sd.toFixed(2)]],
      text: 'Aporta evidencia sobre el constructo, pero también refleja aspectos propios de la tarea y error de medición. Un solo indicador no basta para inferir el constructo.',
    });
  }

  // ---------- Secuencia didáctica ----------
  getGuide() {
    const set = (patch) => { Object.assign(this, patch); this.applyExample(); };
    const exBtns = { type: 'buttons', items: [
      { label: 'Comprensión estadística', vrLabel: 'Estadística', active: this.ex === 'estadistica', onClick: () => set({ ex: 'estadistica' }) },
      { label: 'Competencia TIC/TAC', vrLabel: 'TIC/TAC', active: this.ex === 'tic', onClick: () => set({ ex: 'tic' }) }] };
    return {
      objective: 'Distinguir un constructo latente de los indicadores que lo evidencian.',
      idea: 'Varias variables observables pueden aportar evidencia de una misma dimensión conceptual. Pero que sea una sola dimensión es una hipótesis: requiere fundamentación teórica y evidencia empírica.',
      steps: [
        { title: 'Lo que no se ve', icon: 'eye', prompt: 'La esfera es el constructo: no se observa. Los rectángulos son tareas que sí se observan.',
          enter: () => set({ model: 1, showCorr: false, showRoute: false }),
          actions: [exBtns] },
        { title: 'Explora los indicadores', icon: 'hand', prompt: 'Toca cada indicador y cada error (e). ¿Qué parte del puntaje no viene del constructo?',
          enter: () => set({ model: 1 }),
          actions: [{ type: 'buttons', items: [0, 1, 2].map((i) => ({ label: `Indicador ${i + 1}`, onClick: () => this.showIndicator(i) })) }] },
        { title: 'Las flechas son hipótesis', icon: 'nodes', prompt: 'λ = ? Las relaciones aún no se conocen. Compara un modelo de un factor con uno de dos.',
          enter: () => set({ model: 1 }),
          actions: [{ type: 'buttons', items: [
            { label: '1 factor', active: this.model === 1, onClick: () => set({ model: 1 }) },
            { label: '2 factores', active: this.model === 2, onClick: () => set({ model: 2 }) }] }] },
        { title: '¿Qué evidencia falta?', icon: 'check', prompt: 'Las correlaciones ayudan, pero no bastan. Revisa la ruta de evidencia.',
          enter: () => set({ showCorr: true, showRoute: true }),
          actions: [{ label: this.showCorr ? 'Ocultar correlaciones' : 'Ver correlaciones', active: this.showCorr, onClick: () => set({ showCorr: !this.showCorr }) },
            { label: this.showRoute ? 'Ocultar ruta' : 'Ver ruta de evidencia', active: this.showRoute, onClick: () => set({ showRoute: !this.showRoute }) }] },
      ],
    };
  }

  getControls() {
    return [
      { type: 'heading', label: 'Ejemplo' },
      { type: 'buttons', items: [
        { label: 'Comprensión estadística', vrLabel: 'Estadística', active: this.ex === 'estadistica', onClick: () => { this.ex = 'estadistica'; this.applyExample(); this.detail(null); } },
        { label: 'Competencia TIC/TAC', vrLabel: 'TIC/TAC', active: this.ex === 'tic', onClick: () => { this.ex = 'tic'; this.applyExample(); this.detail(null); } },
      ] },
      { type: 'heading', label: 'Modelo hipotético' },
      { type: 'buttons', items: [
        { label: '1 factor', active: this.model === 1, onClick: () => { this.model = 1; this.applyModel(); } },
        { label: '2 factores', active: this.model === 2, onClick: () => { this.model = 2; this.applyModel(); } },
      ] },
      { type: 'heading', label: 'Evidencia' },
      { type: 'button', label: this.showCorr ? 'Ocultar correlaciones observadas' : 'Ver correlaciones observadas (ficticias)', active: this.showCorr, onClick: () => { this.showCorr = !this.showCorr; this.applyModel(); if (this.showCorr) this.detail({ kicker: 'Correlaciones entre indicadores', title: 'Útiles, pero insuficientes', text: ['Las correlaciones positivas entre indicadores son compatibles con un constructo común, pero también con otras explicaciones (p. ej., dos factores relacionados, un método de evaluación compartido).', 'Además, son datos ficticios con n = 36: no sirven para validar nada.'] }); } },
      { type: 'button', label: this.showRoute ? 'Ocultar ruta de evidencia' : 'Mostrar ruta de evidencia', active: this.showRoute, onClick: () => { this.showRoute = !this.showRoute; this.applyModel(); } },
    ];
  }

  getInfo() {
    const E = EXAMPLES[this.ex];
    return {
      kicker: 'Escena 4 · Constructos',
      title: `Constructo latente: ${E.construct}`,
      legend: [{ label: 'Constructo (latente)', color: COLORS.dimension }, { label: 'Indicador (observable)', color: COLORS.indicator }, { label: 'Error', color: '#94a3b8' }],
      paragraphs: [
        'La elipse representa un constructo latente: una dimensión conceptual que no se observa. Los rectángulos son indicadores observables: puntuaciones en tareas concretas.',
        'Las flechas expresan una hipótesis: que el constructo contribuye a las puntuaciones observadas. Sus magnitudes (λ) no se conocen y deben estimarse.',
        'Varias variables observables pueden aportar evidencia de una misma dimensión conceptual, pero la unidimensionalidad requiere fundamentación teórica y evidencia empírica. Compara el modelo de un factor con el de dos factores.',
      ],
      notes: ['Este modelo es ilustrativo: los vínculos entre indicadores y constructo NO son relaciones psicométricas validadas.'],
    };
  }

  update(dt, t) {
    const f = 1 - Math.exp(-dt * 5);
    for (const L of this.latents) {
      L.position.lerp(L.userData.target, f);
      L.scale.setScalar(THREE.MathUtils.lerp(L.scale.x, L.userData.targetScale, f));
      L.visible = L.scale.x > 0.01;
      L.userData.shell.scale.set(1 + 0.03 * Math.sin(t * 2), 0.5 * (1 + 0.03 * Math.sin(t * 2)), 1);
      L.userData.core.material.emissiveIntensity = 0.3 + 0.12 * Math.sin(t * 2);
    }
    const A = new THREE.Vector3(), B = new THREE.Vector3(), dir = new THREE.Vector3();
    this.indicators.forEach((ind, i) => {
      const src = this.sourceOf(i);
      // Constructo → indicador
      A.copy(src.position); B.copy(ind.position).add(new THREE.Vector3(0, 0.19, 0));
      dir.subVectors(B, A).normalize();
      A.addScaledVector(dir, 0.27 * src.scale.x);
      this.setArrow(this.arrows[i], A, B, t, i);
      this.lambdas[i].position.lerpVectors(A, B, 0.5).add(new THREE.Vector3(i === 1 ? 0.2 : 0, 0, 0.05));
      // Error → indicador
      const e = ind.userData.err.position;
      this.setArrow(this.errArrows[i], new THREE.Vector3(e.x, e.y + 0.08, e.z), new THREE.Vector3(ind.position.x, ind.position.y - 0.19, ind.position.z), t, i + 3, true);
    });
    // Arco de correlación entre factores
    const two = this.model === 2 && this.latents[1].visible;
    this.corrArc.visible = two; this.corrArcLabel.visible = two;
    if (two) {
      const p1 = this.latents[0].position, p2 = this.latents[1].position;
      const c = new THREE.QuadraticBezierCurve3(p1.clone().add(new THREE.Vector3(0.1, 0.25, 0)), new THREE.Vector3((p1.x + p2.x) / 2, p1.y + 0.6, 0), p2.clone().add(new THREE.Vector3(-0.1, 0.25, 0)));
      this.corrArc.geometry.dispose();
      this.corrArc.geometry = new THREE.BufferGeometry().setFromPoints(c.getPoints(30));
      this.corrArc.computeLineDistances();
      this.corrArcLabel.position.copy(c.getPoint(0.5)).add(new THREE.Vector3(0, 0.06, 0));
    }
  }

  setArrow(arrow, A, B, t, phase, small = false) {
    const pos = arrow.line.geometry.attributes.position;
    pos.setXYZ(0, A.x, A.y, A.z); pos.setXYZ(1, B.x, B.y, B.z); pos.needsUpdate = true;
    arrow.line.geometry.computeBoundingSphere();
    arrow.line.computeLineDistances();
    const d = new THREE.Vector3().subVectors(B, A).normalize();
    arrow.cone.position.copy(B).addScaledVector(d, -0.04);
    arrow.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    arrow.cone.scale.setScalar(small ? 0.7 : 1);
    const k = ((t * 0.5 + phase * 0.21) % 1);
    arrow.dot.position.lerpVectors(A, B, k);
    arrow.dot.scale.setScalar(small ? 0.6 : 1);
  }
}
