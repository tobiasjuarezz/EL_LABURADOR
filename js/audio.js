// ==========================================================
// AUDIO DEL JUEGO
// Manejo centralizado de todos los sonidos y música.
// Requiere la librería p5.sound.min.js cargada en el HTML.
// ==========================================================

const RUTA_AUDIO = 'src/audio/sonidos/';

const sonidos = {
  venta: null,
  error: null,
  click: null,
  ambiente: null,
  pasos: null,
  correr: null,
  corteluz: null,
  pasosImportante: null
};

const audioState = {
  cargado: false,
  musicaActiva: false,
  volumenGeneral: 0.7,
  volumenMusica: 0.35,
  volumenEfectos: 0.8,
  silenciado: false,
  pasosSonando: false
};

// ==========================================================
// CARGA (llamar desde preload() en juego.js)
// ==========================================================
function precargarAudio() {
  sonidos.venta = loadSound(RUTA_AUDIO + 'venta.mp3');
  sonidos.error = loadSound(RUTA_AUDIO + 'error.mp3');
  sonidos.click = loadSound(RUTA_AUDIO + 'click.mp3');
  sonidos.ambiente = loadSound(RUTA_AUDIO + 'ambiente.mp3');
  sonidos.pasos = loadSound(RUTA_AUDIO + 'pasos.mp3');
  sonidos.correr = loadSound(RUTA_AUDIO + 'correr.mp3');
  sonidos.corteluz = loadSound(RUTA_AUDIO + 'corteluz.mp3');
  sonidos.pasosImportante = loadSound(RUTA_AUDIO + 'pasos_importante.mp3');
}

function audioListoInicializar() {
  if (sonidos.ambiente) {
    sonidos.ambiente.setLoop(true);
    sonidos.ambiente.setVolume(audioState.volumenMusica);
  }
  if (sonidos.pasos) sonidos.pasos.setLoop(true);
  if (sonidos.correr) sonidos.correr.setLoop(true);
  if (sonidos.pasosImportante) sonidos.pasosImportante.setLoop(true);

  audioState.cargado = true;
}

// ==========================================================
// EFECTOS PUNTUALES
// ==========================================================
function reproducirSonido(nombre, volumenExtra = 1) {
  if (audioState.silenciado) return;
  const s = sonidos[nombre];
  if (!s || !s.isLoaded()) return;

  s.setVolume(audioState.volumenEfectos * audioState.volumenGeneral * volumenExtra);
  s.play();
}

function sonidoVenta() {
  reproducirSonido('venta');
}

function sonidoError() {
  reproducirSonido('error');
}

function sonidoClick() {
  reproducirSonido('click', 0.6);
}

function sonidoCorteLuz() {
  reproducirSonido('corteluz');
}

function sonidoPasosImportante() {
  reproducirSonido('pasosImportante', 0.7);
}


// ==========================================================
// MÚSICA DE AMBIENTE
// ==========================================================
function iniciarMusicaAmbiente() {
  if (!sonidos.ambiente || !sonidos.ambiente.isLoaded()) return;
  if (audioState.silenciado) return;
  if (sonidos.ambiente.isPlaying()) return;

  sonidos.ambiente.setVolume(audioState.volumenMusica * audioState.volumenGeneral);
  sonidos.ambiente.play();
  audioState.musicaActiva = true;
}

function detenerMusicaAmbiente() {
  if (sonidos.ambiente && sonidos.ambiente.isPlaying()) {
    sonidos.ambiente.stop();
  }
  audioState.musicaActiva = false;
}

// ==========================================================
// PASOS (caminar / correr)
// Llamar cada frame desde el loop de movimiento con el estado actual.
// "importante" = true cuando el que camina es un cliente recurrente
// / personaje importante, en vez del jugador genérico.
// ==========================================================
function actualizarSonidoPasos(seMueve, corriendo, importante = false) {
  if (audioState.silenciado || !audioState.cargado) return;

  const sonidoPasosNormal = importante ? sonidos.pasosImportante : sonidos.pasos;

  if (!seMueve) {
    if (sonidos.pasos.isPlaying()) sonidos.pasos.stop();
    if (sonidos.correr.isPlaying()) sonidos.correr.stop();
    if (sonidos.pasosImportante.isPlaying()) sonidos.pasosImportante.stop();
    audioState.pasosSonando = false;
    return;
  }

  if (corriendo && !importante) {
    // Correr solo aplica al jugador; los personajes importantes
    // usan siempre su propio paso, sin variante de "correr".
    if (sonidoPasosNormal.isPlaying()) sonidoPasosNormal.stop();
    if (!sonidos.correr.isPlaying()) {
      sonidos.correr.setVolume(audioState.volumenEfectos * audioState.volumenGeneral * 0.5);
      sonidos.correr.play();
    }
  } else {
    if (sonidos.correr.isPlaying()) sonidos.correr.stop();
    if (!sonidoPasosNormal.isPlaying()) {
      sonidoPasosNormal.setVolume(audioState.volumenEfectos * audioState.volumenGeneral * 0.4);
      sonidoPasosNormal.play();
    }
  }
  audioState.pasosSonando = true;
}

// ==========================================================
// CONTROL GENERAL
// ==========================================================
function alternarSilencio() {
  audioState.silenciado = !audioState.silenciado;

  if (audioState.silenciado) {
    detenerMusicaAmbiente();
    if (sonidos.pasos.isPlaying()) sonidos.pasos.stop();
    if (sonidos.correr.isPlaying()) sonidos.correr.stop();
    if (sonidos.pasosImportante.isPlaying()) sonidos.pasosImportante.stop();
  } else {
    iniciarMusicaAmbiente();
  }

  return audioState.silenciado;
}

function ajustarVolumenGeneral(valor) {
  audioState.volumenGeneral = constrain(valor, 0, 1);
  if (sonidos.ambiente) {
    sonidos.ambiente.setVolume(audioState.volumenMusica * audioState.volumenGeneral);
  }
}