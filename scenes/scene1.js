// Escena 1 — Momento 1: ¿qué representan las variables?
//
// Figura 1A · «De lo real al modelo» (contexto: Innovación y Tecnología Educativa, PD156)
//   ① Lo real: un estudiante en un curso en línea (plataforma de teleformación, foro asincrónico,
//      sesión sincrónica, autorreportes y una rúbrica de análisis de casos).
//   ② Variables: cada elemento de la situación produce un dato (x₁…x₆).
//   ③ Modelo matemático: el estudiante se representa como un vector; varios estudiantes forman una
//      matriz de datos; la calificación es un modelo de ponderación; el aprendizaje es latente.
//
// Figura 1B · «Persona»: maniquí con estadímetro, báscula y expediente. Variables que se miden,
//   que se registran y que se infieren. El aspecto no cambia con la edad ni con el peso.
import * as THREE from 'three';
import { BaseScene } from '../core/sceneBase.js';
import { makeLabel, makeCard, Board, wrapText } from '../core/text.js';
import { COLORS, FONT } from '../core/theme.js';

const NIVELES = ['Primaria', 'Secundaria', 'Bachillerato', 'Licenciatura', 'Posgrado'];
const MODALIDADES = ['Sincrónica', 'Asincrónica', 'Mixta'];
const DOMINIO = ['Básico', 'Intermedio', 'Avanzado'];
const KIND = {
  observable: { label: 'Observable con instrumento', color: COLORS.observable },
  registrada: { label: 'Registrada', color: COLORS.registered },
  inferida: { label: 'Inferida (no observable)', color: COLORS.inferred },
};

const QUIZ_ONLINE = [
  { q: 'Los minutos conectados que registra la plataforma de teleformación.', a: 'registrada', why: 'Es un registro automático (bitácora). Ojo: estar conectado no garantiza atención ni aprendizaje.' },
  { q: 'El puntaje de un análisis de casos calificado con una rúbrica.', a: 'observable', why: 'Se observa un producto con un instrumento (la rúbrica). Es evidencia del aprendizaje, no el aprendizaje mismo.' },
  { q: 'La competencia para integrar las TAC en la práctica docente.', a: 'inferida', why: 'Es un constructo: se infiere a partir de varias evidencias (casos, carteles, ensayos, exposición).' },
  { q: 'La modalidad de comunicación que el estudiante prefiere (sincrónica o asincrónica).', a: 'registrada', why: 'Se obtiene por autorreporte en un cuestionario. Es una variable nominal.' },
  { q: 'El número de mensajes publicados en el foro asincrónico.', a: 'registrada', why: 'La plataforma lo registra. Es cuantitativa discreta: 0, 1, 2… mensajes.' },
  { q: 'La calidad de un cartel evaluada con una lista de cotejo.', a: 'observable', why: 'Se observa el cartel con un instrumento explícito (lista de cotejo).' },
  { q: 'El aprendizaje logrado en la unidad «Educación a distancia».', a: 'inferida', why: 'El aprendizaje no se ve directamente: se infiere de desempeños observables, siempre con cierto margen de error.' },
];
const QUIZ_PERSON = [
  { q: 'La estatura de una persona, medida con un estadímetro.', a: 'observable', why: 'Se obtiene por medición directa con un instrumento. A simple vista solo podríamos aproximarla.' },
  { q: 'La edad de un estudiante.', a: 'registrada', why: 'La edad no se deduce con certeza de la apariencia: se consulta en un documento o se pregunta.' },
  { q: 'El nivel de aprendizaje en estadística.', a: 'inferida', why: 'El aprendizaje no se observa directamente; se infiere a partir de respuestas a tareas (indicadores).' },
  { q: 'El número de hermanos.', a: 'registrada', why: 'Se obtiene por autorreporte o registro. No hay forma de observarlo en la persona.' },
  { q: 'El peso corporal, medido con una báscula calibrada.', a: 'observable', why: 'Es una medición directa con instrumento. La complexión visual no permite conocer el peso con certeza.' },
  { q: 'La motivación para estudiar.', a: 'inferida', why: 'Es un constructo: se infiere de conductas o de respuestas a un cuestionario, con incertidumbre.' },
];

export default class Scene1 extends BaseScene {
  constructor(app) {
    super(app, 'escena1', { title: 'Momento 1 · ¿Qué representa una variable?', short: 'Variables' });
    this.fig = 'online';
    this.stage = 1;
    this.person = { estatura: 170, edad: 21, peso: 66, hermanos: 2, nivel: 4 };
    this.online = { nombre: 'Estudiante', id: 'E00', minutos: 210, foro: 6, asistencia: 6, modalidad: 3, dominio: 2, casos: 8.2, carteles: 7.5, ensayos: 7.8, exposicion: 8.0 };
    this.quiz = { online: { i: 0, ans: null, score: 0 }, person: { i: 0, ans: null, score: 0 } };
    this.cameraPreset = { position: [0.25, 1.65, 1.75], target: [0.25, 1.25, -2] };
  }

  async init() {
    this.personGroup = new THREE.Group();
    this.onlineGroup = new THREE.Group();
    this.root.add(this.personGroup, this.onlineGroup);
    this.buildOnline();
    this.buildPerson();
    const st = this.app.data.estudiantes.find((e) => e.id === 'E07') || this.app.data.estudiantes[0];
    this.loadOnline(st, true);
    this.setFigure('online', true);
  }

