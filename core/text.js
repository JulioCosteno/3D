// Texto legible dentro de la escena 3D (funciona igual en escritorio y en WebXR).
// - makeLabel(): etiqueta flotante tipo "sprite" que siempre mira a la cámara.
// - Board: tablero plano dibujado en un canvas, con bloques de texto y botones
//   (regiones seleccionables con ratón o con el rayo del control de Meta Quest).
import * as THREE from 'three';
import { COLORS, FONT } from './theme.js';

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function wrapText(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = w; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Etiqueta flotante. `height` es la altura en metros de una línea de texto.
 */
export function makeLabel(text, opts = {}) {
  const o = {
    color: COLORS.text, bg: 'rgba(9, 16, 30, 0.86)', border: null, fontSize: 44, height: 0.06,
    padding: 16, bold: true, maxWidthPx: 760, depthTest: true, align: 'center', ...opts,
  };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let tex = makeTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: o.depthTest, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = o.depthTest ? 2 : 10;

  sprite.setText = (newText, newOpts = {}) => {
    Object.assign(o, newOpts);
    const font = `${o.bold ? 650 : 450} ${o.fontSize}px ${FONT}`;
    ctx.font = font;
    const lines = wrapText(ctx, newText, o.maxWidthPx);
    const lineH = Math.round(o.fontSize * 1.22);
    const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + o.padding * 2);
    const h = Math.ceil(lines.length * lineH + o.padding * 1.6);
    canvas.width = w; canvas.height = h;
    ctx.font = font;
    if (o.bg) {
      ctx.fillStyle = o.bg;
      roundRect(ctx, 1, 1, w - 2, h - 2, Math.min(18, h / 2));
      ctx.fill();
      if (o.border) { ctx.lineWidth = 3; ctx.strokeStyle = o.border; ctx.stroke(); }
    }
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = o.align;
    const x = o.align === 'center' ? w / 2 : o.padding;
    lines.forEach((l, i) => ctx.fillText(l, x, o.padding * 0.8 + lineH * (i + 0.5)));
    tex.dispose();
    tex = makeTexture(canvas);
    mat.map = tex;
    mat.needsUpdate = true;
    const worldH = o.height * (h / (o.fontSize * 1.22 + o.padding * 1.6));
    sprite.scale.set(worldH * (w / h), worldH, 1);
    sprite.userData.text = newText;
  };
  sprite.setText(text);
  return sprite;
}

/**
 * Tablero plano con contenido estructurado en bloques.
 * Bloques admitidos:
 *  {type:'kicker'|'title'|'heading'|'p'|'note', text, color}
 *  {type:'rows', rows:[[clave, valor]]}
 *  {type:'legend', items:[{label,color}]}
 *  {type:'button', label, onClick, active, state:'ok'|'bad'}
 *  {type:'buttons', items:[{label,onClick,active,state}]}
 *  {type:'stepper', label, value, onDec, onInc}
 *  {type:'divider'}
 */
