// ==========================================================
// ESCENA 3D
// Todo el dibujado del local, la calle y los personajes.
// Recordá: en p5.js el eje Y crece hacia ABAJO.
// El piso está en y=220.
// ==========================================================
 
// Colores al azar para la mercadería de relleno de los estantes.
// Se generan UNA sola vez para que no titilen en cada frame.
let coloresClutter = [];
 
function generarColoresClutter() {
  const base = [
    [140, 36, 34], [156, 126, 28], [40, 96, 56], [150, 82, 24],
    [136, 56, 96], [76, 56, 128], [42, 104, 126], [150, 150, 150],
    [34, 56, 100], [128, 38, 84], [160, 140, 62], [56, 114, 56]
  ];
  coloresClutter = [];
  for (let i = 0; i < 80; i++) {
    coloresClutter.push(base[Math.floor(Math.random() * base.length)]);
  }
}
 
// ==========================================================
// TEXTURAS PROCEDURALES
// No hay imágenes: las texturas se dibujan una sola vez en un
// lienzo aparte (createGraphics) y se aplican con texture().
// Así la madera, la pared y el piso dejan de verse como
// plástico liso, sin bajar el rendimiento (se generan una vez).
// ==========================================================
let texturaMadera, texturaMaderaOscura, texturaPared, texturaMetal, texturaPisoDetalle;
 
function generarTexturas() {
  texturaMadera       = crearTexturaMadera(256, 256, PALETA.maderaClara);
  texturaMaderaOscura = crearTexturaMadera(256, 256, PALETA.maderaOscura);
  texturaPared        = crearTexturaPared(256, 256);
  texturaMetal        = crearTexturaMetal(128, 128);
  texturaPisoDetalle  = crearTexturaPiso(256, 256);
}
 
// Vetas de madera: franjas horizontales de tono variable más
// líneas onduladas finas, como el grano cortado al hilo.
function crearTexturaMadera(w, h, colorBase) {
  const pg = createGraphics(w, h);
  pg.noStroke();
  pg.background(...colorBase);
 
  // Franjas de tono para simular tablas distintas
  const franjas = 6;
  for (let i = 0; i < franjas; i++) {
    const fx = (w / franjas) * i;
    const variacion = -14 + Math.random() * 28;
    pg.fill(
      constrain(colorBase[0] + variacion, 0, 255),
      constrain(colorBase[1] + variacion, 0, 255),
      constrain(colorBase[2] + variacion, 0, 255)
    );
    pg.rect(fx, 0, w / franjas + 1, h);
  }
 
  // Vetas onduladas finas
  pg.stroke(colorBase[0] * 0.55, colorBase[1] * 0.55, colorBase[2] * 0.55, 90);
  pg.strokeWeight(1);
  pg.noFill();
  for (let y = 4; y < h; y += 7) {
    pg.beginShape();
    for (let x = 0; x <= w; x += 16) {
      const off = Math.sin((x + y * 3) * 0.04) * 3 + Math.sin(x * 0.13 + y) * 1.5;
      pg.vertex(x, y + off);
    }
    pg.endShape();
  }
 
  // Algún nudo de madera ocasional
  pg.noStroke();
  for (let i = 0; i < 3; i++) {
    const nx = Math.random() * w, ny = Math.random() * h;
    pg.fill(colorBase[0] * 0.5, colorBase[1] * 0.5, colorBase[2] * 0.5, 140);
    pg.ellipse(nx, ny, 10, 16);
    pg.fill(colorBase[0] * 0.4, colorBase[1] * 0.4, colorBase[2] * 0.4, 160);
    pg.ellipse(nx, ny, 4, 7);
  }
 
  return pg;
}
 
// Pared revocada: ruido suave + alguna mancha/grieta sutil.
function crearTexturaPared(w, h) {
  const pg = createGraphics(w, h);
  pg.noStroke();
  pg.background(255);
 
  pg.loadPixels();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = 210 + Math.random() * 45;
      const idx = 4 * (y * w + x);
      pg.pixels[idx] = n;
      pg.pixels[idx + 1] = n;
      pg.pixels[idx + 2] = n;
      pg.pixels[idx + 3] = 255;
    }
  }
  pg.updatePixels();
 
  // Manchas de humedad / desgaste, muy sutiles
  for (let i = 0; i < 5; i++) {
    pg.fill(0, 0, 0, 12);
    pg.ellipse(Math.random() * w, Math.random() * h, 60 + Math.random() * 80, 40 + Math.random() * 60);
  }
  // Grietas finas ocasionales
  pg.stroke(0, 0, 0, 30);
  pg.strokeWeight(1);
  for (let i = 0; i < 3; i++) {
    let x = Math.random() * w, y = Math.random() * h;
    pg.noFill();
    pg.beginShape();
    for (let s = 0; s < 6; s++) {
      pg.vertex(x, y);
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
    }
    pg.endShape();
  }
 
  return pg;
}
 
// Metal cepillado: franjas horizontales muy sutiles + algún rayón.
function crearTexturaMetal(w, h) {
  const pg = createGraphics(w, h);
  pg.noStroke();
  pg.background(150, 150, 156);
 
  for (let y = 0; y < h; y++) {
    const n = 130 + Math.random() * 50;
    pg.stroke(n, n, n + 4);
    pg.line(0, y, w, y);
  }
  pg.stroke(255, 255, 255, 40);
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * h;
    pg.line(0, y, w, y + (Math.random() - 0.5) * 4);
  }
 
  return pg;
}
 
