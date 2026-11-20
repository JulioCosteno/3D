# Laboratorio de variables · versión de diseño instruccional (v2.1)

Esta carpeta es una **variante** de `version_2_generada_por_Claude`, que no se modificó. Tiene el mismo
contenido y las mismas cuatro escenas, pero con otra interfaz:

| Antes (v2.0) | Ahora (v2.1) |
|---|---|
| Paneles laterales con mucho texto | Una sola **tarjeta guía** con una instrucción breve por paso |
| Todos los controles visibles a la vez | Solo los controles del **paso actual** |
| Explicación siempre en pantalla | **«Idea clave»** a demanda (botón 💡) |
| Laboratorio oscuro | Laboratorio **luminoso** y con menos rótulos en 3D |
| Sin introducción | **Bienvenida** con el objetivo de aprendizaje y el recorrido |

## Secuencia didáctica

Se basa en los eventos de instrucción de Gagné: captar la atención → informar el objetivo → presentar →
guiar → practicar → retroalimentar → cerrar.

| Escena | Pasos |
|---|---|
| 1 · Variables | Observa la situación → Descubre las variables → Del caso al modelo → Comprueba (7 preguntas) → Compara con una persona |
| 2 · Dimensiones | Una variable, un eje → Segunda variable → Tres dimensiones → Iguala las escalas → ¿Dos ejes, dos ideas? |
| 3 · Tipos | Recorre las estaciones → ¿Los códigos son cantidades? → Clasifica (13 tarjetas) |
| 4 · Constructos | Lo que no se ve → Explora los indicadores → Las flechas son hipótesis → ¿Qué evidencia falta? |

**Navegación:** flechas ← → (o los botones Anterior y Siguiente), puntos de paso en la tarjeta y recorrido
superior 1–4. En Meta Quest, la tarjeta guía aparece como tablero 3D a la izquierda y la idea clave o el
detalle de lo seleccionado, a la derecha.

---


Experiencia 3D/WebXR (escritorio y Meta Quest) para el curso **PD156 Innovación y Tecnología Educativa**.
Secuencia didáctica: **variables → dimensiones de representación → tipos de variables → constructos**.

Todos los datos son **ficticios** (`data/students.json`, semilla fija). Las relaciones entre indicadores y
constructos se presentan como **hipótesis**, no como relaciones psicométricas validadas.

---

## 1. Contenido

| Escena | Qué muestra |
|---|---|
| **1 · Variables (Momento 1)** | **Figura 1A · De lo real al modelo**: un estudiante en un curso en línea (plataforma de teleformación, foro asincrónico, sesión sincrónica, autorreportes y rúbrica de análisis de casos). Tiene tres pasos: ① lo real, ② variables x₁…x₆ con su fuente (observable con instrumento, registrada o inferida) y ③ modelo matemático: vector del estudiante, matriz de datos n × p, codificación de variables categóricas y regla de calificación del programa (0.30·casos + 0.20·carteles + 0.25·ensayos + 0.25·exposición). **Figura 1B · Persona**: maniquí con estadímetro, báscula y expediente. El aspecto no cambia con la edad ni con el peso. Incluye preguntas con retroalimentación. |
| **2 · Dimensiones** | Espacio cartesiano X, Y, Z con 36 estudiantes ficticios. Pasa de 1D a 2D y a 3D, cambia la variable de cada eje, normaliza por mín–máx o por puntuación z (con fórmula y estadísticos visibles), selecciona puntos y muestra la correlación de Pearson entre ejes. Si un eje recibe una variable ordinal o nominal, aparece una advertencia. |
| **3 · Tipos** | Cuatro estaciones: nominal (modalidad preferida, con «Recodificar» para mostrar que las distancias entre códigos no significan nada), ordinal (dominio de TIC), discreta (mensajes en el foro) y continua (tiempo conectado). Ejercicio de 13 tarjetas con retroalimentación inmediata. |
| **4 · Constructos** | Constructo latente (elipse), tres indicadores observables (rectángulos), errores de medición y cargas λ «por estimar». Hay dos ejemplos: *Comprensión estadística* y *Competencia para integrar TIC y TAC*. Permite comparar el modelo de 1 factor con el de 2 factores y ver las correlaciones observadas (ficticias). También muestra la ruta de evidencia necesaria para sostener la unidimensionalidad. |

## 2. Estructura

```
3D/
├── index.html            Interfaz principal + importmap + diagnóstico temprano
├── main.js               Renderizador, WebXR, navegación entre escenas, transiciones
├── styles.css            Estilos de la interfaz HTML
├── servidor.py           Servidor local con tipos MIME correctos (y HTTPS opcional)
├── core/
│   ├── environment.js    Laboratorio: piso, plataforma, muros, mesas, luces y sombras
│   ├── interaction.js    Selección unificada: ratón y rayos de los controles/manos XR
│   ├── text.js           Etiquetas flotantes, tableros y tarjetas legibles en 3D
│   ├── ui.js             Panel HTML (escritorio) + tableros 3D (dentro del visor)
│   ├── sceneBase.js      Clase base de las escenas
│   └── theme.js          Paleta: variables, dimensiones, indicadores
├── scenes/scene1.js … scene4.js
├── data/students.json    36 estudiantes ficticios + diccionario de variables
├── lib/three/            Three.js 0.169.0 local (una sola copia para todos los módulos)
└── assets/LICENCIAS.md   Procedencia y licencias
```