  // =========================================================================
  // Figura 1A · De lo real al modelo
  // =========================================================================
  buildOnline() {
    const G = this.onlineGroup;
    this.real = new THREE.Group();
    G.add(this.real);
    const R = this.real;

    // Escritorio y silla
    const wood = BaseScene.mat('#c8a27a', { roughness: 0.6 });
    const metal = BaseScene.mat('#475569', { metalness: 0.6, roughness: 0.4 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.62), wood);
    top.position.set(0.05, 0.74, -0.25);
    R.add(top);
    for (const [x, z] of [[-0.55, -0.5], [0.65, -0.5], [-0.55, 0.0], [0.65, 0.0]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), metal);
      leg.position.set(x, 0.36, z); R.add(leg);
    }
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), BaseScene.mat('#1e3a5f'));
    seat.position.y = 0.44;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.04), BaseScene.mat('#1e3a5f'));
    back.position.set(0, 0.72, 0.22);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), metal);
    post.position.y = 0.21;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 20), metal);
    foot.position.y = 0.02;
    chair.add(seat, back, post, foot);
    chair.position.set(-0.2, 0, 0.3);
    R.add(chair);

    // Estudiante sentado (de espaldas al observador, mirando la pantalla)
    this.student = buildMannequin('seated');
    this.student.rotation.y = Math.PI;
    this.student.position.set(-0.2, 0.0, 0.28);
    R.add(this.student);

    // Laptop
    const lap = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.25), BaseScene.mat('#94a3b8', { metalness: 0.5 }));
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.012), BaseScene.mat('#94a3b8', { metalness: 0.5 }));
    lid.position.set(0, 0.12, -0.12); lid.rotation.x = -0.18;
    this.lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.lapScreen.position.set(0, 0.12, -0.112); this.lapScreen.rotation.x = -0.18;
    lap.add(base, lid, this.lapScreen);
    lap.position.set(-0.2, 0.77, -0.25);
    R.add(lap);

    // Rúbrica impresa sobre el escritorio (análisis de casos)
    this.rubric = makeCard('', { width: 0.24, height: 0.3, ppm: 1200, bg: '#f8fafc', border: COLORS.observable, color: '#0f172a', fontSize: 40 });
    this.rubric.rotation.x = -Math.PI / 2; this.rubric.rotation.z = -0.25;
    this.rubric.position.set(0.42, 0.765, -0.2);
    R.add(this.rubric);

    // Pantalla grande proyectada: plataforma de teleformación
    this.lmsCanvas = document.createElement('canvas');
    this.lmsCanvas.width = 1024; this.lmsCanvas.height = 600;
    this.lmsTex = new THREE.CanvasTexture(this.lmsCanvas);
    this.lmsTex.colorSpace = THREE.SRGBColorSpace; this.lmsTex.anisotropy = 4;
    this.lapScreen.material = new THREE.MeshBasicMaterial({ map: this.lmsTex });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.7, 0.03), BaseScene.mat('#0f172a', { metalness: 0.4 }));
    this.lms = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.645), new THREE.MeshBasicMaterial({ map: this.lmsTex }));
    this.lms.position.z = 0.017;
    this.lmsGroup = new THREE.Group();
    this.lmsGroup.add(frame, this.lms);
    this.lmsGroup.position.set(0.05, 1.62, -0.62);
    R.add(this.lmsGroup);

    // Videollamada (sesión sincrónica)
    this.videoCanvas = document.createElement('canvas');
    this.videoCanvas.width = 560; this.videoCanvas.height = 420;
    this.videoTex = new THREE.CanvasTexture(this.videoCanvas);
    this.videoTex.colorSpace = THREE.SRGBColorSpace;
    this.video = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.36), new THREE.MeshBasicMaterial({ map: this.videoTex, transparent: true }));
    this.video.position.set(-0.98, 1.72, -0.42); this.video.rotation.y = 0.45;
    R.add(this.video);

    // Foro asincrónico: burbujas de mensajes
    this.forum = new THREE.Group();
    this.forum.position.set(0.92, 1.45, -0.35); this.forum.rotation.y = -0.45;
    this.bubbles = [];
    const bubbleMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#38bdf8', emissiveIntensity: 0.25, roughness: 0.4 });
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), bubbleMat);
      body.scale.set(1.5, 1, 0.45);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 8), bubbleMat);
      tail.position.set(-0.04, -0.045, 0); tail.rotation.z = 0.6;
      b.add(body, tail);
      b.position.set((i % 3) * 0.16 - 0.16, 0.42 - Math.floor(i / 3) * 0.12, 0);
      this.forum.add(b);
      this.bubbles.push(b);
    }
    this.forumLabel = makeLabel('', { height: 0.042, border: COLORS.registered });
    this.forumLabel.position.set(0, 0.56, 0);
    this.forum.add(this.forumLabel);
    R.add(this.forum);

    // Autorreportes (cuestionario breve)
    this.modCard = makeCard('', { width: 0.46, height: 0.2, fontSize: 28, border: COLORS.registered, title: 'Cuestionario · autorreporte', titleColor: COLORS.registered });
    this.modCard.position.set(-1.0, 1.27, -0.3); this.modCard.rotation.y = 0.5;
    this.domCard = makeCard('', { width: 0.46, height: 0.2, fontSize: 28, border: COLORS.registered, title: 'Autoevaluación de TIC', titleColor: COLORS.registered });
    this.domCard.position.set(-1.0, 1.04, -0.3); this.domCard.rotation.y = 0.5;
    R.add(this.modCard, this.domCard);

    // Lo que NO se ve: la competencia (nube de pensamiento)
    this.cloud = new THREE.Group();
    const cm = new THREE.MeshStandardMaterial({ color: COLORS.inferred, transparent: true, opacity: 0.28, emissive: COLORS.inferred, emissiveIntensity: 0.3, depthWrite: false });
    [[0, 0, 0, 0.11], [0.12, 0.03, 0, 0.085], [-0.11, 0.02, 0, 0.08], [0.03, 0.09, 0, 0.08], [-0.17, -0.15, 0, 0.03], [-0.21, -0.22, 0, 0.018]].forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cm); s.position.set(x, y, z); this.cloud.add(s);
    });
    const q = makeLabel('θ  ¿competencia? · se infiere', { height: 0.042, color: '#fbcfe8', border: COLORS.inferred });
    q.position.set(-0.05, 0.2, 0.05);
    this.cloud.add(q);
    this.cloud.position.set(-0.2, 1.42, 0.5);
    R.add(this.cloud);

    // --- Paso ②: tarjetas de variables y conectores ---
    this.onlineVars = ['minutos', 'foro', 'asistencia', 'modalidad', 'dominio', 'casos', 'competencia'];
    const sources = { minutos: this.lmsGroup, foro: this.forum, asistencia: this.video, modalidad: this.modCard, dominio: this.domCard, casos: this.rubric, competencia: this.cloud };
    this.sources = sources;
    this.chipsB = {};
    this.links = [];
    this.chipCol = new THREE.Group();
    this.chipCol.position.set(1.45, 0, 0.35);
    this.chipCol.rotation.y = -0.4;
    G.add(this.chipCol);
    this.onlineVars.forEach((k, i) => {
      const card = makeCard('', { width: 0.86, height: 0.16, fontSize: 32 });
      card.position.set(0, 2.05 - i * 0.19, 0);
      this.chipCol.add(card);
      this.reg(card, { onSelect: () => this.showOnlineVar(k), onHover: (on) => card.scale.setScalar(on ? 1.06 : 1) });
      this.chipsB[k] = card;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0 }));
      line.frustumCulled = false;
      G.add(line);
      this.links.push({ k, line, card });
      // Cada objeto real también es seleccionable
      this.reg(sources[k], { onSelect: () => this.showOnlineVar(k) });
    });
    this.reg(this.student, { onSelect: () => this.detail({ kicker: 'Lo real', title: 'Un estudiante en un curso en línea', text: ['Lo que ocurre en la situación (conectarse, escribir en el foro, asistir a una videollamada, entregar un análisis de casos) no es todavía una variable.', 'Una variable aparece cuando decidimos qué característica registrar, con qué instrumento y en qué escala. Pasa al paso ② para verlo.'] }) });

    // --- Paso ③: modelo matemático ---
    this.modelBoard = new Board({ width: 1.55, ppm: 680, maxHeight: 1.75, border: COLORS.dimension, anchorTop: true });
    this.modelBoard.group.position.set(0.55, 2.3, 0.45);
    this.modelBoard.group.rotation.y = -0.18;
    G.add(this.modelBoard.group);
    this.reg(this.modelBoard.mesh, { highlight: false, onSelect: () => this.detail({ kicker: 'Modelo matemático', title: 'Del estudiante al vector de datos', text: ['Cada estudiante i se representa con un vector Eᵢ = (x₁, …, x₆). Cada componente es una variable con su propia escala.', 'Si apilamos los vectores de n estudiantes obtenemos una matriz de datos n × p: las filas son casos y las columnas son variables. En la escena 2 cada columna podrá usarse como un eje (una dimensión de representación).'] }) });

    // Mini sistema de ejes: anticipa la escena 2
    this.mini = new THREE.Group();
    const axMat = (c) => new THREE.LineBasicMaterial({ color: c });
    const axis = (to, c) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(...to)]), axMat(c));
    this.mini.add(axis([0.45, 0, 0], COLORS.axisX), axis([0, 0.45, 0], COLORS.axisY), axis([0, 0, 0.45], COLORS.axisZ));
    this.miniPt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: COLORS.variable, emissiveIntensity: 0.8 }));
    this.mini.add(this.miniPt);
    this.miniLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#475569', dashSize: 0.015, gapSize: 0.012 }));
    this.mini.add(this.miniLines);
    const ml = makeLabel('(x₁, x₂, x₆) → un punto', { height: 0.04, bold: false, color: COLORS.muted });
    ml.position.set(0.25, -0.08, 0.2);
    this.mini.add(ml);
    this.mini.position.set(0.95, 0.55, 0.7);
    this.mini.rotation.y = -0.6;
    G.add(this.mini);
    this.reg(this.mini, { onSelect: () => this.app.goTo(1) });

    this.stepLabel = makeLabel('', { height: 0.06, border: COLORS.dimension });
    this.stepLabel.position.set(0.1, 2.42, -0.4);
    this.stepLabel.visible = false;
    G.add(this.stepLabel);
  }

  onlineMeta() {
    const o = this.online;
    const final = 0.3 * o.casos + 0.2 * o.carteles + 0.25 * o.ensayos + 0.25 * o.exposicion;
    return {
      minutos: { x: 'x₁', name: 'Minutos en la plataforma', short: 'Minutos', value: `${o.minutos} min`, raw: o.minutos, kind: 'registrada', tipo: 'Cuantitativa continua', nivel: 'Razón', fuente: 'Bitácora automática de la plataforma de teleformación', how: 'La plataforma registra el tiempo de sesión. Es un dato preciso del registro, pero no indica cuánta atención o aprendizaje hubo.' },
      foro: { x: 'x₂', name: 'Participaciones en el foro', short: 'Foro', value: `${o.foro} mensajes`, raw: o.foro, kind: 'registrada', tipo: 'Cuantitativa discreta', nivel: 'Razón', fuente: 'Registro del foro asincrónico', how: 'Cuenta mensajes publicados (0, 1, 2…). La cantidad no informa sobre la calidad de las participaciones.' },
      asistencia: { x: 'x₃', name: 'Sesiones sincrónicas asistidas', short: 'Asistencia', value: `${o.asistencia} de 8`, raw: o.asistencia, kind: 'registrada', tipo: 'Cuantitativa discreta', nivel: 'Razón', fuente: 'Lista de la videollamada', how: 'Cuenta sesiones en tiempo real (comunicación sincrónica) a las que se conectó el estudiante.' },
      modalidad: { x: 'x₄', name: 'Modalidad preferida', short: 'Modalidad', value: MODALIDADES[o.modalidad - 1], raw: MODALIDADES[o.modalidad - 1], kind: 'registrada', tipo: 'Cualitativa nominal', nivel: 'Nominal', fuente: 'Autorreporte (cuestionario)', how: 'Categorías sin orden: sincrónica, asincrónica, mixta. Si se codifican 1, 2, 3, los números son solo etiquetas.' },
      dominio: { x: 'x₅', name: 'Dominio autopercibido de TIC', short: 'Dominio TIC', value: DOMINIO[o.dominio - 1], raw: DOMINIO[o.dominio - 1], kind: 'registrada', tipo: 'Cualitativa ordinal', nivel: 'Ordinal', fuente: 'Autoevaluación', how: 'Básico < Intermedio < Avanzado: hay orden, pero no sabemos si la distancia entre niveles es igual. Además es una percepción, no una prueba de dominio.' },
      casos: { x: 'x₆', name: 'Análisis de casos (rúbrica)', short: 'Casos', value: `${o.casos.toFixed(1)} / 10`, raw: o.casos.toFixed(1), kind: 'observable', tipo: 'Cuantitativa (puntaje)', nivel: 'Intervalo (por convención)', fuente: 'Rúbrica aplicada al producto entregado', how: 'Se observa un producto con un instrumento explícito. Vale 30 % de la calificación según el programa. Es evidencia del aprendizaje, no el aprendizaje mismo.' },
      competencia: { x: 'θ', name: 'Competencia para integrar TIC/TAC', short: 'Competencia', value: 'no observable', raw: 'θ', kind: 'inferida', tipo: 'Constructo latente', nivel: 'Depende del modelo de medición', fuente: 'Inferencia a partir de varias evidencias', how: 'No se ve ni se registra: se infiere combinando evidencias (casos, carteles, ensayos, exposición). Se trabaja en la escena 4.' },
      final,
    };
  }

  showOnlineVar(k) {
    const m = this.onlineMeta()[k];
    this.focus = { obj: this.sources[k], t: 0 };
    this.detail({
      kicker: `${m.x} · ${KIND[m.kind].label}`,
      title: `${m.name}: ${m.value}`,
      rows: [['Fuente del dato', m.fuente], ['Tipo de variable', m.tipo], ['Nivel de medición', m.nivel]],
      text: m.how,
    });
  }

  loadOnline(st, silent = false) {
    Object.assign(this.online, {
      nombre: st.nombre, id: st.id, minutos: st.minutos_plataforma, foro: st.participaciones_foro, asistencia: st.asistencia_sincronica,
      modalidad: MODALIDADES.indexOf(st.modalidad_preferida) + 1, dominio: st.dominio_tic_codigo, casos: st.casos, carteles: st.carteles, ensayos: st.ensayos, exposicion: st.exposicion,
    });
    this.applyOnline();
    if (!silent) this.detail({ kicker: 'Estudiante ficticio', title: `${st.nombre} (${st.id})`, text: 'Datos simulados de data/students.json. Observa cómo cada dato aparece en la situación real, en su tarjeta y en el modelo.' });
  }

  applyOnline() {
    const o = this.online;
    const M = this.onlineMeta();
    this.drawLMS();
    this.drawVideo();
    this.bubbles.forEach((b, i) => { b.visible = i < Math.min(o.foro, 12); });
    this.forumLabel.setText(`Foro asincrónico: ${o.foro} mensajes`);
    this.modCard.setContent(`Prefiero comunicación: ${MODALIDADES[o.modalidad - 1]}`, { fontSize: 27 });
    this.domCard.setContent(`Mi dominio de TIC: ${DOMINIO[o.dominio - 1]}`, { fontSize: 27 });
    this.rubric.setContent(`Rúbrica\nAnálisis de casos\n${o.casos.toFixed(1)} / 10`, { fontSize: 34, color: '#0f172a', bg: '#f8fafc' });
    for (const k of this.onlineVars) {
      const m = M[k];
      this.chipsB[k].setContent(`${m.x} · ${m.short} = ${m.kind === 'inferida' ? '?' : m.value}`, { title: KIND[m.kind].label, titleColor: KIND[m.kind].color, border: KIND[m.kind].color, fontSize: 28 });
    }
    for (const L of this.links) L.line.material.color.set(KIND[M[L.k].kind].color);

    // Modelo matemático
    const rows = this.app.data.estudiantes.slice(0, 5).map((s) => [s.id, s.minutos_plataforma, s.participaciones_foro, s.asistencia_sincronica, s.modalidad_preferida.slice(0, 5), s.dominio_tic.slice(0, 5), s.casos]);
    let hi = rows.findIndex((r) => r[0] === o.id);
    const cur = [o.id, o.minutos, o.foro, o.asistencia, MODALIDADES[o.modalidad - 1].slice(0, 5), DOMINIO[o.dominio - 1].slice(0, 5), o.casos.toFixed(1)];
    if (hi < 0) { rows[4] = cur; hi = 4; } else rows[hi] = cur;
    this.modelBoard.setBlocks([
      { type: 'kicker', text: 'Modelo matemático', color: COLORS.dimension },
      { type: 'title', text: `E(${o.id}) = (${o.minutos}, ${o.foro}, ${o.asistencia}, ${MODALIDADES[o.modalidad - 1]}, ${DOMINIO[o.dominio - 1]}, ${o.casos.toFixed(1)})` },
      { type: 'table', head: ['id', 'x₁ min', 'x₂ foro', 'x₃ asist', 'x₄ mod', 'x₅ TIC', 'x₆ casos'], rows, highlight: hi,
        headColors: [COLORS.muted, COLORS.registered, COLORS.registered, COLORS.registered, COLORS.registered, COLORS.registered, COLORS.observable] },
      { type: 'heading', text: 'Calificación (programa PD156)', color: COLORS.indicator },
      { type: 'p', text: `C = 0.30·casos + 0.20·carteles + 0.25·ensayos + 0.25·exposición = ${M.final.toFixed(2)}` },
    ]);

    // Punto en el mini sistema de ejes (normalizado con los datos ficticios)
    const all = this.app.data.estudiantes;
    const nrm = (v, key) => { const vals = all.map((s) => s[key]); const mn = Math.min(...vals), mx = Math.max(...vals); return THREE.MathUtils.clamp((v - mn) / (mx - mn), 0, 1) * 0.42; };
    const p = new THREE.Vector3(nrm(o.minutos, 'minutos_plataforma'), nrm(o.foro, 'participaciones_foro'), nrm(o.casos, 'casos'));
    this.miniPt.position.copy(p);
    this.miniLines.geometry.dispose();
    this.miniLines.geometry = new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(p.x, 0, p.z), p, new THREE.Vector3(0, p.y, p.z), p, new THREE.Vector3(p.x, p.y, 0)]);
    this.miniLines.computeLineDistances();
  }

  drawLMS() {
    const o = this.online;
    const c = this.lmsCanvas.getContext('2d');
    const W = 1024, H = 600;
    c.fillStyle = '#f1f5f9'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1e3a8a'; c.fillRect(0, 0, W, 70);
    c.fillStyle = '#fff'; c.font = `700 30px ${FONT}`; c.textBaseline = 'middle';
    c.fillText('Plataforma de teleformación', 24, 35);
    c.font = `500 22px ${FONT}`; c.textAlign = 'right';
    c.fillText(`${o.nombre} · ${o.id}`, W - 24, 35); c.textAlign = 'left';
    c.fillStyle = '#e2e8f0'; c.fillRect(0, 70, 250, H - 70);
    c.fillStyle = '#0f172a'; c.font = `600 21px ${FONT}`;
    ['Inicio', 'Unidad 1 · TIC y TAC', 'Unidad 2 · Comunicación', 'Unidad 3 · Educación a distancia', 'Foro', 'Videollamada', 'Entregas'].forEach((t, i) => {
      if (i === 3) { c.fillStyle = '#bfdbfe'; c.fillRect(0, 92 + i * 52, 250, 46); c.fillStyle = '#0f172a'; }
      c.fillText(wrapShort(c, t, 230), 16, 115 + i * 52);
    });
    c.fillStyle = '#0f172a'; c.font = `700 28px ${FONT}`;
    c.fillText('Innovación y Tecnología Educativa', 280, 110);
    c.font = `500 22px ${FONT}`; c.fillStyle = '#334155';
    c.fillText('3.1 Plataformas de teleformación · 3.3 Recursos multimedia', 280, 148);
    // Indicadores de actividad registrados
    const box = (x, y, label, val, col) => {
      c.fillStyle = '#fff'; c.fillRect(x, y, 220, 120); c.strokeStyle = col; c.lineWidth = 4; c.strokeRect(x, y, 220, 120);
      c.fillStyle = '#475569'; c.font = `600 19px ${FONT}`; c.fillText(label, x + 14, y + 28);
      c.fillStyle = '#0f172a'; c.font = `800 44px ${FONT}`; c.fillText(val, x + 14, y + 80);
    };
    box(280, 190, 'Tiempo conectado', `${o.minutos} min`, '#2563eb');
    box(520, 190, 'Mensajes en foro', `${o.foro}`, '#2563eb');
    box(760, 190, 'Sesiones en vivo', `${o.asistencia}/8`, '#2563eb');
    c.fillStyle = '#fff'; c.fillRect(280, 340, 700, 220);
    c.fillStyle = '#0f172a'; c.font = `700 22px ${FONT}`; c.fillText('Foro · Mitos y ventajas de la educación a distancia', 300, 372);
    c.font = `500 19px ${FONT}`; c.fillStyle = '#334155';
    ['Re: La flexibilidad horaria favorece a quien trabaja…', 'Re: Sin interacción sincrónica se pierde retroalimentación…', 'Re: Propongo un cartel digital para comparar plataformas…'].forEach((t, i) => c.fillText(t, 300, 412 + i * 40));
    c.fillStyle = '#16a34a'; c.font = `700 19px ${FONT}`; c.fillText(`Entrega «Análisis de casos»: calificada ${o.casos.toFixed(1)}`, 300, 535);
    this.lmsTex.needsUpdate = true;
  }

  drawVideo() {
    const o = this.online;
    const c = this.videoCanvas.getContext('2d');
    c.fillStyle = '#0b1220'; c.fillRect(0, 0, 560, 420);
    c.fillStyle = '#e2e8f0'; c.font = `700 24px ${FONT}`; c.textBaseline = 'middle';
    c.fillText('Sesión sincrónica · en vivo', 18, 26);
    c.fillStyle = '#ef4444'; c.beginPath(); c.arc(530, 26, 9, 0, 7); c.fill();
    const cols = ['#1d4ed8', '#7c3aed', '#0f766e', '#b45309', '#be185d', '#334155'];
    const ini = ['Prof', o.nombre.slice(0, 2), 'MR', 'JL', 'AS', 'DK'];
    for (let i = 0; i < 6; i++) {
      const x = 14 + (i % 3) * 180, y = 52 + Math.floor(i / 3) * 140;
      c.fillStyle = cols[i]; c.fillRect(x, y, 170, 130);
      if (i === 1) { c.strokeStyle = '#facc15'; c.lineWidth = 5; c.strokeRect(x + 2, y + 2, 166, 126); }
      c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.fillText(ini[i], x + 85, y + 65); c.textAlign = 'left';
    }
    c.fillStyle = '#e2e8f0'; c.font = `600 22px ${FONT}`;
    c.fillText(`Asistencia de ${o.nombre}: ${o.asistencia} de 8 sesiones`, 18, 398);
    this.videoTex.needsUpdate = true;
  }

  setStage(n, instant = false) {
    this.stage = n;
    const from = { s: this.real.scale.x, x: this.real.position.x, z: this.real.position.z, r: this.real.rotation.y, chip: this.chipCol.scale.x, mb: this.modelBoard.group.scale.x, mini: this.mini.scale.x };
    const to = n === 3
      ? { s: 0.55, x: -1.15, z: 0.15, r: 0.45, chip: 0.001, mb: 1, mini: 1 }
      : { s: 1, x: 0, z: 0, r: 0, chip: n === 2 ? 1 : 0.001, mb: 0.001, mini: 0.001 };
    this.linkTarget = n === 2 ? 0.85 : 0;
    const apply = (k) => {
      const L = (a, b) => a + (b - a) * k;
      this.real.scale.setScalar(L(from.s, to.s));
      this.real.position.set(L(from.x, to.x), 0, L(from.z, to.z));
      this.real.rotation.y = L(from.r, to.r);
      this.chipCol.scale.setScalar(L(from.chip, to.chip));
      this.modelBoard.group.scale.setScalar(L(from.mb, to.mb));
      this.mini.scale.setScalar(L(from.mini, to.mini));
      this.chipCol.visible = this.chipCol.scale.x > 0.01;
      this.modelBoard.group.visible = this.modelBoard.group.scale.x > 0.01;
      this.mini.visible = this.mini.scale.x > 0.01;
    };
    if (instant) apply(1);
    else {
      if (this._stageTween) this._stageTween.cancel = true;
      this._stageTween = this.app.tween(0.8, (k) => apply(k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2));
    }
    const txt = { 1: 'Paso ① · Lo real: una situación de aprendizaje en línea', 2: 'Paso ② · Variables: cada elemento produce un dato', 3: 'Paso ③ · Modelo matemático: vector, matriz y regla de ponderación' }[n];
    this.stepLabel.setText(txt);
  }

  // =========================================================================
  // Figura 1B · Persona (maniquí, estadímetro, báscula, expediente)
  // =========================================================================
  buildPerson() {
    const R = this.personGroup;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 48), BaseScene.mat('#ffffff', { roughness: 0.6 }));
    base.position.y = 0.04; base.receiveShadow = true; base.castShadow = true;
    R.add(base);

    this.scaleObj = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.4), BaseScene.mat('#e2e8f0', { roughness: 0.3 }));
    const stp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.36), BaseScene.mat('#334155', { roughness: 0.8 }));
    stp.position.y = 0.031;
    this.scaleObj.add(sb, stp);
    this.scaleObj.position.set(0, 0.105, 0);
    BaseScene.shadow(this.scaleObj, true, true);
    R.add(this.scaleObj);
    this.scaleDisplay = makeCard('', { width: 0.32, height: 0.15, fontSize: 46, title: 'Báscula', titleColor: COLORS.observable, border: COLORS.observable });
    this.scaleDisplay.position.set(0, 0.22, 0.34);
    this.scaleDisplay.rotation.x = -0.35;
    R.add(this.scaleDisplay);
    this.reg(this.scaleDisplay, { onSelect: () => this.showPersonVar('peso') });

    this.figure = buildMannequin('standing');
    this.figure.position.y = 0.13;
    R.add(this.figure);
    this.reg(this.figure, { onSelect: () => this.detail({ kicker: 'Modelo humano', title: 'Lo que se ve no es todo lo que se mide', text: ['El maniquí cambia de tamaño con la estatura medida, pero no con la edad ni con el peso: esas características no se pueden deducir con certeza de la apariencia.', 'Selecciona una tarjeta de variable para ver cómo se obtiene cada dato.'] }) });

    this.stadio = buildStadiometer();
    this.stadio.position.set(0.36, 0.13, -0.18);
    R.add(this.stadio);
    this.headBar = new THREE.Group();
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.09), BaseScene.mat('#38bdf8', { emissive: '#0369a1', emissiveIntensity: 0.4 }));
    hb.position.x = -0.16; hb.castShadow = true;
    this.headBar.add(hb);
    this.stadio.add(this.headBar);
    this.heightLabel = makeLabel('', { height: 0.05, border: COLORS.observable, color: '#d1fae5' });
    this.heightLabel.position.set(0.16, 0, 0);
    this.headBar.add(this.heightLabel);
    this.reg(this.stadio, { onSelect: () => this.showPersonVar('estatura') });
    this.headY = 1.7;

    this.record = new Board({ width: 0.72, ppm: 820, maxHeight: 0.9, border: COLORS.registered });
    this.record.group.position.set(-1.05, 1.62, 0.15);
    this.record.group.rotation.y = 0.42;
    R.add(this.record.group);
    this.reg(this.record.mesh, { onSelect: () => this.showPersonVar('edad') });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 10), BaseScene.mat('#64748b', { metalness: 0.6 }));
    stand.position.set(-1.05, 0.62, 0.12);
    R.add(BaseScene.shadow(stand));

    this.chipsA = {};
    ['estatura', 'peso', 'edad', 'hermanos', 'nivel', 'comprension'].forEach((k, i) => {
      const card = makeCard('', { width: 0.66, height: 0.15, fontSize: 34 });
      card.position.set(1.12, 1.82 - i * 0.19, 0.1);
      card.rotation.y = -0.42;
      R.add(card);
      this.reg(card, { onSelect: () => this.showPersonVar(k), onHover: (on) => card.scale.setScalar(on ? 1.06 : 1) });
      this.chipsA[k] = card;
    });

    const sign = makeCard('El aspecto del modelo NO cambia con la edad ni con el peso: no se pueden deducir con certeza de la apariencia.', { width: 1.25, height: 0.2, fontSize: 30, border: COLORS.indicator, title: 'Atención', titleColor: COLORS.indicator });
    sign.position.set(0, 0.012, 0.98);
    sign.rotation.x = -Math.PI / 2;
    sign.visible = false;
    R.add(sign);
    this.applyPerson(true);
  }

  personMeta() {
    const s = this.person;
    return {
      estatura: { name: 'Estatura', value: `${s.estatura} cm`, kind: 'observable', tipo: 'Cuantitativa continua', nivel: 'Razón', unidad: 'centímetros', how: 'Se mide con un estadímetro. A simple vista solo puede estimarse de forma aproximada.' },
      peso: { name: 'Peso', value: `${(+s.peso).toFixed(1)} kg`, kind: 'observable', tipo: 'Cuantitativa continua', nivel: 'Razón', unidad: 'kilogramos', how: 'Se mide con una báscula. La complexión visual no permite conocer el peso con certeza; por eso el modelo no cambia de forma.' },
      edad: { name: 'Edad', value: `${s.edad} años`, kind: 'registrada', tipo: 'Cuantitativa (continua en principio; se registra en años cumplidos)', nivel: 'Razón', unidad: 'años cumplidos', how: 'Se consulta en un documento o se pregunta. La apariencia no permite conocerla con certeza.' },
      hermanos: { name: 'Número de hermanos', value: String(s.hermanos), kind: 'registrada', tipo: 'Cuantitativa discreta', nivel: 'Razón', unidad: 'personas', how: 'Se obtiene por autorreporte o registro. Solo admite valores enteros.' },
      nivel: { name: 'Nivel educativo', value: NIVELES[s.nivel - 1], kind: 'registrada', tipo: 'Cualitativa ordinal', nivel: 'Ordinal', unidad: '— (categorías ordenadas)', how: 'Las categorías tienen orden, pero la distancia entre niveles no es igual ni conocida.' },
      comprension: { name: 'Comprensión estadística', value: 'no observable', kind: 'inferida', tipo: 'Constructo latente', nivel: 'Depende del instrumento', unidad: 'puntuación estimada', how: 'Se infiere a partir de respuestas a tareas (indicadores). Ver escena 4.' },
    };
  }

  showPersonVar(k) {
    const m = this.personMeta()[k];
    this.focus = { obj: { estatura: this.stadio, peso: this.scaleObj, edad: this.record.group, hermanos: this.record.group, nivel: this.record.group, comprension: this.chipsA.comprension }[k], t: 0 };
    this.detail({ kicker: KIND[m.kind].label, title: `${m.name}: ${m.value}`, rows: [['Origen del dato', KIND[m.kind].label], ['Tipo de variable', m.tipo], ['Nivel de medición', m.nivel], ['Unidad', m.unidad]], text: m.how });
  }

  applyPerson(instant = false) {
    const s = this.person;
    this.targetScale = s.estatura / 170;
    if (instant) this.figure.scale.setScalar(this.targetScale);
    this.headY = s.estatura / 100;
    if (instant) this.headBar.position.y = this.headY;
    this.heightLabel.setText(`${s.estatura} cm`);
    this.scaleDisplay.setContent(`${(+s.peso).toFixed(1)} kg`, { fontSize: 44 });
    this.record.setBlocks([
      { type: 'kicker', text: 'Expediente ficticio · datos registrados', color: COLORS.registered },
      { type: 'rows', rows: [['Edad', `${s.edad} años`], ['Número de hermanos', s.hermanos], ['Nivel educativo', NIVELES[s.nivel - 1]]] },
      { type: 'p', text: 'Fuente: documento oficial y autorreporte. No se deducen de la apariencia.', color: COLORS.muted },
    ]);
    const m = this.personMeta();
    for (const [key, card] of Object.entries(this.chipsA)) {
      const v = m[key];
      card.setContent(`${v.name}: ${v.value}`, { title: KIND[v.kind].label, titleColor: KIND[v.kind].color, border: KIND[v.kind].color, fontSize: 30 });
    }
  }

  // =========================================================================
  setFigure(f, instant = false) {
    this.fig = f;
    this.onlineGroup.visible = f === 'online';
    this.personGroup.visible = f === 'person';
    if (f === 'online') this.setStage(this.stage, true);
    this.detail(null);
  }

  answer(opt) {
    const Q = this.fig === 'online' ? QUIZ_ONLINE : QUIZ_PERSON;
    const st = this.quiz[this.fig];
    if (st.ans) return;
    st.ans = opt;
    const item = Q[st.i];
    const ok = opt === item.a;
    if (ok) st.score++;
    this.detail({ state: ok ? 'ok' : 'bad', kicker: ok ? '¡Correcto!' : 'Revisa esta idea', title: `Respuesta: ${KIND[item.a].label}`, text: item.why });
  }

  nextQ() {
    const Q = this.fig === 'online' ? QUIZ_ONLINE : QUIZ_PERSON;
    const st = this.quiz[this.fig];
    if (st.i < Q.length - 1) st.i++; else { st.i = 0; st.score = 0; }
    st.ans = null;
    this.detail(null);
  }

  // ---------- Secuencia didáctica (versión de diseño instruccional) ----------
  getGuide() {
    const Q = this.fig === 'online' ? QUIZ_ONLINE : QUIZ_PERSON;
    const qs = this.quiz.online;
    const item = QUIZ_ONLINE[qs.i];
    const opt = (key, label) => ({ label, onClick: () => this.answer(key), state: qs.ans ? (key === item.a ? 'ok' : key === qs.ans ? 'bad' : undefined) : undefined });
    const p = this.person;
    const setP = (k) => (v) => { p[k] = v; this.applyPerson(); };
    return {
      objective: 'Reconocer que una variable es una característica que decidimos registrar.',
      idea: 'Una variable no está «en» la realidad: aparece cuando decidimos qué característica registrar, con qué instrumento y en qué escala. Algunas se miden, otras se registran y otras solo se infieren.',
      steps: [
        { title: 'Observa la situación', icon: 'eye', prompt: 'Una estudiante toma su curso en línea. ¿Qué datos podrías registrar de lo que ves?',
          enter: () => { if (this.fig !== 'online') this.setFigure('online'); this.setStage(1); } },
        { title: 'Descubre las variables', icon: 'hand', prompt: 'Cada objeto produce un dato. Toca una tarjeta para ver de dónde sale.',
          enter: () => { if (this.fig !== 'online') this.setFigure('online'); this.setStage(2); },
          actions: [{ type: 'buttons', items: ['minutos', 'foro', 'casos', 'competencia'].map((k) => ({ label: { minutos: 'x₁ Minutos', foro: 'x₂ Foro', casos: 'x₆ Rúbrica', competencia: 'θ Competencia' }[k], onClick: () => this.showOnlineVar(k) })) }] },
        { title: 'Del caso al modelo', icon: 'cube', prompt: 'La estudiante se convierte en una fila de datos: un vector. Muchas filas forman una matriz.',
          enter: () => { if (this.fig !== 'online') this.setFigure('online'); this.setStage(3); },
          actions: [{ label: 'Otra estudiante', icon: 'shuffle', onClick: () => { const L = this.app.data.estudiantes; this.loadOnline(L[Math.floor(Math.random() * L.length)], true); } },
            { type: 'range', label: 'x₆ Rúbrica', min: 0, max: 10, step: 0.1, vrStep: 0.5, value: this.online.casos, format: (v) => (+v).toFixed(1), onInput: (v) => { this.online.casos = v; this.applyOnline(); } }] },
        { title: 'Comprueba', icon: 'check', prompt: `Pregunta ${qs.i + 1} de ${QUIZ_ONLINE.length}: ¿cómo se obtiene este dato?`,
          enter: () => { if (this.fig !== 'online') this.setFigure('online'); this.setStage(2); },
          actions: [
            { type: 'question', text: `«${item.q}»` },
            { type: 'buttons', items: [opt('observable', 'Se observa con instrumento'), opt('registrada', 'Se registra'), opt('inferida', 'Se infiere')] },
            qs.ans ? { label: qs.i < QUIZ_ONLINE.length - 1 ? 'Otra pregunta' : 'Reiniciar', primary: true, onClick: () => { this.fig = 'online'; this.nextQ(); } } : null,
          ] },
        { title: 'Compara con una persona', icon: 'scale', prompt: 'Cambia la estatura y el peso. ¿Qué cambia en el modelo y qué no?',
          enter: () => this.setFigure('person'),
          actions: [
            { type: 'range', label: 'Estatura', min: 140, max: 200, step: 1, vrStep: 3, value: p.estatura, format: (v) => `${v} cm`, onInput: setP('estatura') },
            { type: 'range', label: 'Peso', min: 40, max: 130, step: 0.5, vrStep: 3, value: p.peso, format: (v) => `${(+v).toFixed(0)} kg`, onInput: setP('peso') },
            { label: '¿Por qué no cambia con el peso?', onClick: () => this.showPersonVar('peso') },
          ] },
      ],
    };
  }

  getControls() {
    const c = [
      { type: 'heading', label: 'Figura' },
      { type: 'buttons', items: [
        { label: '1A · De lo real al modelo', vrLabel: '1A Real→modelo', active: this.fig === 'online', onClick: () => this.setFigure('online') },
        { label: '1B · Persona', vrLabel: '1B Persona', active: this.fig === 'person', onClick: () => this.setFigure('person') },
      ] },
    ];
    if (this.fig === 'online') {
      const o = this.online;
      const set = (k) => (v) => { o[k] = v; this.applyOnline(); };
      c.push(
        { type: 'heading', label: 'Pasos' },
        { type: 'buttons', items: [1, 2, 3].map((n) => ({ label: ['① Lo real', '② Variables', '③ Modelo'][n - 1], active: this.stage === n, onClick: () => this.setStage(n) })) },
        { type: 'heading', label: 'Datos del estudiante (ficticios)' },
        { type: 'range', label: 'x₁ Minutos en plataforma', min: 0, max: 600, step: 5, vrStep: 20, value: o.minutos, format: (v) => `${v} min`, onInput: set('minutos') },
        { type: 'range', label: 'x₂ Mensajes en el foro', min: 0, max: 20, step: 1, value: o.foro, onInput: set('foro') },
        { type: 'range', label: 'x₃ Sesiones sincrónicas', min: 0, max: 8, step: 1, value: o.asistencia, format: (v) => `${v} de 8`, onInput: set('asistencia') },
        { type: 'select', label: 'x₄ Modalidad preferida', value: o.modalidad, options: MODALIDADES.map((m, i) => ({ value: i + 1, label: m })), onChange: (v) => { o.modalidad = +v; this.applyOnline(); } },
        { type: 'select', label: 'x₅ Dominio de TIC', value: o.dominio, options: DOMINIO.map((m, i) => ({ value: i + 1, label: m })), onChange: (v) => { o.dominio = +v; this.applyOnline(); } },
        { type: 'range', label: 'x₆ Análisis de casos', min: 0, max: 10, step: 0.1, vrStep: 0.5, value: o.casos, format: (v) => `${(+v).toFixed(1)}`, onInput: set('casos') },
        { type: 'button', label: 'Cargar estudiante ficticio aleatorio', onClick: () => { const L = this.app.data.estudiantes; this.loadOnline(L[Math.floor(Math.random() * L.length)]); } },
      );
    } else {
      const s = this.person;
      const set = (k) => (v) => { s[k] = v; this.applyPerson(); };
      c.push(
        { type: 'heading', label: 'Características simuladas' },
        { type: 'range', label: 'Estatura', min: 140, max: 200, step: 1, vrStep: 2, value: s.estatura, format: (v) => `${v} cm`, onInput: set('estatura') },
        { type: 'range', label: 'Peso', min: 40, max: 130, step: 0.5, vrStep: 2, value: s.peso, format: (v) => `${(+v).toFixed(1)} kg`, onInput: set('peso') },
        { type: 'range', label: 'Edad', min: 15, max: 70, step: 1, value: s.edad, format: (v) => `${v} años`, onInput: set('edad') },
        { type: 'range', label: 'Número de hermanos', min: 0, max: 10, step: 1, value: s.hermanos, onInput: set('hermanos') },
        { type: 'select', label: 'Nivel educativo', value: s.nivel, options: NIVELES.map((n, i) => ({ value: i + 1, label: n })), onChange: (v) => { s.nivel = +v; this.applyPerson(); } },
        { type: 'button', label: 'Cargar perfil ficticio aleatorio', onClick: () => { const L = this.app.data.estudiantes; const st = L[Math.floor(Math.random() * L.length)]; Object.assign(s, { estatura: Math.round(st.estatura_cm), edad: st.edad, peso: st.peso_kg, hermanos: st.hermanos, nivel: st.nivel_educativo_codigo }); this.applyPerson(); } },
      );
    }
    const Q = this.fig === 'online' ? QUIZ_ONLINE : QUIZ_PERSON;
    const st = this.quiz[this.fig];
    const item = Q[st.i];
    const opt = (key, label) => ({ type: 'button', label, onClick: () => this.answer(key), state: st.ans ? (key === item.a ? 'ok' : key === st.ans ? 'bad' : undefined) : undefined });
    c.push(
      { type: 'heading', label: `Pregunta ${st.i + 1} de ${Q.length} · aciertos: ${st.score}` },
      { type: 'text', text: `¿Cómo se obtiene este dato? «${item.q}»` },
      opt('observable', 'Observable con instrumento'),
      opt('registrada', 'Registrada (bitácora, documento o autorreporte)'),
      opt('inferida', 'Inferida (no observable directamente)'),
      st.ans ? { type: 'button', label: st.i < Q.length - 1 ? 'Siguiente pregunta →' : 'Reiniciar preguntas', onClick: () => this.nextQ() } : null,
    );
    return c;
  }

  getInfo() {
    const legend = [
      { label: 'Observable con instrumento', color: COLORS.observable },
      { label: 'Registrada', color: COLORS.registered },
      { label: 'Inferida', color: COLORS.inferred },
    ];
    if (this.fig === 'person') {
      return {
        kicker: 'Momento 1 · Figura 1B', title: 'Persona: medir, registrar o inferir', legend,
        paragraphs: [
          'La estatura cambia el tamaño del modelo y la lectura del estadímetro; el peso solo cambia la lectura de la báscula; la edad, los hermanos y el nivel educativo solo cambian el expediente.',
          'Selecciona las tarjetas de la derecha para ver el tipo de variable, su nivel de medición y cómo se obtiene.',
        ],
        notes: ['La edad, el peso o el aprendizaje no deben inferirse de la apariencia física: hacerlo produce datos sesgados y puede reforzar estereotipos.'],
      };
    }
    const p = {
      1: ['Observa la situación: un estudiante del curso Innovación y Tecnología Educativa trabaja en una plataforma de teleformación, participa en un foro asincrónico, asiste a sesiones sincrónicas y entrega un análisis de casos.',
        'Todavía no hay variables: hay hechos. Una variable aparece cuando decidimos qué característica registrar, con qué instrumento y en qué escala. Pasa al paso ②.'],
      2: ['Cada elemento de la situación produce un dato: la bitácora de la plataforma (x₁), el foro (x₂), la lista de la videollamada (x₃), los autorreportes (x₄, x₅) y la rúbrica (x₆).',
        'La competencia para integrar TIC/TAC (θ) no tiene una fuente directa: se infiere. Selecciona una tarjeta o un objeto para ver su tipo y su fuente.'],
      3: ['El estudiante queda representado por un vector de valores. Con n estudiantes se forma una matriz de datos: filas = casos, columnas = variables.',
        'Cada columna podrá usarse como eje en la escena 2 (dimensión de representación). La calificación es un modelo de ponderación; el aprendizaje sigue siendo latente y se aborda en la escena 4.'],
    }[this.stage];
    return {
      kicker: `Momento 1 · Figura 1A · Paso ${this.stage} de 3`, title: 'De lo real al modelo matemático', legend,
      paragraphs: p,
      notes: ['Un dato registrado con precisión (p. ej., minutos conectados) puede ser un indicador débil del aprendizaje: precisión del registro no es validez de la interpretación.'],
    };
  }

  enter() { if (this.fig === 'online') this.applyOnline(); else this.applyPerson(true); }

  update(dt, t) {
    const f = 1 - Math.exp(-dt * 6);
    if (this.personGroup.visible) {
      this.figure.scale.setScalar(THREE.MathUtils.lerp(this.figure.scale.x, this.targetScale, f));
      this.headBar.position.y = THREE.MathUtils.lerp(this.headBar.position.y, this.headY, f);
      this.figure.userData.torso.scale.set(1 + Math.sin(t * 1.6) * 0.008, 1, 1 + Math.sin(t * 1.6) * 0.012);
      this.figure.rotation.y = Math.sin(t * 0.35) * 0.08;
    }
    if (this.onlineGroup.visible) {
      this.student.userData.torso.scale.set(1 + Math.sin(t * 1.6) * 0.008, 1, 1 + Math.sin(t * 1.6) * 0.012);
      this.bubbles.forEach((b, i) => { b.position.y = 0.42 - Math.floor(i / 3) * 0.12 + Math.sin(t * 1.5 + i) * 0.008; });
      this.cloud.position.y = 1.42 + Math.sin(t * 0.9) * 0.02;
      this.cloud.children.forEach((s, i) => { if (s.material) s.material.opacity = 0.22 + 0.08 * Math.sin(t * 1.3 + i); });
      // Conectores objeto → tarjeta (solo en el paso ②)
      const tmpA = this._a || (this._a = new THREE.Vector3()), tmpB = this._b || (this._b = new THREE.Vector3());
      for (const L of this.links) {
        const m = L.line.material;
        m.opacity = THREE.MathUtils.lerp(m.opacity, this.linkTarget ?? 0, f);
        L.line.visible = m.opacity > 0.02;
        if (!L.line.visible) continue;
        this.sources[L.k].getWorldPosition(tmpA);
        L.card.getWorldPosition(tmpB);
        tmpB.x -= 0.3 * this.chipCol.scale.x;
        this.onlineGroup.worldToLocal(tmpA); this.onlineGroup.worldToLocal(tmpB);
        const pos = L.line.geometry.attributes.position;
        pos.setXYZ(0, tmpA.x, tmpA.y, tmpA.z); pos.setXYZ(1, tmpB.x, tmpB.y, tmpB.z);
        pos.needsUpdate = true;
      }
      this.miniPt.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    }
    if (this.focus) {
      this.focus.t += dt;
      const on = this.focus.t < 1.6;
      const amp = on ? 0.5 + 0.5 * Math.sin(this.focus.t * 10) : 0;
      let hasEm = false;
      this.focus.obj.traverse((m) => {
        if (m.material && m.material.emissive) {
          hasEm = true;
          if (m.userData._baseEm === undefined) { m.userData._baseEm = m.material.emissive.clone(); m.userData._baseEi = m.material.emissiveIntensity; }
          if (on) { m.material.emissive.set('#34d399'); m.material.emissiveIntensity = amp * 0.6; }
          else { m.material.emissive.copy(m.userData._baseEm); m.material.emissiveIntensity = m.userData._baseEi; }
        }
      });
      if (!hasEm) {
        const o = this.focus.obj;
        o.userData._baseS = o.userData._baseS ?? o.scale.x;
        o.scale.setScalar(on ? o.userData._baseS * (1 + amp * 0.05) : o.userData._baseS);
      }
      if (!on) this.focus = null;
    }
  }
}