// Baldosa: leve variación de tono + línea de pastina, para que
// el piso a cuadros no se vea perfectamente plano.
function crearTexturaPiso(w, h) {
  const pg = createGraphics(w, h);
  pg.noStroke();
  pg.background(255);
 
  pg.loadPixels();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = 225 + Math.random() * 30;
      const idx = 4 * (y * w + x);
      pg.pixels[idx] = n;
      pg.pixels[idx + 1] = n;
      pg.pixels[idx + 2] = n;
      pg.pixels[idx + 3] = 255;
    }
  }
  pg.updatePixels();
 
  pg.stroke(0, 0, 0, 45);
  pg.strokeWeight(3);
  pg.line(0, 0, w, 0);
  pg.line(0, 0, 0, h);
  pg.line(0, h - 1, w, h - 1);
  pg.line(w - 1, 0, w - 1, h);
 
  return pg;
}
 
// ==========================================================
// EL LOCAL
// ==========================================================
 
// Piso de baldosas: dos bucles anidados forman un damero
function dibujarPiso() {
  const filas = 16, columnas = 21, tam = 90;
  const inicioX = -((columnas - 1) * tam) / 2;
  const inicioZ = -((filas - 1) * tam) / 2 - 60;
 
  push();
  rotateX(90);   // acuesta el plano para que quede horizontal
  noStroke();
 
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      push();
      translate(inicioX + c * tam, inicioZ + f * tam, -220);
      // Si la suma de fila y columna es par, un color; si no, el otro
      const colorBaldosa = (f + c) % 2 === 0 ? PALETA.pisoClaro : PALETA.pisoOscuro;
      if (texturaPisoDetalle) {
        // Textura de pastina/desgaste + tinte del color de la baldosa
        tint(...colorBaldosa);
        texture(texturaPisoDetalle);
      } else {
        fill(...colorBaldosa);
      }
      plane(tam - 2, tam - 2);
      noTint();
      pop();
    }
  }
  pop();
}
 
function dibujarParedes() {
  const anchoTotal   = 1800;
  const alturaPared  = 520;
  const profundidad  = 1000;
 
  // Pared del fondo, con revoque texturado en vez de color plano
  push();
  translate(0, 220 - alturaPared / 2, -640);
  if (texturaPared) { tint(...PALETA.paredClara); texture(texturaPared); }
  else fill(...PALETA.paredClara);
  box(anchoTotal, alturaPared, 20);
  noTint();
  pop();
 
  // Viga de madera, con veta real
  push();
  translate(0, 60 - alturaPared / 2, -630);
  if (texturaMaderaOscura) texture(texturaMaderaOscura);
  else fill(...PALETA.viga);
  box(anchoTotal, 24, 24);
  pop();
 
  // Paredes laterales
  for (const dx of [-anchoTotal / 2, anchoTotal / 2]) {
    push();
    translate(dx, 220 - alturaPared / 2, -160);
    if (texturaPared) { tint(...PALETA.paredSombra); texture(texturaPared); }
    else fill(...PALETA.paredSombra);
    box(20, alturaPared, profundidad);
    noTint();
    pop();
  }
 
  // Techo, con leve textura para que no se vea liso desde abajo
  push();
  translate(0, 220 - alturaPared, -160);
  if (texturaMetal) { tint(60, 54, 48); texture(texturaMetal); }
  else fill(42, 38, 34);
  box(anchoTotal, 16, profundidad);
  noTint();
  pop();
 
  // --- Zócalo: franja oscura donde la pared toca el piso.       ---
  // Rompe la unión perfecta entre pared y piso y ancla la escena.
  push();
  translate(0, 208, -630);
  fill(...PALETA.zocalo);
  box(anchoTotal - 20, 22, 6);
  pop();
  for (const dx of [-anchoTotal / 2 + 10, anchoTotal / 2 - 10]) {
    push();
    translate(dx, 208, -160);
    fill(...PALETA.zocalo);
    box(6, 22, profundidad - 20);
    pop();
  }
 
  // --- Moldura superior: donde la pared se encuentra con el techo ---
  push();
  translate(0, 220 - alturaPared + 10, -636);
  fill(...PALETA.moldura);
  box(anchoTotal, 10, 8);
  pop();
}
 
// La fachada con la ventanita.
// Para hacer un "hueco" no existe una operación directa en 3D:
// se dibuja la pared en 4 pedazos alrededor del vacío.
function dibujarFachadaConVentana() {
  const zFachada    = 360;
  const alturaPared = 520;
 
  // Panel izquierdo
  push();
  translate(-680, -50, zFachada);
  if (texturaPared) { tint(...PALETA.paredClara); texture(texturaPared); }
  else fill(...PALETA.paredClara);
  box(440, alturaPared, 20);
  noTint();
  pop();
 
  // Panel derecho
  push();
  translate(680, -50, zFachada);
  if (texturaPared) { tint(...PALETA.paredClara); texture(texturaPared); }
  else fill(...PALETA.paredClara);
  box(440, alturaPared, 20);
  noTint();
  pop();
 
  // Dintel (arriba del hueco)
  push();
  translate(0, -230, zFachada);
  fill(...PALETA.paredSombra);
  box(920, 140, 20);
  pop();
 
  // Antepecho (abajo del hueco)
  push();
  translate(0, 212, zFachada);
  fill(...PALETA.paredSombra);
  box(920, 15, 20);
  pop();
 
  // Marcos de acento, con un poco de brillo metálico
  for (const y of [-160, 205]) {
    push();
    translate(0, y, zFachada + 3);
    ambientMaterial(...PALETA.neon);
    specularMaterial(...PALETA.neon);
    shininess(30);
    box(920, 8, 4);
    pop();
  }
 
  // Repisa exterior donde se apoyan los clientes, con veta de madera
  push();
  translate(0, 205, zFachada + 22);
  if (texturaMadera) texture(texturaMadera);
  else fill(...PALETA.viga);
  box(920, 14, 40);
  pop();
 
  dibujarRejas(zFachada);
  dibujarToldo(zFachada);
  dibujarCartelTienda(zFachada);
}
 
