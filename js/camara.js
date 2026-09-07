// ==========================================================
// CÁMARA EN PRIMERA PERSONA
// La cámara son los ojos del jugador: camina con WASD,
// corre con Shift y mira arrastrando el mouse.
// ==========================================================

// Posición del jugador dentro del local
let jugX = 0, jugZ = 180;

// Altura de los ojos. El piso está en y=220, así que 65
// equivale más o menos a una persona parada.
const ALTURA_OJOS = 65;

// Hacia dónde está mirando (en grados)
let camAngulo = 0;   // giro horizontal
let camPitch  = 0;   // giro vertical

const VEL_MOV    = 7;
const VEL_CORRER = 15;

// Radio aproximado del jugador, para que no se meta dentro de los
// muebles: no es un círculo real, es solo el margen que se le
// suma a cada obstáculo para frenarlo un poco antes de tocarlo.
const RADIO_JUGADOR = 28;

// Obstáculos fijos del local (mostrador y estantes laterales), como
// rectángulos en el plano X/Z. Los valores salen de la posición y el
// tamaño con que se dibujan en escena.js (dibujarMostrador,
// dibujarEstanteLateral). El estante principal se calcula aparte
// porque su ancho depende de cuántos productos hay.
const OBSTACULOS_FIJOS = [
  // Mostrador: box(420, 60, 45) centrado en (0, 260)
  { minX: -210, maxX: 210, minZ: 237, maxZ: 283 },
  // Estante lateral izquierdo, mitad de atrás: (-780, -150)
  { minX: -845, maxX: -715, minZ: -280, maxZ: -20 },
  // Estante lateral izquierdo, mitad de adelante: (-780, 150)
  { minX: -845, maxX: -715, minZ: 20, maxZ: 280 },
  // Estante lateral derecho: (780, -350)
  { minX: 715, maxX: 845, minZ: -480, maxZ: -220 },
];

// El estante principal (detrás del mostrador, con los productos a
// la vista) cambia de ancho según cuántos productos tenga el kiosco,
// así que su rectángulo se arma con la misma fórmula que lo dibuja.
function obstaculoEstantePrincipal() {
  const n = (typeof gameState !== 'undefined' && gameState.productos) ? gameState.productos.length : 8;
  const espacio = 120;
  const anchoTotal = espacio * n + 30;
  return { minX: -anchoTotal / 2, maxX: anchoTotal / 2, minZ: -300, maxZ: -225 };
}

// ---- ¿Esa posición (x, z) se mete adentro de algún mueble? ----
function colisionaConObstaculo(x, z) {
  for (const o of OBSTACULOS_FIJOS) {
    if (x > o.minX - RADIO_JUGADOR && x < o.maxX + RADIO_JUGADOR &&
        z > o.minZ - RADIO_JUGADOR && z < o.maxZ + RADIO_JUGADOR) {
      return true;
    }
  }
  const ep = obstaculoEstantePrincipal();
  if (x > ep.minX - RADIO_JUGADOR && x < ep.maxX + RADIO_JUGADOR &&
      z > ep.minZ - RADIO_JUGADOR && z < ep.maxZ + RADIO_JUGADOR) {
    return true;
  }
  return false;
}

// ---- Lee el teclado y mueve al jugador ----
function actualizarMovimientoJugador() {
  if (!juegoIniciado || diaBloqueado) return;

  // Vector "hacia adelante" según hacia dónde mira la cámara
  const dirX = -sin(camAngulo), dirZ = -cos(camAngulo);
  // Vector perpendicular, para el desplazamiento lateral
  const derX = -cos(camAngulo), derZ =  sin(camAngulo);

  let mx = 0, mz = 0;

  if (keyIsDown(87)) { mx += dirX; mz += dirZ; }  // W
  if (keyIsDown(83)) { mx -= dirX; mz -= dirZ; }  // S
  if (keyIsDown(65)) { mx += derX; mz += derZ; }  // A
  if (keyIsDown(68)) { mx -= derX; mz -= derZ; }  // D

  // Joystick virtual (celular): empujarlo hacia adelante/atrás
  // y a los costados hace lo mismo que WASD.
  let corriendoJoystick = false;
  if (joyActivo && !dialogoAbierto) {
    const adelante = -joyY;   // arriba del joystick = adelante
    const derecha  =  joyX;   // derecha del joystick = derecha

    mx += dirX * adelante - derX * derecha;
    mz += dirZ * adelante - derZ * derecha;

    // Empujarlo hasta el borde equivale a mantener Shift apretado
    corriendoJoystick = Math.hypot(joyX, joyY) > 0.75;
  }

  // Shift = correr (o joystick al máximo)
  const corriendo = (keyIsDown(SHIFT) && (mx !== 0 || mz !== 0)) || corriendoJoystick;
  const velocidad = corriendo ? VEL_CORRER : VEL_MOV;

  const indicador = document.getElementById('indicadorCorrer');
  if (indicador) indicador.classList.toggle('oculto', !corriendo);

  if (mx !== 0 || mz !== 0) {
    // Se normaliza para que la diagonal no sea más rápida
    const mag = Math.hypot(mx, mz);
    const pasoX = (mx / mag) * velocidad;
    const pasoZ = (mz / mag) * velocidad;

    // Cada eje se mueve por separado: si un mueble frena el avance
    // en X, el jugador igual puede seguir deslizándose en Z (y
    // viceversa), como en cualquier juego con paredes sólidas, en
    // vez de quedar pegado en seco contra la esquina.
    const nuevoX = constrain(jugX + pasoX, -850, 850);
    if (!colisionaConObstaculo(nuevoX, jugZ)) jugX = nuevoX;

    const nuevoZ = constrain(jugZ + pasoZ, -600, 300);
    if (!colisionaConObstaculo(jugX, nuevoZ)) jugZ = nuevoZ;
  }
}

