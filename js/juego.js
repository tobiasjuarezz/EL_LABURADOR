// ==========================================================
// EL LABURADOR — Punto de entrada
// Juego educativo de gestión de un kiosco de barrio
//
// Este archivo solo arranca el juego y coordina el bucle.
// Toda la lógica está repartida en los demás archivos:
//   estado.js    → los datos del juego
//   audio.js     → sonidos y música
//   camara.js    → primera persona y movimiento
//   escena.js    → dibujado 3D
//   interfaz.js  → HUD y panel de gestión
//   ventas.js    → clientes y cálculo de vuelto
//   eventos.js   → eventos diarios y ciclo de días
//   caminos.js   → los tres caminos y los finales
// ==========================================================

// p5.js ejecuta preload() ANTES de setup(), para cargar assets
function preload() {
  precargarAudio();
}

// p5.js ejecuta setup() UNA vez, al cargar la página
function setup() {
  const { w, h } = obtenerDimensiones();

  setAttributes('antialias', true);          // bordes suaves, no dentados
  pixelDensity(Math.min(2, window.devicePixelRatio || 1)); // nitidez en pantallas retina

  const cnv = createCanvas(w, h, WEBGL);
  cnv.parent('canvasWrapper');

  angleMode(DEGREES);      // trabajar en grados, no en radianes
  ajustarPerspectiva();    // que no se "corte" lo que está cerca de la cámara

  generarColoresClutter(); // colores fijos de la mercadería
  generarTexturas();       // texturas procedurales (madera, pared, piso)
  cargarModelos3D();       // modelos de Blender (llegan solos, sin trabar el arranque)
  actualizarHUD();

  audioListoInicializar(); // deja música y sonidos de pasos configurados

  inicializarControlesTactiles(); // joystick + mirar con el dedo, si es celular

  // Algunos navegadores móviles no disparan 'resize' cuando aparece
  // o desaparece la barra de direcciones; visualViewport sí lo nota.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', windowResized);
  }
}

// p5.js ejecuta draw() ~60 veces por segundo.
// Todo lo que se ve se redibuja en cada pasada.
function draw() {
  background(10, 9, 8);

  aplicarIluminacion();
  aplicarCamaraPrimeraPersona();

  dibujarEscena();

  actualizarPromptInteraccion();
  actualizarPromptPuerta();
  actualizarControlesTactiles();
}

// Se ejecuta cuando cambia el tamaño de la ventana
function windowResized() {
  const { w, h } = obtenerDimensiones();
  resizeCanvas(w, h);
  ajustarPerspectiva();    // resizeCanvas vuelve la perspectiva a la de fábrica
}

// Por defecto p5 no dibuja nada que esté a menos de 80 unidades de
// la cámara (el "plano cercano"). Parado en el mostrador, la reja de
// la ventanita queda más cerca que eso y desaparecía. Se mantiene el
// mismo ángulo de visión de siempre y solo se acerca ese plano a 5.
function ajustarPerspectiva() {
  const fovy = 2 * atan(height / 2 / 800);
  perspective(fovy, width / height, 5, 8000);
}