// --- Toldo a rayas sobre la ventanita: le da carácter de "kiosco de barrio" ---
function dibujarToldo(zFachada) {
  const anchoToldo = 960;
  const franjas = 8;
  const anchoFranja = anchoToldo / franjas;
  const profToldo = 130;
 
  push();
  translate(0, -300, zFachada + 60);
  rotateX(20); // lo inclina hacia afuera y abajo
 
  for (let i = 0; i < franjas; i++) {
    push();
    translate(-anchoToldo / 2 + anchoFranja * i + anchoFranja / 2, 0, 0);
    ambientMaterial(...(i % 2 === 0 ? PALETA.toldo : [232, 226, 214]));
    specularMaterial(...(i % 2 === 0 ? PALETA.toldo : [232, 226, 214]));
    shininess(8);
    box(anchoFranja - 2, 10, profToldo);
    pop();
  }
 
  // Faldón con volado (el borde que cuelga, típico de los toldos de lona)
  push();
  translate(0, 60, profToldo / 2 - 4);
  fill(...PALETA.toldoSombra);
  box(anchoToldo, 34, 6);
  pop();
 
  pop();
 
  // Soportes metálicos del toldo
  for (const dx of [-440, 440]) {
    push();
    translate(dx, -170, zFachada + 20);
    rotateX(20);
    ambientMaterial(...PALETA.metalBrillo);
    specularMaterial(...PALETA.metalBrillo);
    shininess(40);
    cylinder(4, 150);
    pop();
  }
}
 
// --- Cartel del negocio, iluminado por dentro, justo sobre la ventana ---
function dibujarCartelTienda(zFachada) {
  push();
  translate(0, -318, zFachada + 26);
 
  // Caja del cartel
  push();
  fill(24, 22, 20);
  box(560, 70, 16);
  pop();
 
  // Panel luminoso interior (emissiveMaterial: se ve "prendido"
  // sin depender de las luces de la escena, como un cartel real)
  push();
  translate(0, 0, 9);
  emissiveMaterial(...PALETA.neon);
  box(536, 48, 4);
  pop();
 
  pop();
}
 
// La reja se calcula: se divide el ancho por la separación deseada
function dibujarRejas(zFachada) {
  const anchoVentana  = 900;
  const alturaVentana = 400;
  const separacion    = 26;
  const barrotes = Math.floor(anchoVentana / separacion);
  const inicioX  = -anchoVentana / 2 + separacion / 2;
 
  push();
  // Hierro forjado: oscuro pero con suficiente base para que se
  // note contra la ventana de noche, con un brillo metálico marcado
  ambientMaterial(58, 54, 50);
  specularMaterial(140, 136, 130);
  shininess(35);
 
  for (let i = 0; i < barrotes; i++) {
    push();
    translate(inicioX + i * separacion, 10, zFachada - 12);
    cylinder(4, alturaVentana);
    pop();
  }
 
  // Travesaños horizontales (rotateZ los acuesta)
  for (const y of [-170, -60, 60, 170]) {
    push();
    translate(0, y, zFachada - 12);
    rotateZ(90);
    cylinder(5, anchoVentana);
    pop();
  }
 
  pop();
}
 
function dibujarMostrador() {
  // Cuerpo del mostrador, con veta de madera real
  push();
  translate(0, 190, 260);
  if (texturaMaderaOscura) texture(texturaMaderaOscura);
  else fill(...PALETA.viga);
  box(420, 60, 45);
  pop();
 
  // Franja de acento superior (ahora con un poco de brillo)
  push();
  translate(0, 160, 260);
  ambientMaterial(...PALETA.neon);
  specularMaterial(...PALETA.neon);
  shininess(25);
  box(420, 6, 47);
  pop();
 
  // Zócalo inferior del mostrador, para que no "flote" sobre el piso
  push();
  translate(0, 216, 260);
  fill(...PALETA.zocalo);
  box(410, 8, 40);
  pop();
 
  sombraEnPiso(0, 262, 200, 75);
 
  dibujarCajaRegistradora();
}
 
// La caja registradora: un punto de referencia claro sobre el
// mostrador, justo donde está el centro de ZONA_CAJA (x:0),
// para que se entienda de un vistazo dónde pararse a atender.
function dibujarCajaRegistradora() {
  push();
  translate(0, 155, 250);
 
  // Cuerpo de la caja
  push();
  translate(0, -23, 0);
  ambientMaterial(52, 50, 54);
  specularMaterial(120, 118, 128);
  shininess(30);
  box(85, 46, 58);
  pop();
 
  // Visor con el total, iluminado (se ve prendida de verdad)
  push();
  translate(0, -46, -26);
  emissiveMaterial(140, 230, 150);
  box(42, 14, 3);
  pop();
 
  // Teclado numérico, levemente inclinado hacia el jugador
  push();
  translate(0, -6, -18);
  rotateX(-18);
  ambientMaterial(28, 28, 30);
  specularMaterial(60, 60, 64);
  shininess(12);
  box(52, 3, 32);
  pop();
 
  // Botones del teclado: una cuadrícula chica de teclas
  for (let f = 0; f < 3; f++) {
    for (let c = 0; c < 4; c++) {
      push();
      translate(-18 + c * 12, -3, -28 + f * 10);
      rotateX(-18);
      ambientMaterial(220, 214, 200);
      specularMaterial(240, 234, 220);
      shininess(20);
      box(8, 3, 6);
      pop();
    }
  }
 
  // Cajón del dinero, entreabierto, del lado del jugador
  push();
  translate(0, 4, 22);
  ambientMaterial(...PALETA.metalBrillo);
  specularMaterial(...PALETA.metalBrillo);
  shininess(35);
  box(80, 16, 30);
  pop();
 
  pop();
}
 
