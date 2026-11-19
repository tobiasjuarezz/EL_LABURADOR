// ==========================================================
// LA CALLE DE LA VILLA (modelos hechos en Blender)
//
// La calle entera (edificios, postes, cables, autos, escombros
// y el piso) se armó en Blender y se "horneó" la luz de noche:
// los faroles, las ventanas prendidas y la luz que sale del
// kiosco ya vienen pintados en cada textura, con sus sombras.
//
// Por eso se dibuja con noLights(): si p5 la iluminara de nuevo,
// la luz se sumaría dos veces. Además p5 solo admite 5 luces
// puntuales, y el kiosco ya usa esas 5 adentro.
// ==========================================================

const RUTA_CALLE = 'src/modelos/calle/';

const PIEZAS_CALLE = [
  'fondo',                                   // la villa a lo lejos
  'piso',                                    // cemento roto, charcos, basura
  'edificio1', 'edificio2', 'edificio3', 'edificio4',
  'edificio5', 'edificio6', 'edificio7', 'edificio8',
  'postes',                                  // postes de luz y la maraña de cables
  'props'                                    // auto, moto, puestito, escombros...
];

// nombre -> { geo, tex, listo }
const CALLE = {};

// El alambrado romboidal es una textura con transparencia que
// se repite sobre un rectángulo (sería muy pesado modelar cada alambre).
let texAlambrado = null;
const TAM_ALAMBRADO = 30;   // cuántas unidades del juego mide la textura (4 rombos)

// Paneles de alambrado del baldío de enfrente: [x0, x1, yArriba, yAbajo, z]
// (los calculó el script de Blender, para que calcen con los caños)
const ALAMBRADOS_CALLE = [
  [165, 325, -0, 212, 1180],
  [5, 165, -0, 212, 1180]
];

// La reja del kiosco: caños oxidados (modelo) + alambrado (textura).
// Deja abierta la ventanita del medio para atender.
const REJA_KIOSCO = { geo: null, tex: null, listo: false };
const PANELES_REJA_KIOSCO = [
  [-450, -70, -160, 205],   // izquierda
  [70, 450, -160, 205],     // derecha
  [-70, 70, -160, 105]      // arriba de la ventanita
];
const Z_REJA_KIOSCO = 344;

function cargarCalle3D() {
  for (const nombre of PIEZAS_CALLE) {
    const p = { geo: null, tex: null, listo: false };
    CALLE[nombre] = p;
    const revisar = () => { p.listo = (p.geo !== null && p.tex !== null); };

    loadModel(RUTA_CALLE + 'calle_' + nombre + '.obj', false,
      geo => { p.geo = geo; revisar(); },
      () => console.warn('No cargó la calle (' + nombre + '): queda la calle vieja'));
    loadImage(RUTA_CALLE + 'calle_' + nombre + '.jpg',
      img => { p.tex = img; revisar(); },
      () => console.warn('No cargó la textura de ' + nombre));
  }

  loadImage(RUTA_CALLE + 'alambrado.png', img => { texAlambrado = img; });

  loadModel(RUTA_CALLE + 'reja_kiosco.obj', false, geo => {
    REJA_KIOSCO.geo = geo;
    REJA_KIOSCO.listo = REJA_KIOSCO.tex !== null;
  });
  loadImage(RUTA_CALLE + 'reja_kiosco.png', img => {
    REJA_KIOSCO.tex = img;
    REJA_KIOSCO.listo = REJA_KIOSCO.geo !== null;
  });
}

// La calle nueva se usa recién cuando llegaron TODAS sus piezas:
// así nunca se ve una mezcla de calle vieja y nueva.
function calleLista() {
  return PIEZAS_CALLE.every(n => CALLE[n] && CALLE[n].listo);
}

function rejaKioscoLista() {
  return REJA_KIOSCO.listo && texAlambrado !== null;
}

