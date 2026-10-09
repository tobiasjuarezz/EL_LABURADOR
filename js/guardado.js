// ==========================================================
// GUARDADO Y CARGA DE PARTIDA
// El progreso completo vive en Firestore. localStorage se usa
// solo para guardar el ID único del jugador en este navegador,
// que es la clave del documento en la nube.
// ==========================================================

const CLAVE_ID_JUGADOR = 'elLaburador_idJugador';
const COLECCION_PARTIDAS = 'partidas';

// ==========================================================
// ID ÚNICO DEL JUGADOR
// Se genera una sola vez por navegador y se reutiliza siempre.
// ==========================================================
function obtenerIdJugador() {
  let id = localStorage.getItem(CLAVE_ID_JUGADOR);

  if (!id) {
    id = 'jugador_' + Date.now().toString(36) + '_' +
         Math.random().toString(36).substring(2, 10);
    localStorage.setItem(CLAVE_ID_JUGADOR, id);
  }

  return id;
}

// ==========================================================
// ESPERAR A QUE FIREBASE ESTÉ LISTO
// El script de Firebase es un módulo que carga async, puede
// terminar después que este archivo. Esta promesa resuelve
// apenas está disponible (o al toque si ya lo estaba).
// ==========================================================
function firebaseListo() {
  return new Promise((resolve) => {
    if (window.firebaseDB) {
      resolve();
    } else {
      window.addEventListener('firebaseListo', () => resolve(), { once: true });
    }
  });
}

// ==========================================================
// GUARDAR
// ==========================================================
async function guardarPartida() {
  const datos = {
    version: 1,
    fecha: new Date().toISOString(),

    gameState: gameState,
    caminos: caminos,
    mejoras: mejoras,
    fiado: fiado,
    economia: economia,
    armaActual: armaActual,
    metasAlcanzadas: metasAlcanzadas
  };

  try {
    await firebaseListo();

    const id = obtenerIdJugador();
    const ref = window.firebaseDoc(window.firebaseDB, COLECCION_PARTIDAS, id);

    // Firestore no acepta objetos anidados con funciones ni undefined,
    // por eso se pasa por JSON (limpia todo lo que no sea dato puro).
    const datosLimpios = JSON.parse(JSON.stringify(datos));

    await window.firebaseSetDoc(ref, datosLimpios);
    return true;
  } catch (e) {
    console.error('No se pudo guardar la partida:', e);
    return false;
  }
}

// ==========================================================
// GUARDADO MANUAL (con feedback al jugador)
// ==========================================================
async function guardarPartidaManual() {
  sonidoClick();

  const ok = await guardarPartida();

  if (ok) {
    alert('Partida guardada.');
  } else {
    sonidoError();
    alert('No se pudo guardar la partida. Revisá tu conexión a internet.');
  }
}

// ==========================================================
// ¿HAY PARTIDA GUARDADA?
// Chequea si existe un documento en Firestore para este jugador.
// ==========================================================
async function haySartidaGuardada() {
  try {
    await firebaseListo();

    const id = obtenerIdJugador();
    const ref = window.firebaseDoc(window.firebaseDB, COLECCION_PARTIDAS, id);
    const snap = await window.firebaseGetDoc(ref);

    return snap.exists();
  } catch (e) {
    console.error('No se pudo chequear si hay partida guardada:', e);
    return false;
  }
}

// ==========================================================
// CARGAR
// ==========================================================
async function cargarPartida() {
  try {
    await firebaseListo();

    const id = obtenerIdJugador();
    const ref = window.firebaseDoc(window.firebaseDB, COLECCION_PARTIDAS, id);
    const snap = await window.firebaseGetDoc(ref);

    if (!snap.exists()) return false;

    const datos = snap.data();

    // Se pisan los valores dentro de los objetos existentes,
    // en vez de reasignar, porque son const y otros archivos
    // ya tienen referencias a ellos.
    Object.assign(gameState, datos.gameState);
    Object.assign(caminos, datos.caminos);
    Object.assign(mejoras, datos.mejoras);
    Object.assign(fiado, datos.fiado);
    Object.assign(economia, datos.economia);

    armaActual = datos.armaActual || 'manos';
    metasAlcanzadas = datos.metasAlcanzadas || 0;

    return true;
  } catch (e) {
    console.error('No se pudo cargar la partida:', e);
    return false;
  }
}

// ==========================================================
// BORRAR PARTIDA GUARDADA
// (útil para "Nueva partida" si ya hay una en curso)
// ==========================================================
async function borrarPartidaGuardada() {
  try {
    await firebaseListo();

    const id = obtenerIdJugador();
    const ref = window.firebaseDoc(window.firebaseDB, COLECCION_PARTIDAS, id);

    // setDoc con un objeto vacío no borra el documento de verdad,
    // así que se marca como "vacío" con una bandera propia.
    await window.firebaseSetDoc(ref, { vacio: true });
    return true;
  } catch (e) {
    console.error('No se pudo borrar la partida guardada:', e);
    return false;
  }
}

// ==========================================================
// MOSTRAR BOTÓN "CONTINUAR PARTIDA" SI CORRESPONDE
// Se ejecuta solo, apenas carga la página.
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btnContinuar');
  if (!btn) return;

  const hay = await haySartidaGuardada();
  if (hay) {
    btn.style.display = 'block';
  }
});