function dibujarEstanteLateral(x, z) {
  const niveles      = 4;
  const altoNivel    = 55;
  const anchoEstante = 130;
  const profEstante  = 260;
 
  push();
  translate(x, 0, z);
 
  for (let n = 0; n < niveles; n++) {
    const y = 200 - n * altoNivel;
 
    push();
    translate(0, y, 0);
    if (texturaMetal) { tint(...PALETA.estanteMetalOscuro); texture(texturaMetal); }
    else fill(...PALETA.estanteMetalOscuro);
    box(anchoEstante, 6, profEstante);
    noTint();
    pop();
 
    const items = 6;
    for (let i = 0; i < items; i++) {
      const idx = (n * items + i) % coloresClutter.length;
      const alto = 30 + (idx % 3) * 8;
      push();
      translate(
        -anchoEstante / 2 + 20 + (i % 2) * 20,
        y - 3 - alto / 2,
        -profEstante / 2 + 20 + i * (profEstante / items)
      );
      fill(...coloresClutter[idx]);
      box(34, alto, 30);
      // Etiqueta clara al frente, como en el estante principal: rompe
      // la caja lisa y sugiere una góndola con productos reales.
      push();
      translate(0, alto * 0.15, 16);
      fill(Math.min(255, coloresClutter[idx][0] + 55),
           Math.min(255, coloresClutter[idx][1] + 55),
           Math.min(255, coloresClutter[idx][2] + 55));
      box(20, 5, 1);
      pop();
      pop();
    }
  }
 
  // Parantes verticales, metal cepillado con un poco de brillo
  for (const dx of [-anchoEstante / 2, anchoEstante / 2]) {
    for (const dz of [-profEstante / 2, profEstante / 2]) {
      push();
      translate(dx, 100, dz);
      ambientMaterial(...PALETA.estanteMetal);
      specularMaterial(...PALETA.estanteMetal);
      shininess(15);
      box(6, 260, 6);
      pop();
    }
  }
 
  pop();
 
  sombraEnPiso(x, z, 150, 50);
}
 
function dibujarHeladera(x, z) {
  push();
  translate(x, 40, z);
 
  // Cuerpo metálico con un poco de brillo, ya no plástico mate
  push();
  ambientMaterial(...PALETA.heladeraCuerpo);
  specularMaterial(...PALETA.heladeraCuerpo);
  shininess(35);
  box(90, 320, 70);
  pop();
 
  // Marco de la puerta (rompe la caja lisa del cuerpo)
  push();
  translate(0, -10, 35);
  fill(...PALETA.estanteMetalOscuro);
  box(80, 268, 2);
  pop();
 
  // Vidrio: brillante y semitransparente, con reflejo especular
  push();
  translate(0, -10, 37);
  ambientMaterial(PALETA.heladeraVidrio[0], PALETA.heladeraVidrio[1], PALETA.heladeraVidrio[2], 150);
  specularMaterial(PALETA.heladeraVidrio[0], PALETA.heladeraVidrio[1], PALETA.heladeraVidrio[2], 150);
  shininess(80);
  box(74, 258, 3);
  pop();
 
  const coloresBebida = [[210, 30, 40], [30, 100, 190], [230, 180, 30], [40, 160, 90]];
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 3; col++) {
      const c = coloresBebida[(fila + col) % coloresBebida.length];
      push();
      translate(-24 + col * 24, 90 - fila * 55, 40);
      ambientMaterial(...c);
      specularMaterial(...c);
      shininess(45);
      cylinder(9, 45);
      // Tapita clara arriba de cada botella
      push();
      translate(0, -25, 0);
      fill(230, 230, 226);
      cylinder(5, 6);
      pop();
      pop();
    }
  }
 
  pop();
 
  sombraEnPiso(x, z, 100, 65);
}
 
// Este estante refleja el STOCK REAL: es el vínculo entre los
// datos y la escena. Como draw() corre 60 veces por segundo,
// se actualiza solo cuando cambia gameState.
function dibujarEstantePrincipal() {
  const productos = gameState.productos;
  const espacio = 120;
  const inicioX = -((productos.length - 1) * espacio) / 2;
 
  push();
  translate(0, 0, -260);
 
  // Panel de fondo, con veta de madera: rompe el vacío detrás
  // de los productos y da sensación de góndola real.
  push();
  translate(0, 100, -30);
  if (texturaMaderaOscura) texture(texturaMaderaOscura);
  else fill(...PALETA.maderaOscura);
  box(espacio * productos.length + 30, 220, 6);
  pop();
 
  push();
  translate(0, 205, 0);
  ambientMaterial(...PALETA.estanteMetal);
  specularMaterial(...PALETA.estanteMetal);
  shininess(15);
  box(espacio * productos.length + 20, 8, 90);
  pop();
 
  for (let i = 0; i < productos.length; i++) {
    const p = productos[i];
 
    push();
    translate(inicioX + i * espacio, 0, 0);
 
    if (p.stock > 0) {
      const c = COLOR_PRODUCTO[p.id] || [196, 132, 44];
      // Máximo 6 unidades visibles, para no saturar la escena
      const unidades = Math.min(6, p.stock);
      const altoUnidad = 18;
 
      for (let u = 0; u < unidades; u++) {
        push();
        translate(0, 196 - u * altoUnidad, 0);
        fill(...c);
        box(58, altoUnidad - 3, 58);
        pop();
 
        // Etiqueta más clara al frente
        push();
        translate(0, 196 - u * altoUnidad, 30);
        fill(Math.min(255, c[0] + 60), Math.min(255, c[1] + 60), Math.min(255, c[2] + 60));
        box(34, 7, 2);
        pop();
      }
    } else {
      // Sin stock: casillero vacío con marca roja
      push();
      translate(0, 208, 0);
      fill(60, 30, 28);
      box(58, 6, 58);
      pop();
 
      push();
      translate(0, 196, 30);
      fill(180, 55, 48);
      box(34, 10, 2);
      pop();
    }
 
    pop();
  }
 
  pop();
}
 