// ---- Ubica la cámara donde está el jugador ----
function aplicarCamaraPrimeraPersona() {
  actualizarMovimientoJugador();

  const dist = 300;
  const objX = jugX - dist * sin(camAngulo);
  const objY = ALTURA_OJOS - dist * sin(camPitch);
  const objZ = jugZ - dist * cos(camAngulo);

  camera(jugX, ALTURA_OJOS, jugZ,   objX, objY, objZ,   0, 1, 0);
}

// ---- Arrastrar el mouse gira la cámara ----
function mouseDragged() {
  if (!juegoIniciado) return true;

  camAngulo += (mouseX - pmouseX) * 0.4;
  camPitch = constrain(camPitch - (mouseY - pmouseY) * 0.2, -35, 35);
  return false;   // evita que el arrastre scrollee la página
}

// ---- Teclas de acción ----
function keyPressed() {
  if (!juegoIniciado) return;

  // R = resetear la vista
  if (key === 'r' || key === 'R') {
    jugX = 0; jugZ = 180;
    camAngulo = 0; camPitch = 0;
  }
  // L = atender al cliente
  if ((key === 'l' || key === 'L') && cercaDeLaCaja() && !dialogoAbierto) {
    abrirDialogoCliente();
  }
  // E = salir por la puerta
  if ((key === 'e' || key === 'E') && cercaDeLaPuerta() && !dialogoAbierto) {
    abrirDialogoSalida();
  }
}

// ---- Detección de proximidad ----
function cercaDeLaCaja() {
  const dx = jugX - ZONA_CAJA.x;
  const dz = jugZ - ZONA_CAJA.z;
  return Math.hypot(dx, dz) < ZONA_CAJA.radio;
}

function cercaDeLaPuerta() {
  const dx = jugX - PUERTA.x;
  const dz = jugZ - PUERTA.z;
  return Math.hypot(dx, dz) < PUERTA.radio;
}

// ---- Avisos que aparecen al acercarse ----
function actualizarPromptInteraccion() {
  const prompt = document.getElementById('promptInteraccion');
  if (!prompt) return;
  prompt.classList.toggle('oculto', !(juegoIniciado && cercaDeLaCaja() && !dialogoAbierto));
}

function actualizarPromptPuerta() {
  const prompt = document.getElementById('promptPuerta');
  if (!prompt) return;
  prompt.classList.toggle('oculto', !(juegoIniciado && cercaDeLaPuerta() && !dialogoAbierto));
}


// ==========================================================
// CONTROLES TÁCTILES (celular / tablet)
// Joystick virtual para caminar + arrastrar el dedo por la
// pantalla para mirar alrededor, igual que con el mouse.
// Se activan solo si el dispositivo reporta soporte táctil.
// ==========================================================

const ES_TACTIL = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// El joystick es "flotante": aparece justo donde apoyás el pulgar,
// en cualquier punto de la mitad izquierda de la pantalla, en vez
// de obligarte a acertarle a un círculo fijo y chiquito en la
// esquina. La mitad derecha es para arrastrar y mirar alrededor.
// Cada gesto (joystick / mirar) queda atado al dedo (touch id) que
// lo empezó, así los dos funcionan al mismo tiempo sin pisarse.

// ---- Estado del joystick ----
let joyTouchId = null;
let joyOrigenX = 0, joyOrigenY = 0;
let joyX = 0, joyY = 0;
let joyActivo = false;

const JOY_RADIO_MAX = 46;

function joyMostrarEn(x, y) {
  const base = document.getElementById('joystickBase');
  const stick = document.getElementById('joystickStick');
  if (!base || !stick) return;

  base.style.left = x + 'px';
  base.style.top = y + 'px';
  base.classList.add('activo');
  stick.style.transform = 'translate(0px, 0px)';
}

function joyOcultar() {
  const base = document.getElementById('joystickBase');
  if (base) base.classList.remove('activo');
}

