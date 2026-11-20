// Entorno del laboratorio: suelo, plataforma, muros curvos, mesas de trabajo e iluminación.
// Todo es geometría procedimental (sin descargas externas) y de bajo costo para visores autónomos.
import * as THREE from 'three';

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#eef2f7'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(71, 105, 160, 0.16)'; g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(71, 105, 160, 0.07)'; g.lineWidth = 1;
  for (let i = 64; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildEnvironment(scene, { quality = 'high' } = {}) {
  const env = new THREE.Group();
  env.name = 'laboratorio';
  scene.background = new THREE.Color('#e6ecf4');
  scene.fog = new THREE.Fog('#e6ecf4', 11, 30);

  // Iluminación
  const hemi = new THREE.HemisphereLight('#ffffff', '#b8c4d6', 1.6);
  env.add(hemi);
  const key = new THREE.DirectionalLight('#fff7ed', 1.9);
  key.position.set(3.5, 7, 4);
  key.target.position.set(0, 0.8, -2);
  key.castShadow = true;
  const sm = quality === 'high' ? 2048 : 1024;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 18 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  env.add(key, key.target);
  const fill = new THREE.DirectionalLight('#9ec5ff', 0.5);
  fill.position.set(-5, 3, 2);
  env.add(fill);

  // Suelo
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(16, 64),
    new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.9, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  env.add(floor);

  // Plataforma central con borde luminoso
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.5, 0.04, 72),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.0 })
  );
  plat.position.set(0, 0.02, -2);
  plat.receiveShadow = true;
  env.add(plat);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.45, 0.012, 6, 120),
    new THREE.MeshBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.55 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.045, -2);
  env.add(rim);

  // Muro curvo envolvente
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f4f7fb', roughness: 0.95, metalness: 0.0, side: THREE.BackSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 5, 64, 1, true), wallMat);
  wall.position.set(0, 2.5, -2);
  env.add(wall);
  // Franjas de luz verticales en el muro
  const stripMat = new THREE.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.5 });
  const stripGeo = new THREE.BoxGeometry(0.05, 3.2, 0.02);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const s = new THREE.Mesh(stripGeo, stripMat);
    s.position.set(Math.sin(a) * 9.95, 2.2, -2 + Math.cos(a) * 9.95);
    s.lookAt(0, 2.2, -2);
    env.add(s);
  }
  // Rodapié luminoso
  const base = new THREE.Mesh(new THREE.TorusGeometry(9.9, 0.03, 6, 128), new THREE.MeshBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.25 }));
  base.rotation.x = Math.PI / 2; base.position.set(0, 0.25, -2);
  env.add(base);

  // Anillos de luz en el techo
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const r of [2.2, 4.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 96), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 4.6, -2);
    env.add(ring);
  }

  // Mesas de laboratorio laterales con material de vidrio
  const benchMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.5, metalness: 0.1 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#a5f3fc', transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.0 });
  const liquidMats = ['#38bdf8', '#a78bfa', '#fbbf24'].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.3 }));
  for (const side of [-1, 1]) {
    const bench = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.86, 0.7), benchMat);
    body.position.y = 0.43; body.castShadow = true; body.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.78), topMat);
    top.position.y = 0.885; top.receiveShadow = true;
    bench.add(body, top);
    for (let k = 0; k < 3; k++) {
      const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.26, 16), glassMat);
      flask.position.set(-0.7 + k * 0.7, 1.04, 0);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.12, 16), liquidMats[k]);
      liquid.position.set(-0.7 + k * 0.7, 0.97, 0);
      bench.add(liquid, flask);
    }
    bench.position.set(side * 6.2, 0, -3.2);
    bench.rotation.y = -side * 1.15;
    env.add(bench);
  }

  scene.add(env);
  return { group: env, keyLight: key };
}