function dibujarPuertaSalida() {
  const x = 880;
 
  push();
  translate(x, 0, PUERTA.z);
 
  // Marco, con veta de madera oscura
  push();
  translate(-12, 60, 0);
  if (texturaMaderaOscura) texture(texturaMaderaOscura);
  else fill(56, 40, 26);
  box(20, 340, 230);
  pop();
 
  // Hoja, con veta clara
  push();
  translate(-6, 65, 0);
  if (texturaMadera) texture(texturaMadera);
  else fill(96, 62, 36);
  box(12, 310, 200);
  pop();
 
  // Tableros de relieve
  for (const dy of [-10, 140]) {
    push();
    translate(-14, dy, 0);
    fill(72, 46, 26);
    box(4, 120, 155);
    pop();
  }
 
  // Picaporte, bronce con brillo
  push();
  translate(-17, 90, 70);
  ambientMaterial(...PALETA.bronce);
  specularMaterial(...PALETA.bronce);
  shininess(60);
  sphere(10);
  pop();
 
  // Bisagras, para que la hoja no se vea pegada al marco
  for (const dy of [-100, 40, 180]) {
    push();
    translate(-13, dy, -95);
    ambientMaterial(...PALETA.bronce);
    specularMaterial(...PALETA.bronce);
    shininess(50);
    box(6, 22, 8);
    pop();
  }
 
  // Cartel de SALIDA iluminado
  push();
  translate(-16, -135, 0);
  fill(20, 100, 46);
  box(10, 70, 230);
  pop();
 
  push();
  translate(-24, -135, 0);
  emissiveMaterial(170, 255, 190);
  box(4, 44, 190);
  pop();
 
  pop();
 
  sombraEnPiso(x, PUERTA.z, 130, 55);
}
 
// ==========================================================
// LA CALLE
// De adelante hacia atrás: vereda → cordón → asfalto →
// cordón de enfrente → vereda de enfrente → casas.
// ==========================================================
 
function dibujarCalle() {
  // Vereda de este lado
  push();
  translate(0, 218, 470);
  rotateX(90);
  fill(...PALETA_CALLE.vereda);
  noStroke();
  plane(2600, 220);
  pop();
 
  // Líneas de las baldosas
  push();
  noStroke();
  for (let i = -13; i <= 13; i++) {
    push();
    translate(i * 100, 216, 470);
    rotateX(90);
    fill(...PALETA_CALLE.veredaLinea);
    plane(4, 220);
    pop();
  }
  pop();
 
  // Cordón
  push();
  translate(0, 206, 580);
  fill(...PALETA_CALLE.cordon);
  box(2600, 26, 22);
  pop();
 
  push();
  translate(0, 206, 592);
  fill(...PALETA_CALLE.cordonPint);
  box(2600, 22, 3);
  pop();
 
  // Asfalto
  push();
  translate(0, 220, 800);
  rotateX(90);
  fill(...PALETA_CALLE.asfalto);
  noStroke();
  plane(2600, 420);
  pop();
 
  // Línea blanca discontinua del centro
  push();
  noStroke();
  for (let i = -12; i <= 12; i++) {
    push();
    translate(i * 110, 218, 800);
    rotateX(90);
    fill(...PALETA_CALLE.lineaBlanca);
    plane(60, 8);
    pop();
  }
  pop();
 
  // Pozos en el asfalto
  const pozos = [[-480, 720], [-80, 850], [340, 700], [620, 880]];
  for (const [x, z] of pozos) {
    push();
    translate(x, 219, z);
    rotateX(90);
    fill(30, 28, 26);
    noStroke();
    ellipse(0, 0, 45, 32);
    pop();
  }
 
  // Cordón y vereda de enfrente
  push();
  translate(0, 206, 1000);
  fill(120, 116, 110);
  box(2600, 26, 22);
  pop();
 
  push();
  translate(0, 218, 1070);
  rotateX(90);
  fill(90, 86, 80);
  noStroke();
  plane(2600, 140);
  pop();
}
 
function dibujarFachadasCalle() {
  const casas = [
    { x: -1050, ancho: 320, color: [116, 78, 40] },
    { x: -700,  ancho: 300, color: [140, 96, 46] },
    { x: -360,  ancho: 300, color: [56, 84, 128] },
    { x: -20,   ancho: 320, color: [122, 52, 46] },
    { x: 340,   ancho: 300, color: [70, 108, 74] },
    { x: 700,   ancho: 300, color: [96, 70, 104] },
    { x: 1040,  ancho: 320, color: [110, 104, 90] }
  ];
 
  const zCasas = 1180;
  const altura = 320;
 
  for (const casa of casas) {
    push();
    translate(casa.x, 220 - altura / 2, zCasas);
    fill(...casa.color);
    box(casa.ancho, altura, 20);
    pop();
 
    // Techo
    push();
    translate(casa.x, 220 - altura - 8, zCasas);
    fill(30, 26, 24);
    box(casa.ancho + 10, 16, 24);
    pop();
 
    // Ventana con luz prendida (emissive: se ve realmente iluminada
    // de noche, no solo un color plano)
    push();
    translate(casa.x, 120, zCasas - 12);
    emissiveMaterial(...PALETA_CALLE.farolLuz);
    box(56, 70, 4);
    pop();
 
    // Marco de la ventana
    push();
    translate(casa.x, 120, zCasas - 13);
    fill(30, 24, 20);
    box(64, 78, 2);
    pop();
 
    // Tanque de agua en el techo
    push();
    translate(casa.x - casa.ancho / 4, 220 - altura - 45, zCasas);
    ambientMaterial(60, 100, 68);
    specularMaterial(60, 100, 68);
    shininess(10);
    cylinder(22, 40);
    pop();
  }
 
  dibujarAutosEstacionados();
}
 