function wrapShort(ctx, t, w) { return wrapText(ctx, t, w)[0]; }

// ---------------------------------------------------------------------------
// Maniquí educativo procedimental (1,70 m de referencia, pies en y = 0).
// pose: 'standing' (de pie, postura en A) o 'seated' (sentado, manos al teclado).
function buildMannequin(pose = 'standing') {
  const g = new THREE.Group();
  const seated = pose === 'seated';
  const dy = seated ? 0.42 : 0;           // descenso del tronco al sentarse
  const skin = new THREE.MeshStandardMaterial({ color: '#cfdcec', roughness: 0.42, metalness: 0.05 });
  const joint = new THREE.MeshStandardMaterial({ color: '#8fa6c6', roughness: 0.5, metalness: 0.1 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#3b6fb6', roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: '#2b3a55', roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.6 });
  const Y = new THREE.Vector3(0, 1, 0);
  const limb = (a, b, r, mat) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, dir.length() - r * 0.6), 6, 14), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(Y, dir.normalize());
    g.add(m); return m;
  };
  const ball = (p, r, mat, s = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat); m.position.set(...p); m.scale.set(...s); g.add(m); return m; };

  const prof = [[0.0, 0.84], [0.135, 0.86], [0.165, 0.93], [0.16, 1.0], [0.145, 1.08], [0.15, 1.17], [0.172, 1.27], [0.185, 1.35], [0.165, 1.41], [0.09, 1.45], [0.0, 1.46]].map(([r, y]) => new THREE.Vector2(r, y - dy));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), shirt);
  torso.scale.z = 0.62;
  g.add(torso);
  g.userData.torso = torso;
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), pants);
  hip.position.y = 0.92 - dy; hip.scale.set(1.02, 0.75, 0.66);
  g.add(hip);

  limb([0, 1.42 - dy, 0], [0, 1.5 - dy, 0.005], 0.045, skin);
  ball([0, 1.6 - dy, 0.01], 0.1, skin, [0.88, 1.12, 0.98]);
  ball([0, 1.575 - dy, 0.098], 0.016, skin, [0.8, 1.2, 1]);
  ball([-0.096, 1.6 - dy, 0.0], 0.022, skin, [0.5, 1, 0.8]);
  ball([0.096, 1.6 - dy, 0.0], 0.022, skin, [0.5, 1, 0.8]);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 }));
  hair.position.set(0, 1.615 - dy, 0.0); hair.scale.set(0.9, 1.1, 1.02); hair.rotation.x = -0.25;
  g.add(hair);

  for (const s of [-1, 1]) {
    ball([s * 0.19, 1.37 - dy, 0], 0.052, shirt);
    if (seated) {
      // Brazos hacia el teclado
      limb([s * 0.2, 1.36 - dy, 0], [s * 0.23, 0.7, 0.1], 0.044, shirt);
      ball([s * 0.23, 0.7, 0.1], 0.038, joint);
      limb([s * 0.23, 0.7, 0.1], [s * 0.15, 0.78, 0.36], 0.034, skin);
      ball([s * 0.14, 0.785, 0.41], 0.04, skin, [0.9, 0.5, 1.4]);
      // Piernas flexionadas
      limb([s * 0.085, 0.47, 0], [s * 0.095, 0.48, 0.42], 0.066, pants);
      ball([s * 0.095, 0.48, 0.42], 0.05, joint);
      limb([s * 0.095, 0.48, 0.42], [s * 0.1, 0.1, 0.44], 0.05, pants);
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.13, 4, 10), shoe);
      foot.rotation.x = Math.PI / 2; foot.position.set(s * 0.1, 0.045, 0.49); foot.scale.set(1, 1, 0.75);
      g.add(foot);
    } else {
      limb([s * 0.2, 1.36, 0], [s * 0.245, 1.09, -0.01], 0.044, shirt);
      ball([s * 0.245, 1.09, -0.01], 0.038, joint);
      limb([s * 0.245, 1.09, -0.01], [s * 0.27, 0.85, 0.03], 0.034, skin);
      ball([s * 0.272, 0.79, 0.035], 0.04, skin, [0.6, 1.5, 0.9]);
      limb([s * 0.085, 0.88, 0], [s * 0.095, 0.49, 0.01], 0.066, pants);
      ball([s * 0.095, 0.49, 0.012], 0.05, joint);
      limb([s * 0.095, 0.49, 0.01], [s * 0.1, 0.1, -0.01], 0.05, pants);
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.13, 4, 10), shoe);
      foot.rotation.x = Math.PI / 2; foot.position.set(s * 0.1, 0.045, 0.045); foot.scale.set(1, 1, 0.75);
      g.add(foot);
    }
  }
  BaseScene.shadow(g);
  return g;
}

function buildStadiometer() {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 128; c.height = 2048;
  const x = c.getContext('2d');
  x.fillStyle = '#f8fafc'; x.fillRect(0, 0, 128, 2048);
  x.fillStyle = '#0f172a'; x.textAlign = 'right'; x.font = '600 30px "Segoe UI", Arial';
  for (let cm = 0; cm <= 210; cm++) {
    const y = 2048 - (cm / 210) * 2048;
    const w = cm % 10 === 0 ? 50 : cm % 5 === 0 ? 32 : 16;
    x.fillRect(0, y - 1, w, cm % 10 === 0 ? 3 : 2);
    if (cm % 10 === 0 && cm > 0 && cm < 210) x.fillText(String(cm), 124, y + 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const side = BaseScene.mat('#cbd5e1');
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.03), [side, side, side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), side]);
  pole.position.y = 1.05;
  pole.rotation.y = -0.6;
  g.add(pole);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), BaseScene.mat('#64748b', { metalness: 0.5 }));
  foot.position.y = 0.01;
  g.add(foot);
  BaseScene.shadow(g);
  return g;
}
