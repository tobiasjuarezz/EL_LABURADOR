// ==========================================================
// LA GENTE DEL BARRIO (modelos hechos en Blender)
// Cada persona son 5 piezas: el cuerpo, dos brazos y dos
// piernas. Los brazos giran desde el hombro y las piernas
// desde la cadera (ese punto se llama "pivote"), así se
// puede animar la caminata moviendo solo esas piezas.
// Las 5 piezas comparten una misma textura horneada.
// ==========================================================

const RUTA_PERSONAS = 'src/modelos/personas/';

const PERSONAS = [
  'vecina', 'marian', 'pibe', 'senor', 'capo', 'malandro',
  'ladron', 'policia', 'abogado', 'piba', 'flaco', 'rubio'
];
const PIEZAS = ['cuerpo', 'brazo_izq', 'brazo_der', 'pierna_izq', 'pierna_der'];

// Dónde está el hombro y la cadera de cada uno [x, y, z].
// Estos números salen de Blender (cada persona tiene su altura).
const PIVOTES_PERSONAS = {
  vecina:    { brazo_izq: [-21.2, -127.8, 0], brazo_der: [21.2, -127.8, 0], pierna_izq: [-10.4, -82.2, 0], pierna_der: [10.4, -82.2, 0] },
  marian:    { brazo_izq: [-17.6, -130.2, 0], brazo_der: [17.6, -130.2, 0], pierna_izq: [-8.6, -83.7, 0], pierna_der: [8.6, -83.7, 0] },
  pibe:      { brazo_izq: [-16.9, -141.6, 0], brazo_der: [16.9, -141.6, 0], pierna_izq: [-8.3, -91, 0], pierna_der: [8.3, -91, 0] },
  senor:     { brazo_izq: [-18.9, -135.1, 0], brazo_der: [18.9, -135.1, 0], pierna_izq: [-9.2, -86.9, 0], pierna_der: [9.2, -86.9, 0] },
  capo:      { brazo_izq: [-22.5, -151.4, 0], brazo_der: [22.5, -151.4, 0], pierna_izq: [-11, -97.3, 0], pierna_der: [11, -97.3, 0] },
  malandro:  { brazo_izq: [-17.3, -140, 0], brazo_der: [17.3, -140, 0], pierna_izq: [-8.4, -90, 0], pierna_der: [8.4, -90, 0] },
  ladron:    { brazo_izq: [-19.4, -141.6, 0], brazo_der: [19.4, -141.6, 0], pierna_izq: [-9.5, -91, 0], pierna_der: [9.5, -91, 0] },
  policia:   { brazo_izq: [-19.8, -146.5, 0], brazo_der: [19.8, -146.5, 0], pierna_izq: [-9.7, -94.2, 0], pierna_der: [9.7, -94.2, 0] },
  abogado:   { brazo_izq: [-16.2, -144.9, 0], brazo_der: [16.2, -144.9, 0], pierna_izq: [-7.9, -93.1, 0], pierna_der: [7.9, -93.1, 0] },
  piba:      { brazo_izq: [-18.7, -131.9, 0], brazo_der: [18.7, -131.9, 0], pierna_izq: [-9.2, -84.8, 0], pierna_der: [9.2, -84.8, 0] },
  flaco:     { brazo_izq: [-16.2, -135.1, 0], brazo_der: [16.2, -135.1, 0], pierna_izq: [-7.9, -86.9, 0], pierna_der: [7.9, -86.9, 0] },
  rubio:     { brazo_izq: [-18, -151.4, 0], brazo_der: [18, -151.4, 0], pierna_izq: [-8.8, -97.3, 0], pierna_der: [8.8, -97.3, 0] }
};

// nombre -> { tex, piezas: { cuerpo: p5.Geometry, ... }, listo }
const MODELOS_PERSONAS = {};

function cargarPersonas3D() {
  for (const nombre of PERSONAS) {
    const p = { tex: null, piezas: {}, faltan: PIEZAS.length + 1, listo: false };
    MODELOS_PERSONAS[nombre] = p;

    // Cada archivo que llega descuenta uno; con 0 está completa
    const llego = () => {
      p.faltan--;
      if (p.faltan === 0) p.listo = true;
    };

    loadImage(RUTA_PERSONAS + 'persona_' + nombre + '.png',
      img => { p.tex = img; llego(); },
      () => console.warn('No cargó la textura de ' + nombre));

    for (const pieza of PIEZAS) {
      loadModel(RUTA_PERSONAS + 'persona_' + nombre + '_' + pieza + '.obj', false,
        geo => { p.piezas[pieza] = geo; llego(); },
        () => console.warn('No cargó ' + nombre + ' (' + pieza + ')'));
    }
  }
}

function personaLista(nombre) {
  return MODELOS_PERSONAS[nombre] !== undefined && MODELOS_PERSONAS[nombre].listo;
}

