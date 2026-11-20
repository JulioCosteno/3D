// Escena 3 — Tipos de variables.
// Cuatro estaciones (nominal, ordinal, discreta, continua) con objetos y un ejercicio de clasificación
// con retroalimentación inmediata. Ejemplos tomados del curso Innovación y Tecnología Educativa.
import * as THREE from 'three';
import { BaseScene } from '../core/sceneBase.js';
import { makeLabel, makeCard } from '../core/text.js';
import { COLORS } from '../core/theme.js';

const TYPES = {
  nominal: { name: 'Nominal', color: COLORS.nominal, short: 'Categorías sin orden', long: 'Las categorías solo se distinguen entre sí. Se pueden contar frecuencias y calcular la moda, pero no ordenar ni promediar códigos.' },
  ordinal: { name: 'Ordinal', color: COLORS.ordinal, short: 'Categorías con orden', long: 'Las categorías tienen un orden, pero las distancias entre ellas no son iguales ni conocidas. Mediana y percentiles son apropiados.' },
  discreta: { name: 'Cuantitativa discreta', color: COLORS.discrete, short: 'Conteos: valores enteros', long: 'Toma valores separados (0, 1, 2…), normalmente conteos. Entre 2 y 3 mensajes no existe 2.5 mensajes.' },
  continua: { name: 'Cuantitativa continua', color: COLORS.continuous, short: 'Cualquier valor en un intervalo', long: 'Puede tomar cualquier valor dentro de un intervalo; la precisión depende del instrumento (minutos, segundos, milisegundos…).' },
};
const ORDER = ['nominal', 'ordinal', 'discreta', 'continua'];

const CARDS = [
  { v: 'Plataforma usada en el curso (Moodle, Classroom, Teams)', a: 'nominal', why: 'Son nombres de categorías sin orden: ninguna plataforma es «mayor» que otra.' },
  { v: 'Modalidad del curso: presencial, en línea o híbrida', a: 'nominal', why: 'Distingue tipos de modalidad sin un orden intrínseco.' },
  { v: 'Herramienta de comunicación preferida: correo, chat o foro', a: 'nominal', why: 'Categorías sin orden. Codificarlas 1, 2, 3 no las convierte en cantidades.' },
  { v: 'Código postal del domicilio', a: 'nominal', why: 'Aunque son números, funcionan como etiquetas: restar dos códigos postales no tiene sentido.' },
  { v: 'Dominio de TIC: básico, intermedio, avanzado', a: 'ordinal', why: 'Hay un orden claro, pero no sabemos si la distancia básico→intermedio es igual a intermedio→avanzado.' },
  { v: 'Grado de acuerdo (1 a 5) con «las TAC mejoran mi aprendizaje»', a: 'ordinal', why: 'Una escala tipo Likert es ordinal. Tratarla como de intervalo es un supuesto que debe justificarse.' },
  { v: 'Lugar obtenido en el concurso de recursos multimedia (1.º, 2.º, 3.º)', a: 'ordinal', why: 'Indica posición, no cuánto mejor fue un proyecto que otro.' },
  { v: 'Número de mensajes publicados en el foro', a: 'discreta', why: 'Es un conteo: 0, 1, 2… mensajes.' },
  { v: 'Número de recursos multimedia entregados', a: 'discreta', why: 'Se cuentan unidades completas.' },
  { v: 'Sesiones sincrónicas asistidas (de 8)', a: 'discreta', why: 'Es un conteo entero de sesiones.' },
  { v: 'Tiempo conectado a la plataforma', a: 'continua', why: 'El tiempo puede medirse con tanta precisión como permita el registro.' },
  { v: 'Velocidad de conexión a internet (Mbps)', a: 'continua', why: 'Puede tomar cualquier valor dentro de un intervalo.' },
  { v: 'Duración de un video educativo', a: 'continua', why: 'Es tiempo: admite cualquier valor (minutos, segundos, fracciones).' },
];

export default class Scene3 extends BaseScene {
  constructor(app) {
    super(app, 'escena3', { title: 'Tipos de variables', short: 'Tipos' });
    this.cameraPreset = { position: [0, 2.15, 2.5], target: [0, 1.1, -2.0] };
    this.deck = shuffle([...CARDS]);
    this.ci = 0; this.answered = null; this.score = 0; this.tries = 0;
    this.codes = [1, 2, 3];
  }

