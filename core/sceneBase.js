// Clase base para las escenas: grupo propio, registro de objetos interactivos y utilidades.
import * as THREE from 'three';

export class BaseScene {
  constructor(app, id, { title, short }) {
    this.app = app;
    this.id = id;
    this.title = title;
    this.short = short;
    this.group = new THREE.Group();
    this.group.name = id;
    // Las escenas se construyen alrededor de este ancla (2 m frente al usuario en VR).
    this.root = new THREE.Group();
    this.root.position.set(0, 0, -2);
    this.group.add(this.root);
    this.cameraPreset = { position: [0, 1.6, 1.4], target: [0, 1.15, -2] };
  }

  /** Registra un objeto seleccionable con ratón o con el control de Meta Quest. */
  reg(obj, opts = {}) { return this.app.interaction.add(obj, { owner: this.id, ...opts }); }
  detail(d) { this.app.ui.setDetail(d); }
  refresh() { this.app.ui.refresh(); }
  onEmptySelect() {}

  static mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...opts });
  }
  static shadow(obj, cast = true, receive = false) {
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
    return obj;
  }
}