export class Board {
  constructor({ width = 0.9, ppm = 900, maxHeight = 1.5, bg = COLORS.panelBg, border = COLORS.panelBorder, interaction = null, owner = 'global', anchorTop = false } = {}) {
    this.anchorTop = anchorTop;
    this.width = width; this.ppm = ppm; this.maxHeight = maxHeight; this.bg = bg; this.border = border;
    this.interaction = interaction; this.owner = owner;
    this.group = new THREE.Group();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texture = makeTexture(this.canvas);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }));
    this.mesh.renderOrder = 3;
    this.group.add(this.mesh);
    this.hitGroup = new THREE.Group();
    this.group.add(this.hitGroup);
    this.hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.blocks = [];
    this.regions = [];
    this.hoverIndex = -1;
    this.pressIndex = -1;
  }

  setBlocks(blocks) {
    this.blocks = blocks.filter(Boolean);
    this._layoutAndDraw(true);
  }

  _layoutAndDraw(rebuildHits) {
    const ctx = this.ctx;
    const W = Math.round(this.width * this.ppm);
    const pad = 30;
    const inner = W - pad * 2;
    const items = [];
    let y = pad;
    const F = (size, weight = 450) => `${weight} ${size}px ${FONT}`;
    const measureWrap = (text, font, width) => { ctx.font = font; return wrapText(ctx, text, width); };

    for (const b of this.blocks) {
      if (b.type === 'kicker') { items.push({ b, y, h: 30 }); y += 36; }
      else if (b.type === 'title') {
        const lines = measureWrap(b.text, F(38, 700), inner); items.push({ b, y, lines, lh: 46 }); y += lines.length * 46 + 10;
      } else if (b.type === 'heading') { y += 6; items.push({ b, y, h: 32 }); y += 38; }
      else if (b.type === 'p' || b.type === 'note') {
        const indent = b.type === 'note' ? 18 : 0;
        const lines = measureWrap(b.text, F(25), inner - indent * 2);
        items.push({ b, y, lines, lh: 34, indent }); y += lines.length * 34 + (b.type === 'note' ? 24 : 12);
      } else if (b.type === 'rows') {
        const rows = b.rows.map(([k, v]) => {
          const vl = measureWrap(String(v), F(24, 600), inner * 0.52);
          return { k, vl, h: Math.max(1, vl.length) * 31 + 8 };
        });
        items.push({ b, y, rows }); y += rows.reduce((s, r) => s + r.h, 0) + 10;
      } else if (b.type === 'legend') { items.push({ b, y, h: 34 }); y += 44; }
      else if (b.type === 'table') { const h = (b.rows.length + 1) * 38 + 8; items.push({ b, y, h }); y += h + 12; }
      else if (b.type === 'divider') { items.push({ b, y }); y += 18; }
      else if (b.type === 'button') {
        const lines = measureWrap(b.label, F(25, 600), inner - 30);
        const h = Math.max(64, lines.length * 32 + 30);
        items.push({ b, y, h, lines, rect: [pad, y, inner, h], cb: b.onClick }); y += h + 10;
      } else if (b.type === 'buttons') {
        const n = b.items.length; const gap = 10; const bw = (inner - gap * (n - 1)) / n;
        items.push({ b, y, h: 64, cells: b.items.map((it, i) => ({ it, rect: [pad + i * (bw + gap), y, bw, 64] })) });
        y += 74;
      } else if (b.type === 'stepper') {
        items.push({ b, y, h: 64, minus: [pad + inner - 150, y + 30, 64, 64], plus: [pad + inner - 70, y + 30, 64, 64] });
        y += 104;
      }
    }
    let H = Math.min(Math.round(y + pad - 10), Math.round(this.maxHeight * this.ppm));
    H = Math.max(H, 80);

    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W; this.canvas.height = H;
      this.texture.dispose();
      this.texture = makeTexture(this.canvas);
      this.mesh.material.map = this.texture;
      this.mesh.material.needsUpdate = true;
    }
    this.mesh.scale.set(W / this.ppm, H / this.ppm, 1);
    this.heightM = H / this.ppm;
    const off = this.anchorTop ? -this.heightM / 2 : 0;
    this.mesh.position.y = off; this.hitGroup.position.y = off;

    // --- Dibujo ---
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.bg; roundRect(ctx, 2, 2, W - 4, H - 4, 26); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = this.border; ctx.stroke();
    ctx.textBaseline = 'middle';
    const regions = [];
    const drawBtn = (rect, label, { active, state, idx, lines }) => {
      const [x, yy, w, h] = rect;
      const hover = idx === this.hoverIndex;
      const press = idx === this.pressIndex;
      let fill = 'rgba(255,255,255,0.07)', stroke = 'rgba(148,197,255,0.28)';
      if (active) { fill = 'rgba(56,189,248,0.30)'; stroke = COLORS.variable; }
      if (state === 'ok') { fill = 'rgba(52,211,153,0.28)'; stroke = COLORS.ok; }
      if (state === 'bad') { fill = 'rgba(248,113,113,0.28)'; stroke = COLORS.bad; }
      if (hover) fill = 'rgba(56,189,248,0.42)';
      if (press) fill = 'rgba(255,255,255,0.45)';
      ctx.fillStyle = fill; roundRect(ctx, x, yy, w, h, 14); ctx.fill();
      ctx.lineWidth = hover ? 4 : 2; ctx.strokeStyle = hover ? '#ffffff' : stroke; ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.font = F(25, 600); ctx.textAlign = 'center';
      const ls = lines || [label];
      ls.forEach((l, i) => ctx.fillText(l, x + w / 2, yy + h / 2 + (i - (ls.length - 1) / 2) * 32));
      ctx.textAlign = 'left';
    };

    for (const it of items) {
      const b = it.b;
      if (it.y > H - 20) break;
      if (b.type === 'kicker') { ctx.font = F(22, 700); ctx.fillStyle = b.color || COLORS.variable; ctx.fillText(b.text.toUpperCase(), pad, it.y + 15); }
      else if (b.type === 'title') { ctx.font = F(38, 700); ctx.fillStyle = b.color || COLORS.text; it.lines.forEach((l, i) => ctx.fillText(l, pad, it.y + 23 + i * it.lh)); }
      else if (b.type === 'heading') { ctx.font = F(24, 700); ctx.fillStyle = b.color || COLORS.variable; ctx.fillText(b.text.toUpperCase(), pad, it.y + 16); }
      else if (b.type === 'p' || b.type === 'note') {
        if (b.type === 'note') {
          ctx.fillStyle = 'rgba(251,191,36,0.10)'; roundRect(ctx, pad, it.y - 6, inner, it.lines.length * it.lh + 14, 10); ctx.fill();
          ctx.fillStyle = b.color || COLORS.indicator; ctx.fillRect(pad, it.y - 6, 5, it.lines.length * it.lh + 14);
        }
        ctx.font = F(25); ctx.fillStyle = b.type === 'note' ? '#fde9b6' : (b.color || '#d5e0ef');
        it.lines.forEach((l, i) => ctx.fillText(l, pad + it.indent, it.y + 16 + i * it.lh));
      } else if (b.type === 'rows') {
        let yy = it.y;
        for (const r of it.rows) {
          ctx.font = F(23); ctx.fillStyle = COLORS.muted; ctx.fillText(r.k, pad, yy + 16);
          ctx.font = F(24, 600); ctx.fillStyle = b.color || COLORS.text;
          r.vl.forEach((l, i) => ctx.fillText(l, pad + inner * 0.46, yy + 16 + i * 31));
          yy += r.h;
          ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(pad, yy - 4, inner, 1);
        }
      } else if (b.type === 'legend') {
        let x = pad; ctx.font = F(22);
        for (const L of b.items) {
          ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(x + 8, it.y + 17, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = COLORS.muted; ctx.fillText(L.label, x + 22, it.y + 17);
          x += 40 + ctx.measureText(L.label).width;
        }
      } else if (b.type === 'table') {
        const cols = b.head.length; const cw = inner / cols;
        const cell = (txt, c, r, head) => {
          ctx.font = F(head ? 21 : 22, head ? 700 : 500);
          ctx.fillStyle = head ? (b.headColors?.[c] || COLORS.variable) : COLORS.text;
          let t = String(txt);
          while (ctx.measureText(t).width > cw - 10 && t.length > 2) t = t.slice(0, -2) + '…';
          ctx.fillText(t, pad + c * cw + 6, it.y + 19 + r * 38);
        };
        b.rows.forEach((row, r) => { if (r === b.highlight) { ctx.fillStyle = 'rgba(56,189,248,0.22)'; roundRect(ctx, pad, it.y + (r + 1) * 38, inner, 38, 8); ctx.fill(); } });
        b.head.forEach((h, c) => cell(h, c, 0, true));
        b.rows.forEach((row, r) => row.forEach((v, c) => cell(v, c, r + 1, false)));
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(pad, it.y + 38, inner, 2);
      } else if (b.type === 'divider') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(pad, it.y + 8, inner, 2); }
      else if (b.type === 'button') {
        const idx = regions.length; regions.push({ rect: it.rect, cb: b.onClick });
        drawBtn(it.rect, b.label, { active: b.active, state: b.state, idx, lines: it.lines });
      } else if (b.type === 'buttons') {
        for (const c of it.cells) {
          const idx = regions.length; regions.push({ rect: c.rect, cb: c.it.onClick });
          drawBtn(c.rect, c.it.label, { active: c.it.active, state: c.it.state, idx });
        }
      } else if (b.type === 'stepper') {
        ctx.font = F(23); ctx.fillStyle = COLORS.muted; ctx.fillText(b.label, pad, it.y + 14);
        ctx.font = F(30, 700); ctx.fillStyle = b.color || COLORS.variable; ctx.fillText(String(b.value), pad, it.y + 64);
        let idx = regions.length; regions.push({ rect: it.minus, cb: b.onDec, repeat: true });
        drawBtn(it.minus, '−', { idx });
        idx = regions.length; regions.push({ rect: it.plus, cb: b.onInc, repeat: true });
        drawBtn(it.plus, '+', { idx });
      }
    }
    this.texture.needsUpdate = true;
    this.regions = regions;
    if (rebuildHits) this._rebuildHits(W, H);
  }

  _rebuildHits(W, H) {
    if (this.interaction) this.interaction.removeWhere((o) => o.parent === this.hitGroup);
    for (const c of [...this.hitGroup.children]) { c.geometry.dispose(); this.hitGroup.remove(c); }
    this.regions.forEach((r, i) => {
      const [x, y, w, h] = r.rect;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w / this.ppm, h / this.ppm), this.hitMat);
      m.position.set((x + w / 2 - W / 2) / this.ppm, (H / 2 - (y + h / 2)) / this.ppm, 0.003);
      if (y + h > H) m.visible = false;
      this.hitGroup.add(m);
      if (this.interaction) {
        this.interaction.add(m, {
          owner: this.owner,
          onSelect: () => {
            this.pressIndex = i; this._layoutAndDraw(false);
            setTimeout(() => { this.pressIndex = -1; }, 120);
            r.cb && r.cb();
          },
          onHover: (on) => { const n = on ? i : (this.hoverIndex === i ? -1 : this.hoverIndex); if (n !== this.hoverIndex) { this.hoverIndex = n; this._layoutAndDraw(false); } },
        });
      }
    });
  }

  dispose() {
    if (this.interaction) this.interaction.removeWhere((o) => o.parent === this.hitGroup);
    this.texture.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose();
  }
}