  async init() {
    const R = this.root;
    this.stations = {};
    const angles = [-50, -17, 17, 50].map((d) => THREE.MathUtils.degToRad(d));
    ORDER.forEach((k, i) => {
      const a = angles[i];
      const st = new THREE.Group();
      st.position.set(2.3 * Math.sin(a), 0, 1.9 - 2.3 * Math.cos(a));
      st.rotation.y = -a;
      const T = TYPES[k];
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.7, 40), BaseScene.mat('#ffffff', { roughness: 0.6 }));
      ped.position.y = 0.35;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.014, 8, 60), new THREE.MeshStandardMaterial({ color: T.color, emissive: T.color, emissiveIntensity: 0.6 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.705;
      st.add(ped, ring);
      const sign = makeCard(T.short, { width: 0.92, height: 0.24, fontSize: 32, title: T.name, titleColor: T.color, border: T.color });
      sign.position.set(0, 1.78, 0);
      st.add(sign);
      const content = new THREE.Group();
      content.position.y = 0.7;
      st.add(content);
      BaseScene.shadow(st, true, true);
      R.add(st);
      this.stations[k] = { group: st, ring, content, sign };
      this.reg(st, { onSelect: () => this.pick(k) });
    });
    this.buildNominal(this.stations.nominal.content);
    this.buildOrdinal(this.stations.ordinal.content);
    this.buildDiscrete(this.stations.discreta.content);
    this.buildContinuous(this.stations.continua.content);