// Autos estacionados sobre el cordón: le dan vida a la calle y
// rompen la sensación de escenario vacío. Formas simples,
// low-poly, coherentes con el resto del juego.
function dibujarAutosEstacionados() {
  const autos = [
    { x: -520, colorAuto: [150, 40, 40] },
    { x: 260,  colorAuto: [50, 70, 130] },
    { x: 900,  colorAuto: [70, 70, 74] }
  ];
 
  for (const auto of autos) {
    push();
    translate(auto.x, 195, 610);
 
    // Carrocería
    push();
    ambientMaterial(...auto.colorAuto);
    specularMaterial(...auto.colorAuto);
    shininess(45);
    box(190, 44, 84);
    pop();
 
    // Cabina
    push();
    translate(-10, -34, 0);
    ambientMaterial(auto.colorAuto[0] * 0.85, auto.colorAuto[1] * 0.85, auto.colorAuto[2] * 0.85);
    specularMaterial(auto.colorAuto[0] * 0.85, auto.colorAuto[1] * 0.85, auto.colorAuto[2] * 0.85);
    shininess(45);
    box(110, 28, 78);
    pop();
 
    // Vidrios
    push();
    translate(-10, -34, 0);
    ambientMaterial(40, 46, 54, 200);
    specularMaterial(40, 46, 54, 200);
    shininess(90);
    box(112, 20, 80);
    pop();
 
    // Ruedas
    for (const dx of [-70, 70]) {
      for (const dz of [-42, 42]) {
        push();
        translate(dx, 4, dz);
        rotateX(90);
        fill(18, 18, 18);
        cylinder(20, 14);
        pop();
      }
    }
 
    // Faros
    push();
    translate(96, -4, 0);
    emissiveMaterial(255, 244, 210);
    box(4, 10, 60);
    pop();
 
    pop();
 
    sombraEnPiso(auto.x, 610, 210, 55);
  }
}
 
function dibujarFarol(x, z) {
  push();
  translate(x, 0, z);
 
  push();
  translate(0, 60, 0);
  ambientMaterial(48, 48, 50);
  specularMaterial(48, 48, 50);
  shininess(20);
  cylinder(6, 320);
  pop();
 
  push();
  translate(20, -100, 0);
  rotateZ(90);
  ambientMaterial(48, 48, 50);
  specularMaterial(48, 48, 50);
  shininess(20);
  cylinder(4, 50);
  pop();
 
  // El vidrio del farol: emissive, para que se vea "prendido" de
  // verdad y no dependa de que la luz de la escena le pegue bien.
  push();
  translate(44, -100, 0);
  emissiveMaterial(...PALETA_CALLE.farolLuz);
  sphere(14);
  pop();
 
  // Halo suave alrededor del foco: una esfera translúcida más
  // grande, truco barato para simular resplandor sin post-proceso.
  push();
  translate(44, -100, 0);
  noStroke();
  fill(...PALETA_CALLE.farolLuz, 35);
  sphere(26);
  pop();
 
  pop();
 
  sombraEnPiso(x, z, 40, 35);
}
 
function dibujarCableado() {
  stroke(25, 25, 25);
  strokeWeight(2);
  noFill();
 
  const y = -140;
  for (let i = 0; i < 3; i++) {
    const caida = 14 + i * 8;
    beginShape();
    vertex(-700, y + i * 10, 540);
    quadraticVertex(0, y + caida + i * 10, 540, 700, y + i * 10, 540);
    endShape();
  }
 
  noStroke();
}
 
// ==========================================================
// LOS NPCs
// Todos comparten el mismo esqueleto low-poly, pero cada uno
// tiene su silueta propia gracias a scale().
// ==========================================================
 
function dibujarClientes() {
  const t = frameCount;
 
  // frameCount avanza solo; el módulo (%) hace que al llegar
  // al final del recorrido reaparezcan del otro lado.
  const vecinaX = ((t * 0.5) % 2400) - 1200;
  dibujarClienteVecina(vecinaX, 450);
 
  const pibeX = 1200 - ((t * 0.8) % 2400);
  dibujarClientePibe(pibeX, 500);
 
  // El señor va lento y se frena cada tanto
  const avance = (t * 0.28) % 2400;
  const pausa = sin(t * 0.8) > 0.7 ? 0 : avance;
  dibujarClienteSenor(pausa - 1200, 430);
}
 
function dibujarClienteVecina(x, z) {
  const ropa = [96, 46, 92];
  const piel = [176, 130, 96];
 
  push();
  translate(x, 0, z);
 
  for (const dx of [-9, 9]) {
    push(); translate(dx, 195, 0); fill(30, 30, 34); cylinder(9, 66); pop();
  }
 
  push(); translate(0, 128, 0); fill(...ropa); cylinder(21, 88); pop();
  push(); translate(0, 88, 0);  fill(...ropa); sphere(21); pop();
  push(); translate(0, 55, 0);  fill(...piel); sphere(17); pop();
 
  // Pelo largo
  push();
  translate(0, 60, -10);
  fill(40, 26, 20);
  scale(1, 1.3, 0.7);
  sphere(17);
  pop();
 
  // Cartera
  push();
  translate(-24, 150, 4);
  fill(150, 40, 60);
  box(16, 20, 8);
  pop();
 
  pop();
}
 