/** Tarjeta simple (plano con texto) para objetos de la escena. */
export function makeCard(text, { width = 0.5, height = 0.3, ppm = 800, bg = COLORS.panelBg, border = COLORS.panelBorder, color = COLORS.text, fontSize = 34, title = null, titleColor = COLORS.variable } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const tex = makeTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  mesh.renderOrder = 2;
  mesh.setContent = (t, opt = {}) => {
    const W = Math.round(width * ppm), H = Math.round(height * ppm);
    canvas.width = W; canvas.height = H;
    const b = opt.border || border;
    ctx.fillStyle = opt.bg || bg; roundRect(ctx, 3, 3, W - 6, H - 6, 22); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = b; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let y0 = 0;
    const ttl = opt.title !== undefined ? opt.title : title;
    if (ttl) {
      ctx.font = `700 ${Math.round(fontSize * 0.62)}px ${FONT}`; ctx.fillStyle = opt.titleColor || titleColor;
      ctx.fillText(ttl.toUpperCase(), W / 2, fontSize * 0.9); y0 = fontSize * 0.7;
    }
    const fs = opt.fontSize || fontSize;
    ctx.font = `650 ${fs}px ${FONT}`; ctx.fillStyle = opt.color || color;
    const lines = wrapText(ctx, t, W - 50);
    const lh = fs * 1.2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + y0 / 2 + (i - (lines.length - 1) / 2) * lh));
    tex.needsUpdate = true;
  };
  mesh.setContent(text);
  return mesh;
}