// ----------------------------------------------------------
// Dibuja toda la calle
// ----------------------------------------------------------
function dibujarCalle3D() {
  push();
  noLights();
  noStroke();

  // Con más estrés la calle se ve más oscura y rojiza,
  // igual que la luz de adentro del kiosco.
  const e = gameState.estres / 100;
  tint(215 + e * 25, 205 - e * 45, 195 - e * 60);

  for (const nombre of PIEZAS_CALLE) {
    push();
    // El piso de la calle queda a la misma altura que el del kiosco:
    // se sube 1 unidad para que no se "pisen" (parpadeo en la vereda).
    if (nombre === 'piso') translate(0, -1, 0);
    texture(CALLE[nombre].tex);
    model(CALLE[nombre].geo);
    pop();
  }
  noTint();
  pop();
}

// Cielo de noche detrás de todo: azul oscuro arriba y el naranja
// de la contaminación lumínica abajo, sobre el horizonte.
function dibujarCieloNoche() {
  push();
  noLights();
  noStroke();
  translate(0, -900, 3400);
  const franjas = 14;
  const alto = 4200 / franjas;
  for (let i = 0; i < franjas; i++) {
    const t = i / (franjas - 1);
    push();
    translate(0, -2100 + alto * i + alto / 2, 0);
    fill(10 + t * 70, 12 + t * 38, 30 + t * 4);
    plane(12000, alto + 2);
    pop();
  }
  pop();
}

// ----------------------------------------------------------
// ALAMBRADO: un rectángulo con la textura repetida.
// textureMode(NORMAL) hace que u y v vayan de 0 a 1 por cada
// repetición; con textureWrap(REPEAT), u = 3.5 significa
// "tres repeticiones y media".
// ----------------------------------------------------------
function dibujarAlambrado(x0, x1, y0, y1, z) {
  textureMode(NORMAL);
  texture(texAlambrado);
  beginShape();
  vertex(x0, y0, z, x0 / TAM_ALAMBRADO, y0 / TAM_ALAMBRADO);
  vertex(x1, y0, z, x1 / TAM_ALAMBRADO, y0 / TAM_ALAMBRADO);
  vertex(x1, y1, z, x1 / TAM_ALAMBRADO, y1 / TAM_ALAMBRADO);
  vertex(x0, y1, z, x0 / TAM_ALAMBRADO, y1 / TAM_ALAMBRADO);
  endShape(CLOSE);
  textureMode(IMAGE);
}

// El alambrado del baldío (lejos, del otro lado de la calle).
// depthMask(false): los huecos transparentes no "tapan" lo que
// se dibuja después (si no, la niebla no se vería detrás).
function dibujarAlambradosCalle() {
  if (!texAlambrado) return;
  push();
  noLights();
  noStroke();
  tint(150, 140, 130);   // de noche, más apagado
  textureWrap(REPEAT);
  drawingContext.depthMask(false);
  for (const [x0, x1, y0, y1, z] of ALAMBRADOS_CALLE) {
    dibujarAlambrado(x0, x1, y0, y1, z);
  }
  drawingContext.depthMask(true);
  textureWrap(CLAMP);
  noTint();
  pop();
}

// La reja del kiosco va ÚLTIMA en la escena: como el alambrado
// es transparente, todo lo que está detrás (la calle, la gente)
// tiene que estar dibujado antes para verse entre los rombos.
function dibujarRejaKiosco3D() {
  push();
  noStroke();

  // Caños del marco (los ilumina la luz del kiosco)
  push();
  texture(REJA_KIOSCO.tex);
  model(REJA_KIOSCO.geo);
  pop();

  // Alambrado
  textureWrap(REPEAT);
  for (const [x0, x1, y0, y1] of PANELES_REJA_KIOSCO) {
    dibujarAlambrado(x0, x1, y0, y1, Z_REJA_KIOSCO);
  }
  textureWrap(CLAMP);
  pop();
}