    // Tarjeta del ejercicio
    this.cardHome = new THREE.Vector3(0, 2.28, 0.35);
    this.card = makeCard('', { width: 0.78, height: 0.3, fontSize: 30 });
    this.card.position.copy(this.cardHome);
    this.card.rotation.x = 0.12;
    R.add(this.card);
    this.reg(this.card, { onSelect: () => this.detail({ kicker: 'Ejercicio', title: 'Clasifica la variable', text: 'Selecciona la estación (pedestal) que corresponde al tipo de esta variable, o usa los botones del panel.' }) });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.006, 6, 64), new THREE.MeshBasicMaterial({ color: COLORS.variable, transparent: true, opacity: 0.5 }));
    halo.visible = false;
    this.card.add(halo);
    this.cardHalo = halo;
    this.renderCard();
  }

  // ---- Estación nominal: modalidad preferida, con códigos arbitrarios ----
  buildNominal(C) {
    const cats = this.app.data.variables.modalidad_preferida.categorias;
    this.nomCats = cats;
    const counts = cats.map((c) => this.app.data.estudiantes.filter((s) => s.modalidad_preferida === c).length);
    this.nomCounts = counts;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.05), BaseScene.mat('#94a3b8'));
    line.position.set(0, 0.03, 0.22);
    C.add(line);
    for (let i = 0; i < 3; i++) {
      const lbl = makeLabel(String(i + 1), { height: 0.04, bg: null, color: COLORS.muted });
      lbl.position.set(-0.3 + i * 0.3, 0.09, 0.27);
      C.add(lbl);
    }
    const cols = ['#f472b6', '#c084fc', '#22d3ee'];
    this.bins = cats.map((c, i) => {
      const g = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: cols[i], side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      cup.position.y = 0.09;
      g.add(cup);
      const ballMat = new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.3 });
      for (let b = 0; b < Math.min(12, counts[i]); b++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), ballMat);
        s.position.set(Math.cos(b * 2.4) * 0.05 * ((b % 3) / 2 + 0.3), 0.04 + Math.floor(b / 4) * 0.04, Math.sin(b * 2.4) * 0.05 * ((b % 3) / 2 + 0.3));
        g.add(s);
      }
      const tag = makeLabel('', { height: 0.045, border: cols[i] });
      tag.position.y = 0.28;
      g.add(tag);
      g.userData = { tag, target: new THREE.Vector3() };
      C.add(g);
      return g;
    });
    this.meanLabel = makeLabel('', { height: 0.042, color: '#fecaca', border: COLORS.bad, maxWidthPx: 700 });
    this.meanLabel.position.set(0, 0.56, 0);
    C.add(this.meanLabel);
    this.applyCodes(true);
  }

  applyCodes(instant = false) {
    this.bins.forEach((g, i) => {
      const code = this.codes[i];
      g.userData.target.set(-0.3 + (code - 1) * 0.3, 0.04, 0);
      if (instant) g.position.copy(g.userData.target);
      g.userData.tag.setText(`${code} · ${this.nomCats[i]}`);
    });
    const n = this.nomCounts.reduce((a, b) => a + b, 0);
    const mean = this.nomCounts.reduce((s, c, i) => s + c * this.codes[i], 0) / n;
    this.meanLabel.setText(`«Promedio» = ${mean.toFixed(2)} → sin sentido`);
    this.nomMean = mean;
  }

  recode() {
    let next;
    do { next = shuffle([1, 2, 3]); } while (next.join() === this.codes.join());
    this.codes = next;
    this.applyCodes();
    const [a, b] = [0, 2];
    this.detail({
      kicker: 'Variable nominal', title: 'Los códigos son arbitrarios',
      rows: this.nomCats.map((c, i) => [c, `código ${this.codes[i]} (${this.nomCounts[i]} estudiantes)`]).concat([['«Promedio» de códigos', this.nomMean.toFixed(2)], [`Distancia ${this.nomCats[a]}–${this.nomCats[b]}`, Math.abs(this.codes[a] - this.codes[b])]]),
      text: 'Al cambiar la codificación cambian las «distancias» y el «promedio», aunque los datos sean los mismos. Por eso no se interpretan como magnitudes: solo indican categorías distintas. La moda sí se conserva.',
    });
  }

  // ---- Estación ordinal: dominio de TIC (escalones desiguales) ----
  buildOrdinal(C) {
    const levels = [['Básico', 0.08], ['Intermedio', 0.22], ['Avanzado', 0.29]];
    levels.forEach(([name, h], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, h, 0.32), new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.ordinal).offsetHSL(0, 0, -0.15 + i * 0.1), roughness: 0.5 }));
      m.position.set(-0.27 + i * 0.27, h / 2, 0);
      C.add(m);
      const lbl = makeLabel(`${i + 1} · ${name}`, { height: 0.045, border: COLORS.ordinal });
      lbl.position.set(-0.27 + i * 0.27, h + 0.08, 0.05);
      C.add(lbl);
    });
    const q = makeLabel('¿Escalones iguales? No se sabe', { height: 0.04, bold: false, color: '#fed7aa', bg: 'rgba(9,16,30,0.75)', maxWidthPx: 600 });
    q.position.set(0, 0.58, 0);
    C.add(q);
  }

  // ---- Estación discreta: mensajes en el foro (cubos) ----
  buildDiscrete(C) {
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.discrete, roughness: 0.4 });
    const geo = new THREE.BoxGeometry(0.065, 0.065, 0.065);
    for (let n = 0; n <= 4; n++) {
      const x = -0.32 + n * 0.16;
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(geo, mat); b.position.set(x, 0.035 + k * 0.07, 0); C.add(b); }
      const lbl = makeLabel(String(n), { height: 0.045, bg: null, color: '#bbf7d0' });
      lbl.position.set(x, 0.03, 0.2);
      C.add(lbl);
    }
    const t = makeLabel('0, 1, 2… (no existe 2.5)', { height: 0.04, bold: false, color: '#bbf7d0', bg: 'rgba(9,16,30,0.75)', maxWidthPx: 600 });
    t.position.set(0, 0.52, 0);
    C.add(t);
  }

  // ---- Estación continua: tiempo conectado (marcador que se desliza) ----
  buildContinuous(C) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 32;
    const g = cv.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 512, 0); grd.addColorStop(0, '#0c4a6e'); grd.addColorStop(1, '#7dd3fc');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 32);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }));
    tube.rotation.z = Math.PI / 2; tube.position.set(0, 0.2, 0);
    C.add(tube);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: COLORS.continuous, emissiveIntensity: 0.6 }));
    this.marker.rotation.z = Math.PI;
    C.add(this.marker);
    for (const [x, t] of [[-0.4, '0 min'], [0, '300'], [0.4, '600']]) {
      const l = makeLabel(t, { height: 0.04, bg: null, color: '#bae6fd' }); l.position.set(x, 0.12, 0.05); C.add(l);
    }
    this.contLabel = makeLabel('', { height: 0.045, border: COLORS.continuous });
    this.contLabel.position.set(0, 0.48, 0);
    C.add(this.contLabel);
    this._contT = 0;
  }

  renderCard() {
    const c = this.deck[this.ci];
    let border = COLORS.variable, title = `Tarjeta ${this.ci + 1} de ${this.deck.length} · ¿qué tipo es?`, tc = COLORS.variable;
    if (this.answered) {
      const ok = this.answered === c.a;
      border = ok ? COLORS.ok : COLORS.bad; tc = border;
      title = ok ? `Correcto: ${TYPES[c.a].name}` : `Es ${TYPES[c.a].name}`;
    }
    this.card.setContent(c.v, { border, title, titleColor: tc, fontSize: 30 });
    this.cardHalo.material.color.set(border);
  }

  pick(k) {
    if (this.answered || !this.card.visible) {
      const T = TYPES[k];
      this.detail({ kicker: 'Estación', title: T.name, text: [T.long, k === 'nominal' ? '' : ''].filter(Boolean) });
      return;
    }
    this.classify(k);
  }

  classify(k) {
    const c = this.deck[this.ci];
    if (this.answered) return;
    this.answered = k;
    this.tries++;
    const ok = k === c.a;
    if (ok) this.score++;
    this.flash = { k, ok, t: 0 };
    this.renderCard();
    if (ok) {
      // La tarjeta vuela a su estación
      const st = this.stations[k].group;
      const to = st.position.clone().add(new THREE.Vector3(0, 1.45, 0));
      const from = this.card.position.clone();
      this.app.tween(0.7, (e) => { this.card.position.lerpVectors(from, to, e); this.card.scale.setScalar(1 - 0.35 * e); });
    }
    this.detail({
      state: ok ? 'ok' : 'bad',
      kicker: ok ? '¡Correcto!' : `Elegiste: ${TYPES[k].name}`,
      title: `${c.v} → ${TYPES[c.a].name}`,
      text: [c.why, ok ? '' : TYPES[c.a].long].filter(Boolean),
    });
    this.refresh();
  }

  next() {
    this.ci = (this.ci + 1) % this.deck.length;
    if (this.ci === 0) { this.deck = shuffle([...CARDS]); this.score = 0; this.tries = 0; }
    this.answered = null;
    this.card.position.copy(this.cardHome); this.card.scale.setScalar(1);
    this.renderCard();
    this.detail(null);
  }

  // ---------- Secuencia didáctica ----------
  getGuide() {
    const c = this.deck[this.ci];
    const show = (k) => { const T = TYPES[k]; this.detail({ kicker: 'Estación', title: T.name, text: T.long }); this.focusStation(k); };
    const typeBtn = (k) => ({ label: TYPES[k].name.replace('Cuantitativa d', 'D').replace('Cuantitativa c', 'C'), state: this.answered ? (k === c.a ? 'ok' : k === this.answered ? 'bad' : undefined) : undefined, onClick: () => this.classify(k) });
    return {
      objective: 'Clasificar variables según sus propiedades: nominal, ordinal, discreta o continua.',
      idea: 'Que una variable se capture con números no la vuelve cuantitativa. Lo que importa es qué operaciones tienen sentido: distinguir (nominal), ordenar (ordinal), contar (discreta) o medir en un continuo (continua).',
      steps: [
        { title: 'Recorre las estaciones', icon: 'eye', prompt: 'Cuatro tipos de variables, cuatro estaciones. Toca cada una para conocerla.',
          enter: () => { this.cardVisible(false); },
          actions: [{ type: 'buttons', items: ORDER.map((k) => ({ label: TYPES[k].name.replace('Cuantitativa d', 'D').replace('Cuantitativa c', 'C'), onClick: () => show(k) })) }] },
        { title: '¿Los códigos son cantidades?', icon: 'shuffle', prompt: 'Cambia los códigos de la modalidad preferida. ¿Qué pasa con el «promedio»?',
          enter: () => { this.cardVisible(false); this.focusStation('nominal'); },
          actions: [{ label: 'Recodificar', icon: 'shuffle', primary: true, onClick: () => this.recode() }] },
        { title: 'Clasifica', icon: 'check', prompt: `Tarjeta ${this.ci + 1} de ${this.deck.length} · aciertos ${this.score}/${this.tries}. Toca la estación correcta.`,
          enter: () => { this.cardVisible(true); this.focusStation(null); },
          actions: [
            { type: 'question', text: `«${c.v}»` },
            { type: 'buttons', items: ORDER.map(typeBtn) },
            this.answered ? { label: 'Siguiente tarjeta', primary: true, onClick: () => this.next() } : null,
          ] },
      ],
    };
  }

  cardVisible(on) { this.card.visible = on; }

  focusStation(k) {
    for (const key of ORDER) { const g = this.stations[key].group; g.userData.lift = key === k ? 0.06 : 0; }
  }

  getControls() {
    const c = [
      { type: 'heading', label: `Ejercicio · aciertos ${this.score} de ${this.tries}` },
      { type: 'text', text: `«${this.deck[this.ci].v}»` },
      { type: 'text', text: this.answered ? 'Selecciona «Siguiente tarjeta» para continuar.' : 'Selecciona la estación correcta o un botón:' },
    ];
    if (!this.answered) ORDER.forEach((k) => c.push({ type: 'button', label: TYPES[k].name, onClick: () => this.classify(k) }));
    else c.push({ type: 'button', label: 'Siguiente tarjeta →', onClick: () => this.next() });
    c.push(
      { type: 'heading', label: 'Explorar estaciones' },
      { type: 'button', label: 'Recodificar modalidad (nominal)', onClick: () => this.recode() },
      { type: 'buttons', items: ORDER.slice(0, 2).map((k) => ({ label: TYPES[k].name, onClick: () => { const T = TYPES[k]; this.detail({ kicker: 'Estación', title: T.name, text: T.long }); } })) },
      { type: 'buttons', items: ORDER.slice(2).map((k) => ({ label: TYPES[k].name.replace('Cuantitativa ', ''), onClick: () => { const T = TYPES[k]; this.detail({ kicker: 'Estación', title: T.name, text: T.long }); } })) },
    );
    return c;
  }

  getInfo() {
    return {
      kicker: 'Escena 3 · Tipos de variables',
      title: 'Nominal, ordinal, discreta, continua',
      legend: ORDER.map((k) => ({ label: TYPES[k].name.replace('Cuantitativa ', ''), color: TYPES[k].color })),
      paragraphs: [
        'Cada estación muestra un tipo de variable con un ejemplo del curso: modalidad preferida (nominal), dominio de TIC (ordinal), mensajes en el foro (discreta) y tiempo conectado (continua).',
        'Clasifica las tarjetas seleccionando la estación correcta. Recibirás retroalimentación inmediata.',
        'En la estación nominal, los códigos 1, 2 y 3 son etiquetas. Si se recodifican, cambian las «distancias» y el «promedio» de los códigos aunque los datos sean idénticos: por eso no deben interpretarse como magnitudes.',
      ],
      notes: ['Que una variable se capture con números no la vuelve cuantitativa: lo que importa es qué propiedades de los números tienen sentido para esa característica.'],
    };
  }

  update(dt, t) {
    const f = 1 - Math.exp(-dt * 6);
    for (const g of this.bins) g.position.lerp(g.userData.target, f);
    for (const k of ORDER) { const g = this.stations[k].group; g.position.y = THREE.MathUtils.lerp(g.position.y, g.userData.lift || 0, f); }
    // Estación continua
    this._contT += dt;
    const v = 300 + 270 * Math.sin(t * 0.45) * Math.cos(t * 0.17);
    this.marker.position.set(((v / 600) - 0.5) * 0.8, 0.29, 0);
    if (this._contT > 0.12) { this._contT = 0; this.contLabel.setText(`${v.toFixed(3)} min`); }
    // Tarjeta flotante
    if (!this.answered) { this.card.position.y = this.cardHome.y + Math.sin(t * 1.4) * 0.015; }
    // Destello de la estación elegida
    for (const k of ORDER) this.stations[k].ring.material.emissiveIntensity = 0.6;
    if (this.flash) {
      this.flash.t += dt;
      const r = this.stations[this.flash.k].ring.material;
      if (this.flash.t < 1.5) { r.emissive.set(this.flash.ok ? COLORS.ok : COLORS.bad); r.emissiveIntensity = 0.6 + Math.abs(Math.sin(this.flash.t * 9)) * 1.5; }
      else { r.emissive.set(TYPES[this.flash.k].color); this.flash = null; }
    }
  }
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
