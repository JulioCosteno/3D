# Recursos y licencias

Este proyecto **no descarga recursos externos** durante la ejecución.

| Recurso | Origen | Licencia |
|---|---|---|
| Three.js 0.169.0 (`lib/three/build/three.module.min.js`) | Paquete npm `three@0.169.0` (https://github.com/mrdoob/three.js) | MIT — ver `lib/three/LICENSE` |
| `OrbitControls.js`, `VRButton.js` (`lib/three/examples/jsm/`) | Mismo paquete `three@0.169.0` | MIT |
| Modelo humano (maniquí), escritorio, laptop, estadímetro, báscula, estaciones, nodos | Geometría procedimental escrita para este proyecto (`scenes/*.js`) | Igual que el proyecto |
| Texturas (rejilla del piso, escala graduada, pantalla de la plataforma, videollamada, etiquetas) | Generadas en tiempo de ejecución con `<canvas>` | Igual que el proyecto |
| Datos (`data/students.json`) | Simulación con semilla fija; personas inexistentes | Igual que el proyecto |

Los controles de Meta Quest se dibujan con geometría simple; no se usan los perfiles de
`@webxr-input-profiles` (que se descargan de un CDN) para evitar dependencias externas.

Si agregas modelos (.glb) o texturas, colócalos en `assets/` y registra aquí su autor, URL y licencia.