function joyMover(t) {
  let dx = t.clientX - joyOrigenX;
  let dy = t.clientY - joyOrigenY;
  const dist = Math.hypot(dx, dy);

  if (dist > JOY_RADIO_MAX) {
    dx = (dx / dist) * JOY_RADIO_MAX;
    dy = (dy / dist) * JOY_RADIO_MAX;
  }

  joyX = dx / JOY_RADIO_MAX;
  joyY = dy / JOY_RADIO_MAX;

  const stick = document.getElementById('joystickStick');
  if (stick) stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

function joySoltar() {
  joyTouchId = null;
  joyActivo = false;
  joyX = 0; joyY = 0;
  joyOcultar();
}

// ---- Arrastrar el dedo (mitad derecha) gira la cámara ----
let lookTouchId = null;
let lookPrevX = 0, lookPrevY = 0;

// ---- Un solo listener en el canvas: reparte cada toque nuevo
//      según en qué mitad de la pantalla empezó ----
function pantallaInicio(e) {
  if (!juegoIniciado || dialogoAbierto) return;

  for (const t of e.changedTouches) {
    const esMovimiento = t.clientX < window.innerWidth * 0.5;

    if (esMovimiento && joyTouchId === null) {
      joyTouchId = t.identifier;
      joyActivo = true;
      joyOrigenX = t.clientX;
      joyOrigenY = t.clientY;
      joyMostrarEn(t.clientX, t.clientY);
      joyMover(t);
    } else if (!esMovimiento && lookTouchId === null) {
      lookTouchId = t.identifier;
      lookPrevX = t.clientX;
      lookPrevY = t.clientY;
    }
  }
  e.preventDefault();
}

function pantallaMovimiento(e) {
  let usado = false;

  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      joyMover(t);
      usado = true;
    } else if (t.identifier === lookTouchId) {
      const dx = t.clientX - lookPrevX;
      const dy = t.clientY - lookPrevY;

      camAngulo += dx * 0.4;
      camPitch = constrain(camPitch - dy * 0.2, -35, 35);

      lookPrevX = t.clientX;
      lookPrevY = t.clientY;
      usado = true;
    }
  }
  if (usado) e.preventDefault();
}

function pantallaFin(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) joySoltar();
    if (t.identifier === lookTouchId) lookTouchId = null;
  }
}

// ---- Muestra/oculta el joystick según el estado del juego ----
function actualizarControlesTactiles() {
  if (!ES_TACTIL) return;
  // Si se abre un diálogo (ej. un evento) en medio de un gesto,
  // se sueltan el joystick y la cámara para que no queden pegados.
  if (dialogoAbierto) {
    if (joyActivo) joySoltar();
    lookTouchId = null;
  }
}

// ---- Cablea todos los listeners táctiles y adapta la ayuda ----
function inicializarControlesTactiles() {
  if (!ES_TACTIL) return;

  document.body.classList.add('tactil');

  const wrap = document.getElementById('canvasWrapper');
  if (wrap) {
    wrap.addEventListener('touchstart', pantallaInicio, { passive: false });
    wrap.addEventListener('touchmove', pantallaMovimiento, { passive: false });
    wrap.addEventListener('touchend', pantallaFin, { passive: false });
    wrap.addEventListener('touchcancel', pantallaFin, { passive: false });
  }

  // Tocar el aviso de "Atender cliente" / "Cerrar el kiosco" hace
  // lo mismo que apretar L / E en el teclado.
  const promptCaja = document.getElementById('promptInteraccion');
  if (promptCaja) {
    promptCaja.addEventListener('click', () => {
      if (juegoIniciado && cercaDeLaCaja() && !dialogoAbierto) abrirDialogoCliente();
    });
  }

  const promptPuerta = document.getElementById('promptPuerta');
  if (promptPuerta) {
    promptPuerta.addEventListener('click', () => {
      if (juegoIniciado && cercaDeLaPuerta() && !dialogoAbierto) abrirDialogoSalida();
    });
  }

  adaptarControlesInicioParaTactil();
}

// ---- Reescribe la pestaña "Controles" de la pantalla de inicio ----
function adaptarControlesInicioParaTactil() {
  const cont = document.getElementById('pi-controles');
  if (!cont) return;

  cont.innerHTML = `
    <div class="pi-control">
      <span class="pi-tecla">Mitad izquierda</span>
      Apoyá el pulgar y arrastrá para caminar (el joystick aparece ahí mismo).
      Empujalo hasta el borde para correr.
    </div>

    <div class="pi-control">
      <span class="pi-tecla">Mitad derecha</span>
      Deslizá el dedo por la pantalla para mirar alrededor
    </div>

    <div class="pi-control">
      <span class="pi-tecla">Tocar aviso</span>
      Tocá el cartel que aparece para atender al cliente o salir por la puerta
    </div>

    <div class="pi-control">
      <span class="pi-tecla">Botón</span>
      "Abrir gestión del kiosco" para comprar y fijar precios
    </div>`;
}