// ----------------------------------------------------------
// Dibuja una persona parada en el piso de la vereda.
//   giro:  hacia dónde mira (0 = hacia la calle, 180 = hacia
//          el kiosco, 90 / -90 = caminando a los costados)
//   modo:  'caminar', 'quieto' o 'barrer'
//   vel:   cuánto avanza por frame (el paso se sincroniza con
//          eso, así no "patina" sobre la vereda)
// ----------------------------------------------------------
function dibujarPersona(nombre, x, z, giro, modo = 'quieto', vel = 0.5, desfase = 0) {
  const p = MODELOS_PERSONAS[nombre];
  const piv = PIVOTES_PERSONAS[nombre];
  const t = frameCount + desfase;

  let piernas = 0, brazos = 0, rebote = 0;
  let brazoDer = null;   // si no es null, el brazo derecho hace otra cosa

  if (modo === 'caminar') {
    const fase = t * Math.abs(vel) * 3.2;   // en grados
    piernas = sin(fase) * 26;
    brazos  = sin(fase) * 18;
    rebote  = Math.abs(cos(fase)) * 2.2;    // sube y baja en cada paso
  } else if (modo === 'barrer') {
    brazoDer = sin(t * 4) * 16 - 4;         // va y viene con la escoba
    brazos   = sin(t * 4) * 5;
  } else {
    brazos = sin(t * 1.2) * 2;              // respira: casi no se mueve
  }

  push();
  translate(x, 218 - rebote, z);            // 218 = altura de la vereda
  rotateY(giro);
  noStroke();
  texture(p.tex);
  model(p.piezas.cuerpo);

  // Pierna y brazo del mismo lado van al revés (como al caminar de verdad)
  dibujarPieza(p, 'pierna_izq', piv.pierna_izq,  piernas);
  dibujarPieza(p, 'pierna_der', piv.pierna_der, -piernas);
  dibujarPieza(p, 'brazo_izq',  piv.brazo_izq,  -brazos);
  dibujarPieza(p, 'brazo_der',  piv.brazo_der,  brazoDer !== null ? brazoDer : brazos);
  pop();

  sombraEnPiso(x, z, 60, 45);
}

// Una pieza: se va al pivote, se gira y se dibuja
function dibujarPieza(p, pieza, pivote, angulo) {
  push();
  translate(pivote[0], pivote[1], pivote[2]);
  rotateX(angulo);
  model(p.piezas[pieza]);
  pop();
}

// ----------------------------------------------------------
// Alguien que cruza la vereda de punta a punta y reaparece
// del otro lado. vel > 0 va hacia la derecha, vel < 0 hacia
// la izquierda.
// ----------------------------------------------------------
function dibujarCaminante(nombre, vel, z, desfase) {
  if (!personaLista(nombre)) return;
  const recorrido = (frameCount * Math.abs(vel) + desfase) % 2400;
  const x = vel > 0 ? recorrido - 1200 : 1200 - recorrido;
  dibujarPersona(nombre, x, z, vel > 0 ? 90 : -90, 'caminar', vel, desfase);
}

// ----------------------------------------------------------
// Personajes con comportamiento propio (guardan su estado)
// ----------------------------------------------------------

// El jubilado camina lento y cada tanto se frena a descansar
let senorX = -900;
function dibujarSenor() {
  if (!personaLista('senor')) return;
  const descansando = sin(frameCount * 0.6) > 0.75;
  if (!descansando) senorX += 0.28;
  if (senorX > 1200) senorX = -1200;
  dibujarPersona('senor', senorX, 430, 90, descansando ? 'quieto' : 'caminar', 0.28);
}

// El chorro: pasa despacio, se frena frente a la ventanita
// y se queda mirando el kiosco unos segundos. Después sigue.
let ladronX = -1200;
let ladronEspera = 0;
let ladronYaMiro = false;
function dibujarLadron() {
  if (!personaLista('ladron')) return;

  if (ladronEspera > 0) {
    ladronEspera--;
    dibujarPersona('ladron', ladronX, 535, 180, 'quieto');
    return;
  }

  ladronX += 0.6;
  if (!ladronYaMiro && ladronX > -20) {
    ladronEspera = 60 * 6;   // 6 segundos mirando
    ladronYaMiro = true;
  }
  if (ladronX > 1200) {      // da la vuelta a la manzana y vuelve a pasar
    ladronX = -1200;
    ladronYaMiro = false;
  }
  dibujarPersona('ladron', ladronX, 535, 90, 'caminar', 0.6);
}

// Todos los de la vereda que no son el policía, el abogado ni el capo
function dibujarGenteDelBarrio() {
  // Los que pasan caminando
  dibujarCaminante('marian', 0.5, 450, 0);
  dibujarCaminante('pibe', -0.8, 500, 700);
  dibujarCaminante('flaco', 0.65, 515, 1500);
  dibujarCaminante('rubio', -0.55, 470, 300);
  dibujarSenor();
  dibujarLadron();

  // Los que están quietos
  if (personaLista('vecina'))   dibujarPersona('vecina', -950, 455, 120, 'barrer');       // Doña Rosa barre su vereda
  if (personaLista('malandro')) dibujarPersona('malandro', 330, 505, 115, 'quieto', 0, 40); // charlando en la esquina
  if (personaLista('piba'))     dibujarPersona('piba', 420, 500, -105, 'quieto', 0, 90);
}
