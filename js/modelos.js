// ==========================================================
// MODELOS 3D HECHOS EN BLENDER
// Cada objeto (heladera, góndola, productos) se modeló en
// Blender y se exportó como .obj + una imagen con su textura.
// En la textura ya viene "horneada" la sombra de contacto
// (oclusión ambiental), así que se ven con volumen real.
//
// Se cargan DESPUÉS de setup(), sin trabar el arranque:
// mientras no terminan de bajar (o si falla alguno), el juego
// sigue usando los dibujos viejos hechos con box() y cylinder().
// ==========================================================

const RUTA_MODELOS  = 'src/modelos/';
const RUTA_TEXTURAS = 'src/texturas/';

// nombre del .obj  →  imagen con su textura
const LISTA_MODELOS = {
  heladera:     'heladera.png',      // gabinete, marco y manija
  heladera_luz: 'heladera_luz.jpg',  // interior con luz propia
  gondola:      'gondola.jpg',       // machimbre, estante y panel perforado
  gondola_deco: 'gondola_deco.png',  // tiras de golosinas, cartel y reloj
  alfajor:      'alfajor.png',
  chocolate:    'chocolate.png',
  chicles:      'chicles.png',
  gaseosa:      'gaseosa.png',
  agua:         'agua.png',
  jugo:         'jugo.png',
  papas:        'papas.png',
  palitos:      'palitos.png'
};

// Acá se van guardando a medida que cargan:
// MODELOS.heladera = { geo: p5.Geometry, tex: p5.Image, listo: true }
const MODELOS = {};

function cargarModelos3D() {
  for (const nombre in LISTA_MODELOS) {
    const m = { geo: null, tex: null, listo: false };
    MODELOS[nombre] = m;

    // El modelo está listo recién cuando llegaron LAS DOS partes
    const revisar = () => { m.listo = (m.geo !== null && m.tex !== null); };

    loadModel(RUTA_MODELOS + nombre + '.obj', false,
      geo => { m.geo = geo; revisar(); },
      () => console.warn('No cargó el modelo ' + nombre + ': se usa el dibujo viejo')
    );
    loadImage(RUTA_MODELOS + LISTA_MODELOS[nombre],
      img => { m.tex = img; revisar(); },
      () => console.warn('No cargó la textura de ' + nombre)
    );
  }

  // Texturas de materiales renderizadas en Blender: cuando llegan,
  // reemplazan a las procedurales de generarTexturas().
  cargarTexturaMaterial('madera.jpg',        img => texturaMadera = img);
  cargarTexturaMaterial('madera_oscura.jpg', img => texturaMaderaOscura = img);
  cargarTexturaMaterial('pared.jpg',         img => texturaPared = img);
  cargarTexturaMaterial('metal.jpg',         img => texturaMetal = img);
  cargarTexturaMaterial('piso.jpg',          img => texturaPisoDetalle = img);

  // La gente del barrio (está en personas.js)
  cargarPersonas3D();

  // La calle de la villa y la reja del kiosco (están en calle3d.js)
  cargarCalle3D();
}

function cargarTexturaMaterial(archivo, alCargar) {
  loadImage(RUTA_TEXTURAS + archivo, alCargar,
    () => console.warn('No cargó ' + archivo + ': queda la textura procedural'));
}

function modeloListo(nombre) {
  return MODELOS[nombre] !== undefined && MODELOS[nombre].listo;
}

// Dibuja un modelo en la posición actual (usar dentro de push/pop)
function dibujarModelo(nombre) {
  const m = MODELOS[nombre];
  noStroke();
  texture(m.tex);
  model(m.geo);
}

// Para cosas con luz propia ya horneada (interior de la heladera):
// se apagan las luces de la escena solo para este objeto, así se
// ve la imagen tal cual salió de Blender. pop() las vuelve a prender.
function dibujarModeloConLuzPropia(nombre) {
  push();
  noLights();
  dibujarModelo(nombre);
  pop();
}

// ==========================================================
// CÓMO SE ACOMODA CADA PRODUCTO EN SU CASILLERO
// Devuelve la posición de la unidad número u (0 a 5) relativa
// al centro del casillero. Las botellas van en dos filas, las
// bolsas paradas una detrás de otra y los alfajores en pilas.
// ==========================================================
function acomodoProducto(id, u) {
  const fila = Math.floor(u / 3);   // 0 = adelante, 1 = atrás
  const col  = u % 3;               // 0, 1, 2

  switch (id) {
    case 'gaseosa':
    case 'agua':
    case 'jugo':
      return { x: (col - 1) * 34, y: 0, z: fila === 0 ? 16 : -18, giro: (u * 37) % 20 - 10, inclina: 0 };

    case 'papas':
    case 'palitos':
      // dos por fila, tres filas; un poco recostadas hacia atrás
      return { x: u % 2 === 0 ? -26 : 26, y: 0, z: 22 - Math.floor(u / 2) * 20, giro: (u % 2 === 0 ? 4 : -4), inclina: -8 };

    case 'alfajor':
      // dos pilas de tres
      return { x: u % 2 === 0 ? -24 : 24, y: -Math.floor(u / 2) * 9, z: 2, giro: u * 23, inclina: 0 };

    case 'chocolate':
      // dos pilas de tabletas, apenas desordenadas
      return { x: u % 2 === 0 ? -28 : 28, y: -Math.floor(u / 2) * 6.6, z: 2, giro: (u % 3 - 1) * 5, inclina: 0 };

    case 'chicles':
      return { x: u % 2 === 0 ? -22 : 22, y: 0, z: 20 - Math.floor(u / 2) * 20, giro: 0, inclina: 0 };
  }
  return { x: 0, y: -u * 15, z: 0, giro: 0, inclina: 0 };
}
