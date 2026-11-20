// Interfaz guiada (diseño instruccional).
// Cada escena expone getGuide(): { objective, idea, steps:[{ title, icon, prompt, enter(), actions:[...] }] }.
// Escritorio: barra de recorrido + tarjeta guía + tarjeta de detalle + «Idea clave» a demanda.
// Meta Quest: los mismos contenidos en dos tableros 3D (guía a la izquierda, detalle a la derecha).
import * as THREE from 'three';
import { Board } from './text.js';

const $ = (id) => document.getElementById(id);

const ICONS = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v7m0-5a1.5 1.5 0 0 1 3 0v6m0-3.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 16.5a1.6 1.6 0 0 1 2.4-2L8 16"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0z"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
  axes: '<path d="M4 20V4M4 20h16M4 20l9-9"/>',
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  nodes: '<circle cx="12" cy="5" r="3"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="9" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8l-7 8M12 8v8M12 8l7 8"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  vr: '<rect x="2" y="7" width="20" height="11" rx="3"/><circle cx="8" cy="12.5" r="2"/><circle cx="16" cy="12.5" r="2"/>',
};
export const icon = (name, size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.eye}</svg>`;

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  if (text !== undefined) e.textContent = text;
  return e;
}

export class UI {
  constructor(app) {
    this.app = app;
    this.detail = null;
    this.detailMore = false;
    this.show3D = false;
    this.ideaOpen = false;
    this.visited = new Set();
    this._vrPending = false;

    this.vrGroup = new THREE.Group();
    this.vrGroup.name = 'paneles-3d';
    this.vrGuide = new Board({ width: 0.78, ppm: 900, maxHeight: 1.6, interaction: app.interaction, owner: 'ui', anchorTop: true });
    this.vrInfo = new Board({ width: 0.9, ppm: 860, maxHeight: 1.3, interaction: app.interaction, owner: 'ui-info', anchorTop: true });
    this.vrGuide.group.position.set(-1.2, 1.95, -1.25);
    this.vrGuide.group.rotation.y = 0.6;
    this.vrInfo.group.position.set(1.25, 1.95, -1.25);
    this.vrInfo.group.rotation.y = -0.6;
    this.vrGroup.add(this.vrGuide.group, this.vrInfo.group);
    this.vrGroup.visible = false;
    app.scene.add(this.vrGroup);

    $('btn-idea').addEventListener('click', () => { this.ideaOpen = !this.ideaOpen; this.refresh(); });
    $('idea-close').addEventListener('click', () => { this.ideaOpen = false; this.refresh(); });
    $('btn-prev').addEventListener('click', () => this.step(-1));
    $('btn-next').addEventListener('click', () => this.step(1));
    $('detail-close').addEventListener('click', () => { this.detail = null; this.refresh(); });
    $('btn-3d').addEventListener('click', () => {
      this.show3D = !this.show3D;
      document.body.classList.toggle('mode-3dpanels', this.show3D);
      this.updateVisibility();
      if (this.show3D) app.setCameraPreset({ position: [0, 1.6, 1.2], target: [0, 1.4, -1.6] });
      else app.setCameraPreset(app.current.cameraPreset);
      this.refresh();
    });
    $('exit-3d').addEventListener('click', () => $('btn-3d').click());
    $('btn-camera').addEventListener('click', () => app.setCameraPreset(app.current.cameraPreset));
    $('welcome-start').addEventListener('click', () => { document.body.classList.remove('welcome'); });
  }

  // ---------- Navegación por pasos ----------
  guide() { return this.app.current.getGuide(); }
  stepIndex() { return this.app.current.stepIndex || 0; }

  enterStep() {
    const sc = this.app.current;
    const g = this.guide();
    sc.stepIndex = Math.min(this.stepIndex(), g.steps.length - 1);
    this.visited.add(`${this.app.currentIndex}:${sc.stepIndex}`);
    this.detail = null;
    this._safe(() => g.steps[sc.stepIndex].enter?.());
    this.refresh();
  }

  step(d) {
    const sc = this.app.current;
    const n = this.guide().steps.length;
    const i = this.stepIndex() + d;
    if (i >= n) { if (this.app.currentIndex < this.app.scenes.length - 1) this.app.goTo(this.app.currentIndex + 1); return; }
    if (i < 0) { if (this.app.currentIndex > 0) this.app.goTo(this.app.currentIndex - 1, false, 'last'); return; }
    sc.stepIndex = i;
    this.enterStep();
  }

  goStep(i) { this.app.current.stepIndex = i; this.enterStep(); }

  setDetail(d) { this.detail = d; this.detailMore = false; this.refresh(); }
  updateVisibility() { this.vrGroup.visible = this.app.renderer.xr.isPresenting || this.show3D; }

  refresh() {
    if (!this.app.current) return;
    this._renderJourney();
    this._renderGuide();
    this._renderDetail();
    this._renderIdea();
    this._renderVR();
  }

  scheduleVR() {
    if (this._vrPending) return;
    this._vrPending = true;
    requestAnimationFrame(() => { this._vrPending = false; if (this.app.current) this._renderVR(); });
  }

  _safe(fn) { try { fn(); } catch (e) { this.app.reportError(e); } }

  // ---------- Recorrido (arriba) ----------
  _renderJourney() {
    const nav = $('journey');
    nav.innerHTML = '';
    const icons = ['eye', 'axes', 'layers', 'nodes'];
    this.app.scenes.forEach((s, i) => {
      const steps = s.getGuide().steps.length;
      let seen = 0; for (let k = 0; k < steps; k++) if (this.visited.has(`${i}:${k}`)) seen++;
      const state = i === this.app.currentIndex ? 'current' : seen === steps ? 'done' : seen ? 'partial' : '';
      const b = el('button', { type: 'button', class: `stop ${state}`, title: s.title, onclick: () => this.app.goTo(i), html: `<span class="dot">${icon(icons[i], 18)}</span><span class="lbl">${i + 1}. ${s.short}</span>` });
      if (i === this.app.currentIndex) b.setAttribute('aria-current', 'step');
      nav.append(b);
      if (i < this.app.scenes.length - 1) nav.append(el('span', { class: `link ${i < this.app.currentIndex ? 'done' : ''}` }));
    });
  }

  // ---------- Tarjeta guía (abajo) ----------
  _renderGuide() {
    const g = this.guide();
    const i = this.stepIndex();
    const st = g.steps[i];
    $('objective').textContent = g.objective;
    const dots = $('step-dots');
    dots.innerHTML = '';
    g.steps.forEach((s, k) => {
      const d = el('button', { type: 'button', class: `sdot ${k === i ? 'on' : ''} ${k < i ? 'past' : ''}`, title: s.title, 'aria-label': `Paso ${k + 1}: ${s.title}`, onclick: () => this.goStep(k) });
      dots.append(d);
    });
    $('step-icon').innerHTML = icon(st.icon || 'eye', 26);
    $('step-count').textContent = `Paso ${i + 1} de ${g.steps.length}`;
    $('step-title').textContent = st.title;
    $('step-prompt').textContent = st.prompt;
    const last = i === g.steps.length - 1;
    const lastScene = this.app.currentIndex === this.app.scenes.length - 1;
    $('btn-next').innerHTML = last ? (lastScene ? 'Fin del recorrido' : 'Siguiente escena →') : 'Siguiente →';
    $('btn-next').disabled = last && lastScene;
    $('btn-prev').disabled = i === 0 && this.app.currentIndex === 0;
    $('btn-idea').classList.toggle('on', this.ideaOpen);
    $('btn-3d').classList.toggle('on', this.show3D);
    this._renderActions(st.actions || []);
  }

  _renderActions(actions) {
    const root = $('actions');
    root.innerHTML = '';
    root.hidden = !actions.filter(Boolean).length;
    for (const c of actions) {
      if (!c) continue;
      if (c.type === 'buttons') { const row = el('div', { class: 'act-group' }); c.items.forEach((it) => row.append(this._btn(it))); root.append(row); }
      else if (c.type === 'button' || !c.type) root.append(this._btn(c));
      else if (c.type === 'question') root.append(el('div', { class: 'act-question' }, c.text));
      else if (c.type === 'range') {
        const wrap = el('label', { class: 'act-range' });
        const val = el('b', {}, c.format ? c.format(c.value) : String(c.value));
        const inp = el('input', { type: 'range', min: c.min, max: c.max, step: c.step, 'aria-label': c.label });
        inp.value = c.value;
        inp.addEventListener('input', () => { const v = parseFloat(inp.value); this._safe(() => c.onInput(v)); val.textContent = c.format ? c.format(v) : String(v); this.scheduleVR(); });
        inp.addEventListener('change', () => this.refresh());
        wrap.append(el('span', {}, c.label), inp, val);
        root.append(wrap);
      } else if (c.type === 'select') {
        const wrap = el('label', { class: 'act-select' });
        const sel = el('select', { 'aria-label': c.label });
        for (const o of c.options) { const op = el('option', { value: o.value }, o.label); if (String(o.value) === String(c.value)) op.selected = true; sel.append(op); }
        sel.addEventListener('change', () => { this._safe(() => c.onChange(sel.value)); this.refresh(); });
        wrap.append(el('span', {}, c.label), sel);
        root.append(wrap);
      }
    }
  }

  _btn(c) {
    const cls = ['pill']; if (c.active) cls.push('active'); if (c.state) cls.push(c.state); if (c.primary) cls.push('primary');
    return el('button', { type: 'button', class: cls.join(' '), html: (c.icon ? icon(c.icon, 16) : '') + `<span>${escapeHTML(c.label)}</span>`, onclick: () => { this._safe(() => c.onClick()); this.refresh(); } });
  }

  // ---------- Detalle (tarjeta flotante) ----------
  _renderDetail() {
    const d = this.detail;
    const box = $('detail');
    box.hidden = !d;
    box.className = 'detail-card' + (d && d.state ? ' ' + d.state : '');
    if (!d) return;
    $('detail-kicker').textContent = d.kicker || '';
    $('detail-title').textContent = d.title || '';
    const body = $('detail-body');
    body.innerHTML = '';
    const rows = d.rows || [];
    if (rows.length) {
      const t = el('dl');
      rows.slice(0, this.detailMore ? rows.length : 4).forEach(([k, v]) => { t.append(el('dt', {}, k), el('dd', {}, String(v))); });
      body.append(t);
    }
    const texts = d.text ? [].concat(d.text).filter(Boolean) : [];
    texts.slice(0, this.detailMore ? texts.length : 1).forEach((p) => body.append(el('p', {}, p)));
    if (rows.length > 4 || texts.length > 1) {
      body.append(el('button', { type: 'button', class: 'more', onclick: () => { this.detailMore = !this.detailMore; this._renderDetail(); } }, this.detailMore ? 'Ver menos' : 'Ver más'));
    }
  }

  // ---------- Idea clave ----------
  _renderIdea() {
    const g = this.guide();
    $('idea').hidden = !this.ideaOpen;
    $('idea-text').textContent = g.idea;
  }

  // ---------- Tableros 3D ----------
  _renderVR() {
    const app = this.app;
    const g = this.guide();
    const i = this.stepIndex();
    const st = g.steps[i];
    const wrap = (fn) => () => { this._safe(fn); this.refresh(); };
    const blocks = [
      { type: 'buttons', items: app.scenes.map((s, k) => ({ label: `${k + 1}`, active: k === app.currentIndex, onClick: () => app.goTo(k) })) },
      { type: 'kicker', text: `${app.current.short} · paso ${i + 1} de ${g.steps.length}` },
      { type: 'title', text: st.title },
      { type: 'p', text: st.prompt },
    ];
    for (const c of st.actions || []) {
      if (!c) continue;
      if (c.type === 'question') blocks.push({ type: 'heading', text: c.text });
      else if (c.type === 'buttons') blocks.push({ type: 'buttons', items: c.items.map((it) => ({ label: it.vrLabel || it.label, active: it.active, state: it.state, onClick: wrap(it.onClick) })) });
      else if (c.type === 'button' || !c.type) blocks.push({ type: 'button', label: c.vrLabel || c.label, active: c.active, state: c.state, onClick: wrap(c.onClick) });
      else if (c.type === 'range') {
        const stp = c.vrStep || c.step;
        const set = (v) => { v = Math.min(c.max, Math.max(c.min, Math.round(v / c.step) * c.step)); this._safe(() => c.onInput(+v.toFixed(4))); this.refresh(); };
        blocks.push({ type: 'stepper', label: c.label, value: c.format ? c.format(c.value) : c.value, onDec: () => set(c.value - stp), onInc: () => set(c.value + stp) });
      } else if (c.type === 'select') {
        const idx = c.options.findIndex((o) => String(o.value) === String(c.value));
        const cyc = (d) => { const o = c.options[(idx + d + c.options.length) % c.options.length]; this._safe(() => c.onChange(o.value)); this.refresh(); };
        blocks.push({ type: 'stepper', label: c.label, value: idx >= 0 ? c.options[idx].label : '—', onDec: () => cyc(-1), onInc: () => cyc(1) });
      }
    }
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'buttons', items: [
      { label: '← Anterior', onClick: () => this.step(-1) },
      { label: 'Idea clave', active: this.ideaOpen, onClick: () => { this.ideaOpen = !this.ideaOpen; this.refresh(); } },
      { label: 'Siguiente →', onClick: () => this.step(1) },
    ] });
    this.vrGuide.setBlocks(blocks);

    const ib = [];
    const d = this.detail;
    if (this.ideaOpen) { ib.push({ type: 'kicker', text: 'Idea clave', color: '#fbbf24' }); ib.push({ type: 'p', text: g.idea }); }
    if (d) {
      if (ib.length) ib.push({ type: 'divider' });
      const col = d.state === 'bad' ? '#f87171' : d.state === 'ok' ? '#34d399' : undefined;
      if (d.kicker) ib.push({ type: 'kicker', text: d.kicker, color: col });
      ib.push({ type: 'title', text: d.title, color: col });
      if (d.rows && d.rows.length) ib.push({ type: 'rows', rows: d.rows.slice(0, 5) });
      const t = d.text ? [].concat(d.text).filter(Boolean) : [];
      if (t[0]) ib.push({ type: 'p', text: t[0] });
    }
    if (!ib.length) { ib.push({ type: 'kicker', text: 'Objetivo' }); ib.push({ type: 'p', text: g.objective }); ib.push({ type: 'p', text: 'Apunta con el rayo a un objeto y presiona el gatillo para explorarlo.', color: '#9fb0c8' }); }
    this.vrInfo.setBlocks(ib);
  }
}

function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