function dibujarClientePibe(x, z) {
  const ropa = [40, 100, 82];
  const piel = [140, 96, 66];
 
  push();
  translate(x, 0, z);
  scale(0.88, 1.15, 0.88);   // alto y delgado
 
  for (const dx of [-8, 8]) {
    push(); translate(dx, 195, 0); fill(24, 24, 28); cylinder(8, 70); pop();
  }
 
  push(); translate(0, 130, 0); fill(...ropa); cylinder(19, 90); pop();
  push(); translate(0, 86, 0);  fill(...ropa); sphere(19); pop();
  push(); translate(0, 54, 0);  fill(...piel); sphere(15); pop();
 
  // Capucha
  push(); translate(0, 44, -4); fill(...ropa); sphere(16.5); pop();
 
  // Mochila
  push();
  translate(0, 120, -22);
  fill(70, 60, 30);
  box(26, 40, 14);
  pop();
 
  pop();
}
 
function dibujarClienteSenor(x, z) {
  const ropa = [90, 78, 60];
  const piel = [188, 148, 112];
 
  push();
  translate(x, 0, z);
  scale(1.1, 0.88, 1.1);   // bajo y ancho
 
  for (const dx of [-10, 10]) {
    push(); translate(dx, 195, 0); fill(50, 46, 40); cylinder(10, 62); pop();
  }
 
  push(); translate(0, 132, 0); fill(...ropa); cylinder(23, 84); pop();
  push(); translate(0, 92, 0);  fill(...ropa); sphere(22); pop();
  push(); translate(0, 58, 0);  fill(...piel); sphere(17); pop();
 
  // Gorra plana
  push(); translate(0, 46, 0); fill(45, 40, 34); cylinder(18, 8); pop();
 
  // Bastón
  push();
  translate(26, 200, 0);
  fill(60, 42, 24);
  cylinder(3, 90);
  pop();
 
  pop();
}
 
function dibujarPolicia(x, z) {
  const uniforme = [34, 46, 84];
  const piel = [168, 122, 90];
 
  push();
  translate(x, 0, z);
 
  for (const dx of [-9, 9]) {
    push(); translate(dx, 195, 0); fill(24, 26, 30); cylinder(9, 70); pop();
  }
 
  push(); translate(0, 130, 0); fill(...uniforme); cylinder(23, 90); pop();
  push(); translate(10, 110, 21); fill(...PALETA.neon); box(10, 10, 2); pop();   // placa
  push(); translate(0, 168, 0); fill(20, 18, 16); cylinder(24, 8); pop();        // cinturón
  push(); translate(0, 88, 0); fill(...uniforme); sphere(23); pop();
  push(); translate(0, 55, 0); fill(...piel); sphere(18); pop();
  push(); translate(0, 42, 0); fill(20, 24, 40); cylinder(19, 10); pop();        // gorra
  push(); translate(0, 37, 3); fill(15, 18, 32); box(30, 4, 24); pop();
 
  pop();
}
 
function dibujarAbogado(x, z) {
  const traje = [26, 32, 58];
  const piel = [186, 140, 104];
 
  push();
  translate(x, 0, z);
  scale(0.85, 1.12, 0.85);   // alto y formal
 
  for (const dx of [-8, 8]) {
    push(); translate(dx, 195, 0); fill(...traje); cylinder(7, 70); pop();
    push(); translate(dx, 232, 6); fill(15, 14, 14); box(14, 8, 24); pop();
  }
 
  push(); translate(0, 130, 0); fill(...traje); cylinder(18, 92); pop();
  push(); translate(0, 130, 18); fill(232, 228, 218); box(10, 88, 3); pop();   // camisa
  push(); translate(0, 130, 20); fill(...PALETA.neon); box(5, 60, 2); pop();   // corbata
  push(); translate(0, 88, 0); fill(...traje); sphere(18); pop();
  push(); translate(0, 68, 0); fill(...piel); cylinder(7, 16); pop();          // cuello largo
  push(); translate(0, 50, 0); fill(...piel); sphere(15); pop();
  push(); translate(0, 40, 0); fill(25, 20, 18); sphere(14); pop();
  push(); translate(0, 50, 13); fill(210, 208, 200); box(20, 5, 2); pop();     // anteojos
  push(); translate(22, 175, 5); fill(58, 40, 28); box(26, 20, 8); pop();      // portafolio
 
  pop();
}
 
function dibujarCapo(x, z) {
  const campera = [64, 22, 22];
  const piel = [158, 108, 76];
 
  push();
  translate(x, 0, z);
  scale(1.35, 0.95, 1.35);   // macizo, imponente
 
  for (const dx of [-13, 13]) {
    push(); translate(dx, 195, 0); fill(18, 16, 16); cylinder(13, 70); pop();
  }
 
  push(); translate(0, 128, 0); fill(...campera); cylinder(32, 92); pop();
  push(); translate(0, 98, 26); fill(...PALETA.neon); torus(16, 4); pop();     // cadena
  push(); translate(0, 82, 0); fill(...campera); sphere(32); pop();
  push(); translate(0, 46, 0); fill(...piel); sphere(22); pop();
  push(); translate(0, 60, 14); fill(20, 16, 14); box(20, 12, 10); pop();      // barba
  push(); translate(0, 44, 20); fill(8, 8, 8); box(26, 7, 3); pop();           // lentes
  push(); translate(0, 30, -2); fill(20, 18, 18); cylinder(20, 8); pop();      // gorra
 
  pop();
}
 