Para no depender de internet ni de un CDN, Three.js se sirve localmente. `index.html` define un único
importmap (`three` y `three/addons/`), así que todos los módulos usan la misma versión.

## 3. Ejecución en la computadora

Requiere Python 3.

```bat
cd "C:\Users\coste\OneDrive - Universidad Iberoamericana, A.C\2026\3D"
python servidor.py
```

Después abre **http://localhost:8000** en Chrome o Edge.
También funciona `python -m http.server 8000`. Si en la consola aparece *«Failed to load module script…
MIME type text/plain»*, usa `servidor.py`, que corrige los tipos MIME en Windows.

Para abrir directamente una escena: `http://localhost:8000/?escena=3`.

**Controles de escritorio:** arrastra para rotar, usa la rueda para acercar, haz clic para seleccionar,
**← →** para avanzar o retroceder pasos, **1–4** para cambiar de escena y **H** para ocultar la guía.
El botón «Vista VR» permite probar con el ratón los tableros que se verán en el visor.

## 4. Pruebas en Meta Quest

WebXR solo funciona en un **contexto seguro**: `https://` o `localhost`. Hay tres opciones:

**A. Cable USB con `adb reverse` (recomendada para pruebas).**
1. Activa el modo desarrollador del Quest (app Meta Horizon → dispositivo → Modo desarrollador).
2. Instala *Android Platform Tools* en la PC y conecta el visor por USB. Acepta la depuración USB.
3. `adb reverse tcp:8000 tcp:8000`
4. En el navegador del Quest abre `http://localhost:8000` y pulsa **ENTER VR**.

**B. HTTPS en la red local.**
1. Genera un certificado, por ejemplo con mkcert (`mkcert -key-file key.pem -cert-file cert.pem 192.168.x.x`) o con OpenSSL.
2. `python servidor.py --https` y abre `https://192.168.x.x:8443` en el Quest. Acepta el aviso del certificado.

**C. Publicación HTTPS** (GitHub Pages, Netlify, servidor institucional). Sube la carpeta completa: no requiere compilación.

**En el visor:** apunta con el rayo y presiona el gatillo (o junta los dedos si usas seguimiento de manos).
Los tableros 3D a la izquierda (controles) y a la derecha (explicación) sustituyen al panel HTML.
En la escena 2, el joystick gira el espacio (izquierda/derecha) y acerca o aleja (arriba/abajo).

> La compatibilidad con Meta Quest **no está verificada todavía**: se probó en escritorio (Chromium)
> y con la interfaz 3D simulada. Usa la lista de la sección 5 en el visor.

## 5. Lista de verificación

**Escritorio**
- [ ] Abre en http://localhost:8000 sin errores en la consola (F12).
- [ ] La barra inferior muestra «WebGL 2» y los fps.
- [ ] Las cuatro escenas muestran objetos 3D; las transiciones son suaves.
- [ ] Escena 1A: los pasos ①→②→③ funcionan, aparecen los conectores y luego el vector y la matriz.
- [ ] Escena 1B: la estatura cambia el modelo; el peso y la edad no lo cambian.
- [ ] Escena 2: 1D→2D→3D, cambio de ejes, mín–máx/z, selección de puntos con tabla de valores.
- [ ] Escena 3: clasificar tarjetas da retroalimentación; «Recodificar» mueve los recipientes.
- [ ] Escena 4: 1 factor ↔ 2 factores; correlaciones; ruta de evidencia.
- [ ] Los textos se leen completos; los paneles no tapan los objetos (tecla H).

**Meta Quest**
- [ ] El botón ENTER VR aparece y abre la sesión inmersiva.
- [ ] El contenido está ~2 m al frente, a una altura cómoda, y el piso coincide.
- [ ] Rayo y gatillo seleccionan objetos y botones de los tableros 3D.
- [ ] Se puede cambiar de escena desde el tablero izquierdo (botones 1–4).
- [ ] Los textos se leen sin esfuerzo; el rendimiento es fluido (≥ 72 fps).
- [ ] Al salir de VR, la vista de escritorio se restablece.

## 6. Respaldo de los archivos originales

Antes de instalar esta versión, copia los archivos anteriores (`index.html`, `main.js`) a una carpeta
`_respaldo_original_AAAA-MM-DD`. Al entregar esta versión, la carpeta de destino estaba vacía, por lo
que no hubo originales que respaldar.

## 7. Notas didácticas

- Que un dato se registre con precisión (p. ej., minutos conectados) no lo vuelve un buen indicador de
  aprendizaje: precisión del registro ≠ validez de la interpretación.
- Que una variable se capture con números no la vuelve cuantitativa.
- Una variable puede ser una dimensión de **representación** (un eje) sin ser una dimensión **conceptual**
  independiente.
- La unidimensionalidad de un constructo requiere fundamentación teórica y evidencia empírica (contenido,
  análisis factorial confirmatorio con buen ajuste frente a modelos alternativos, confiabilidad e invarianza).