// ==========================================================
// DIBUJA TODA LA ESCENA
// La llama draw() en cada frame.
// ==========================================================
function dibujarEscena() {
  // --- Fondo y atmósfera (van primero, detrás de todo) ---
  dibujarCielo();
 
  // --- El local ---
  dibujarPiso();
  dibujarParedes();
  dibujarFachadaConVentana();
  dibujarEstanteLateral(-780, -150);
  dibujarEstanteLateral(-780, 150);
  dibujarEstanteLateral(780, -350);
  dibujarHeladera(480, -560);
  dibujarHeladera(240, -560);
  dibujarHeladera(-240, -560);
  dibujarHeladera(-480, -560);
  dibujarEstantePrincipal();
  dibujarMostrador();
  dibujarPuertaSalida();
 
  // --- La calle ---
  dibujarCalle();
  dibujarFachadasCalle();
  dibujarFarol(-700, 540);
  dibujarFarol(0, 540);
  dibujarFarol(700, 540);
  dibujarCableado();
 
  // --- Los NPCs (con sombra debajo para que no floten) ---
  dibujarClientes();
  dibujarPolicia(-600, 470);
  dibujarAbogado(600, 480);
  dibujarCapo(200, 490);
 
  sombraEnPiso(-600, 470, 90);
  sombraEnPiso(600, 480, 85);
  sombraEnPiso(200, 490, 120);
 
  // --- La niebla va última: se superpone a todo lo lejano ---
  dibujarNiebla();
}
 
// ==========================================================
// ILUMINACIÓN
// Cambia según el estrés y si hay corte de luz.
// ==========================================================
function aplicarIluminacion() {
  const e = gameState.estres / 100;
  const factorLuz = efectosDia.sinLuz ? 0.22 : 1;
 
  // --- Luz ambiente: a más estrés, más rojiza y opresiva ---
  ambientLight(
    (62 + e * 34) * factorLuz,
    (58 - e * 22) * factorLuz,
    (54 - e * 24) * factorLuz
  );
 
  // --- Luz direccional principal ---
  directionalLight(
    (118 + e * 28) * factorLuz,
    (112 - e * 26) * factorLuz,
    (102 - e * 28) * factorLuz,
    0.3, 1, -0.4
  );
 
  if (!efectosDia.sinLuz) {
    // --- Tubo fluorescente del techo, con parpadeo irregular ---
    // Dos ondas de distinta frecuencia hacen que el parpadeo no
    // sea rítmico, como pasa con los tubos viejos de verdad.
    const parpadeo = (sin(frameCount * 3.7) * 0.5 + 0.5) * 0.10
                   + (sin(frameCount * 11.3) * 0.5 + 0.5) * 0.05;
    const tubo = 1 - parpadeo;
 
    pointLight(214 * tubo, 220 * tubo, 206 * tubo, 0, -215, 40);
    pointLight(176 * tubo, 182 * tubo, 172 * tubo, 0, -215, -180);
 
    // --- Neón del cartel: pulsa suave sobre la ventanita ---
    const pulso = 0.86 + sin(frameCount * 1.6) * 0.14;
    pointLight(
      PALETA.neon[0] * pulso,
      PALETA.neon[1] * pulso,
      PALETA.neon[2] * pulso,
      0, -60, 320
    );
 
    // --- Luz verde de la puerta de salida ---
    pointLight(70, 200, 100, 820, -135, 270);
 
    // --- Rebote cálido sobre el mostrador ---
    pointLight(150, 128, 96, 0, 120, 200);
  }
 
  // --- Faroles de la calle (se ven siempre) ---
  pointLight(220, 168, 102, -700, -100, 540);
  pointLight(220, 168, 102, 0, -100, 540);
  pointLight(220, 168, 102, 700, -100, 540);
 
  // --- Luz fría del cielo entrando por la ventana ---
  pointLight(48, 58, 92, 0, -40, 420);
}
 
 
 
 
 
 
// ==========================================================
// ATMÓSFERA
// Cielo con degradé y niebla en capas. Son dos trucos simples
// que dan sensación de profundidad sin costo de rendimiento.
// ==========================================================
 
// Cielo nocturno con degradé, dibujado como planos apilados
// bien lejos, detrás de todo.
function dibujarCielo() {
  push();
  noStroke();
  translate(0, -120, -900);
 
  const franjas = 16;
  const altoFranja = 1100 / franjas;
 
  for (let i = 0; i < franjas; i++) {
    const t = i / (franjas - 1);
    // De azul noche arriba a naranja de contaminación lumínica abajo
    const r = 16 + t * 86;
    const g = 14 + t * 50;
    const b = 36 - t * 6;
 
    push();
    translate(0, -550 + altoFranja * i + altoFranja / 2, 0);
    fill(r, g, b);
    plane(3000, altoFranja + 2);
    pop();
  }
  pop();
}
 
// Capas semitransparentes que se van poniendo más densas con
// la distancia. Simula el aire nocturno y difumina el fondo.
function dibujarNiebla() {
  push();
  noStroke();
 
  const capas = [
    { z: 1320, alpha: 32 },
    { z: 1050, alpha: 24 },
    { z: 820,  alpha: 15 },
    { z: 640,  alpha: 8  }
  ];
 
  for (const capa of capas) {
    push();
    translate(0, 40, capa.z);
    fill(78, 76, 92, capa.alpha);
    plane(3000, 900);
    pop();
  }
  pop();
}
 
// Sombra suave debajo de un objeto: un disco oscuro sobre el piso.
// No es una sombra real (calcularlas es caro), pero ancla
// visualmente los objetos y evita que parezcan flotando.
function sombraEnPiso(x, z, tam, opacidad = 60) {
  push();
  translate(x, 217, z);
  rotateX(90);
  noStroke();
  fill(0, 0, 0, opacidad);
  ellipse(0, 0, tam, tam * 0.7);
  pop();
}