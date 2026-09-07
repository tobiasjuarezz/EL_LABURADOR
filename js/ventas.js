// ==========================================================
// SISTEMA DE VENTAS
// El cliente pide productos y VOS calculás el vuelto.
// El juego no hace las cuentas: ese es el ejercicio.
// ==========================================================

let clienteActual = null;

// Contador de errores de vuelto SEGUIDOS (de_mas o reclamo). Se
// reinicia con cualquier venta correcta. Al llegar a 3 dispara un
// evento de mala fama (ver dispararEventoMalaFama, en eventos.js).
let erroresSeguidos = 0;

// Billetes que circulan de verdad
const BILLETES = [1000, 2000, 5000, 10000, 20000];

function billeteQuePaga(total) {
  const posibles = BILLETES.filter(b => b >= total);
  if (posibles.length === 0) return BILLETES[BILLETES.length - 1];
  if (posibles.length > 1 && Math.random() < 0.35) return posibles[1];
  return posibles[0];
}

// ==========================================================
// EFECTOS DEL ESTRÉS
// ==========================================================
function nivelEstres() {
  if (gameState.estres >= 67) return 2;
  if (gameState.estres >= 34) return 1;
  return 0;
}

// cliente: el objeto de CLIENTES (puede tener .paciencia -- 1 es lo
// normal, más alto se impacienta más fácil, más bajo tolera mejor).
function clienteSeImpacienta(cliente) {
  const nivel = nivelEstres();
  const factor = mejoras.clientelaFija ? 0.5 : 1;
  const paciencia = (cliente && cliente.paciencia) || 1;

  if (nivel === 2) return Math.random() < 0.30 * factor * paciencia;
  if (nivel === 1) return Math.random() < 0.12 * factor * paciencia;
  return false;
}

// ==========================================================
// FRANJAS HORARIAS
// El día de 10 clientes se divide en 4 franjas según cuántos ya
// atendiste hoy. Cada franja favorece (no obliga) ciertos productos.
// ==========================================================
const FRANJA_PRODUCTOS = {
  mañana:   ['agua', 'chicles', 'cafe'],
  mediodia: ['gaseosa', 'papas', 'sanguche'],
  tarde:    ['chocolate', 'alfajor', 'cafe'],
  noche:    ['palitos', 'chicles', 'jugo']
};

function franjaHoraria() {
  const n = gameState.clientesAtendidosHoy; // 0-indexado, antes de sumar el cliente actual
  if (n < 2) return 'mañana';
  if (n < 5) return 'mediodia';
  if (n < 8) return 'tarde';
  return 'noche';
}

function nombreFranja(franja) {
  const nombres = { mañana: 'Mañana', mediodia: 'Mediodía', tarde: 'Tarde', noche: 'Noche' };
  return nombres[franja] || '';
}

// Baraja disponibles dándole más chance de salir primero a los
// productos favorecidos de la franja actual (muestreo ponderado sin
// reemplazo: cada producto saca una key aleatoria dividida por su
// peso, y se ordena ascendente -- los pesos más altos tienden a
// quedar primero).
function barajarConSesgoFranja(disponibles) {
  const favorecidos = FRANJA_PRODUCTOS[franjaHoraria()] || [];
  return disponibles
    .map(p => ({ p, key: -Math.log(Math.random()) / (favorecidos.includes(p.id) ? 3 : 1) }))
    .sort((a, b) => a.key - b.key)
    .map(x => x.p);
}

// ==========================================================
// ATENDER UN CLIENTE
// ==========================================================
function abrirDialogoCliente() {
  const dlg     = document.getElementById('dialogoCliente');
  const titulo  = document.getElementById('dcTitulo');
  const texto   = document.getElementById('dcTexto');
  const botones = document.getElementById('dcBotones');

  dialogoAbierto = true;
  dlg.classList.remove('oculto');
  document.getElementById('promptInteraccion').classList.add('oculto');

  // Local clausurado
  if (caminos.clausurado > 0) {
    titulo.textContent = 'Local clausurado';
    texto.innerHTML = `
      Hay una faja de clausura en la persiana. No podés atender a nadie esta semana.
      <br><br><span style="color:#ff6b66;">Vas a tener que esperar a que se levante.</span>`;
    botones.innerHTML = `
      <button class="btn" onclick="saltearSemanaClausurada()">Saltear hasta que reabra</button>
      <button class="btn btnSecundario" onclick="cerrarDialogoCliente()">Cerrar</button>`;
    return;
  }

  // Corte de luz
  if (efectosDia.sinLuz) {
    titulo.textContent = 'Sin luz';
    texto.innerHTML = `
      El local está a oscuras. No se ve nada y la caja registradora no anda.
      <br><br><span style="color:#ff6b66;">Hoy no podés atender.</span>`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    return;
  }

  const disponibles = gameState.productos.filter(
    p => p.stock > 0 && p.id !== efectosDia.productoProhibido
  );

  // --- Elige QUIÉN viene y qué está contando hoy ---
  const cliente = elegirCliente();
  const perfil = {
    nombre:  cliente.nombre,
    saludo:  saludoDelCliente(cliente),
    charla:  dialogoDelCliente(cliente),
    visitas: cliente.visitas
  };
  cliente.visitas++;

  // Con estrés alto podés perder al cliente antes de atenderlo (la
  // paciencia propia del cliente -- si tiene una -- ajusta el chance)
  if (clienteSeImpacienta(cliente)) {
    titulo.textContent = perfil.nombre;
    texto.innerHTML = `<em>"${perfil.saludo}"</em><br><br>
      Tardaste en reaccionar. El cliente golpeó el mostrador, esperó, y se fue.
      <br><br><span style="color:#ff6b66;">
      Estás demasiado quemado como para atender bien.</span>`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 5);
    gameState.clientesAtendidosHoy++;
    actualizarHUD();
    return;
  }

  if (disponibles.length === 0) {
    titulo.textContent = perfil.nombre;
    texto.innerHTML = `<em>"${perfil.saludo}"</em><br><br>
      Mira el estante vacío y se va sin decir nada. No tenés nada para venderle.`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 10);
    gameState.clientesAtendidosHoy++;
    actualizarHUD();
    return;
  }

  // --- Arma el pedido: 1 a 3 productos distintos ---
  // El cliente millonario pide de más (task 17): un ítem extra y más
  // cantidad de cada uno.
  const esMillonario = cliente.tipo === 'millonario';
  const baseItems = Math.min(disponibles.length, 1 + Math.floor(Math.random() * 3));
  const cantidadItems = esMillonario
    ? Math.min(disponibles.length, baseItems + 1)
    : baseItems;

  const franjaActual = franjaHoraria();

  // No repetir la combinación de productos del pedido anterior a este
  // mismo cliente (task 10, versión simple: no hace falta que tenga
  // favoritos, alcanza con que no sea calcada la vez anterior). Se
  // reintenta rebarajando hasta 4 veces si hay margen para variar.
  let pedido, total;
  let intentosPedido = 0;
  do {
    const mezclados = barajarConSesgoFranja(disponibles);
    pedido = [];
    total = 0;

    for (let i = 0; i < cantidadItems; i++) {
      const prod = mezclados[i];
      const esViral = prod.id === efectosDia.productoViral;
      // Relación precio-demanda (panel de precios): si está bien por
      // debajo del precio justo, el cliente pide más; si está bien por
      // encima, pide menos (además de la chance de irse, más abajo).
      const desviacion = (prod.precio - prod.precioJusto) / prod.precioJusto;
      let base = esViral ? 3 : 1;
      if (!esViral) {
        if (desviacion <= -0.15) base += 1;
        else if (desviacion >= 0.35) base = Math.max(1, base - 1);
      }
      let cant = base + Math.floor(Math.random() * 2);
      if (esMillonario) cant += 1 + Math.floor(Math.random() * 2);
      cant = Math.min(prod.stock, cant);
      pedido.push({ prod, cant, subtotal: cant * prod.precio });
      total += cant * prod.precio;
    }
    intentosPedido++;
  } while (
    cliente.ultimoPedido &&
    disponibles.length > cantidadItems &&
    intentosPedido < 4 &&
    mismaCombinacion(pedido, cliente.ultimoPedido)
  );

  cliente.ultimoPedido = pedido.map(it => it.prod.id).sort();

  // Promedio de desviación respecto del precio de mercado
  let sobrePrecio = pedido.reduce((acc, it) =>
    acc + (it.prod.precio - it.prod.precioJusto) / it.prod.precioJusto, 0) / pedido.length;

  const tieneViral = pedido.some(it => it.prod.id === efectosDia.productoViral);
  if (tieneViral) sobrePrecio = 0;

  const paga = billeteQuePaga(total);

  // Hay un 25% de chance de que al cliente no le alcance la plata (se
  // decide una sola vez, al armar el pedido -- no en cada render, para
  // que no cambie si el jugador vuelve a dibujar la pantalla por,
  // por ejemplo, ofrecer un descuento). Al millonario nunca le falta.
  const esMillonarioParaAlcance = cliente.tipo === 'millonario';
  const noLeAlcanza = !esMillonarioParaAlcance && Math.random() < 0.25 && total > 1500;

  clienteActual = {
    perfil, pedido, total, paga, vuelto: paga - total, sobrePrecio, intentos: 0,
    tipo: cliente.tipo || null, franja: franjaActual, noLeAlcanza,
    vueltoArmado: 0, billetesUsados: [], descuentoAplicado: 0
  };

  renderPedidoCliente();
}

// Compara dos combinaciones de productos (arrays de ids, YA
// ordenados) para saber si son exactamente la misma (task 10).
function mismaCombinacion(pedido, idsAnteriores) {
  const idsActuales = pedido.map(it => it.prod.id).sort();
  if (idsActuales.length !== idsAnteriores.length) return false;
  return idsActuales.every((id, i) => id === idsAnteriores[i]);
}

// ---- Muestra el pedido SIN el total: eso lo calcula el jugador ----
function renderPedidoCliente() {
  const { perfil, pedido, paga, sobrePrecio, franja, descuentoAplicado, tipo } = clienteActual;

  document.getElementById('dcTitulo').textContent = perfil.nombre;

  const lista = pedido.map(it => `
    <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #2a2a2a;">
      <span>${it.cant} × ${it.prod.nombre}
        <span style="color:#8fb8d8; font-size:12px;">($${it.prod.precio.toLocaleString('es-AR')} c/u)</span>
      </span>
    </div>`).join('');

  let comentario = '';
  if (descuentoAplicado > 0) {
    comentario = `<div style="color:#8fb8d8; font-size:13px; margin-top:8px;">
      Le ofreciste un descuento del <strong>${descuentoAplicado}%</strong>. El total a cobrar
      ya no es el de la lista: recalculá el vuelto con eso en cuenta.</div>`;
  } else if (sobrePrecio > 0.35 && tipo !== 'millonario') {
    comentario = `<div style="color:#ff6b66; font-size:13px; margin-top:8px;">"Uh, ¿tanto está? Me parece caro eh..."</div>`;
  } else if (sobrePrecio < -0.2) {
    comentario = `<div style="color:#5FD96C; font-size:13px; margin-top:8px;">"Mirá qué bien de precio. Dame nomás."</div>`;
  }

  const billetesHtml = DENOMINACIONES.slice().reverse().map(d => `
    <button class="btn btnBillete" onclick="agregarBillete(${d})">$${d.toLocaleString('es-AR')}</button>
  `).join('');

  const descuentoHtml = descuentoAplicado > 0 ? '' : `
    <div class="descuentoWrap">
      <span class="descuentoLabel">¿Le ofrecés un descuento?</span>
      <button class="btn btnSecundario btnChico" onclick="ofrecerDescuento(5)">5%</button>
      <button class="btn btnSecundario btnChico" onclick="ofrecerDescuento(10)">10%</button>
      <button class="btn btnSecundario btnChico" onclick="ofrecerDescuento(15)">15%</button>
    </div>`;

  document.getElementById('dcTexto').innerHTML = `
    <div class="franjaLabel">${nombreFranja(franja)}</div>
    <em>"${perfil.saludo}"</em>

    <div style="font-style:italic; color:#a8c8d8; margin-top:8px; font-size:14px;
                border-left:2px solid #3a5a68; padding-left:12px;">
      "${perfil.charla}"
    </div>

    <div style="margin:12px 0; background:rgba(255,255,255,0.04); border-radius:8px; padding:10px 14px;">
      ${lista}
    </div>
    ${comentario}
    ${descuentoHtml}
    <div style="margin-top:12px; padding:10px 14px; background:rgba(61,124,181,0.12); border-radius:8px;">
      Te paga con un billete de
      <strong style="color:#fff; font-size:17px;">$${paga.toLocaleString('es-AR')}</strong>.
      <br><span style="color:#F2A93B;">Armá el vuelto con billetes y monedas:</span>
    </div>
    <div class="billetesGrid">${billetesHtml}</div>
    <div class="vueltoArmadoBarra">
      <span>Vuelto armado: <strong id="vueltoArmadoTexto">$0</strong></span>
      <button class="btn btnSecundario btnChico" onclick="deshacerBillete()">Deshacer</button>
    </div>
    <div id="feedbackVuelto" style="margin-top:10px; font-size:13px;"></div>`;

  document.getElementById('dcBotones').innerHTML = `
    <button class="btn" onclick="verificarVuelto()">Entregar vuelto</button>
    ${clienteActual.noLeAlcanza
      ? `<button class="btn btnSecundario" onclick="ofrecerFiado()">Le falta plata...</button>`
      : ''}
    <button class="btn btnSecundario" onclick="rechazarVenta()">No atenderlo</button>`;
}

// ---- Arma el vuelto a mano con billetes y monedas reales ----
function agregarBillete(valor) {
  if (!clienteActual) return;
  clienteActual.billetesUsados.push(valor);
  clienteActual.vueltoArmado += valor;
  actualizarVueltoArmadoUI();
}

function deshacerBillete() {
  if (!clienteActual || clienteActual.billetesUsados.length === 0) return;
  const ultimo = clienteActual.billetesUsados.pop();
  clienteActual.vueltoArmado -= ultimo;
  actualizarVueltoArmadoUI();
}

function actualizarVueltoArmadoUI() {
  const el = document.getElementById('vueltoArmadoTexto');
  if (el) el.textContent = `$${clienteActual.vueltoArmado.toLocaleString('es-AR')}`;
}

// ---- Descuento ofrecido por el jugador (task 22) ----
// Baja el total un % redondo. El jugador no ve el total exacto (esa es
// la gracia del juego), así que tiene que recalcular el vuelto con el
// descuento aplicado, no se le muestra el nuevo número.
function ofrecerDescuento(pct) {
  if (!clienteActual || clienteActual.descuentoAplicado > 0) return;

  const nuevoTotal = Math.round((clienteActual.total * (1 - pct / 100)) / 10) * 10;
  clienteActual.descuentoAplicado = pct;
  clienteActual.total = nuevoTotal;
  clienteActual.vuelto = clienteActual.paga - nuevoTotal;

  renderPedidoCliente();
}

// ---- Comprueba si el vuelto está bien ----
// El vuelto ya no se tipea: se arma con billetes y monedas reales
// (clienteActual.vueltoArmado, ver agregarBillete/deshacerBillete).
function verificarVuelto() {
  const feedback = document.getElementById('feedbackVuelto');
  if (!clienteActual) return;

  if (clienteActual.vueltoArmado === 0 && clienteActual.vuelto !== 0) {
    feedback.innerHTML = '<span style="color:#ff6b66;">Todavía no armaste nada de vuelto.</span>';
    return;
  }

  const respuesta = clienteActual.vueltoArmado;
  const correcto  = clienteActual.vuelto;

  if (respuesta === correcto) {
    cobrarVenta(0, null);
    return;
  }

  const diferencia = respuesta - correcto;

  if (diferencia > 0) {
    feedback.innerHTML = `<span style="color:#ff6b66;">
      Le diste $${diferencia.toLocaleString('es-AR')} de más. Se va rápido, sin decir nada.</span>`;
    setTimeout(() => cobrarVenta(diferencia, 'de_mas'), 900);
  } else {
    feedback.innerHTML = `<span style="color:#ff6b66;">
      "Che, me estás dando de menos. Fijate bien."</span>`;
    clienteActual.intentos++;

    if (clienteActual.intentos >= 2) {
      setTimeout(() => cobrarVenta(0, 'reclamo'), 900);
    } else {
      clienteActual.vueltoArmado = 0;
      clienteActual.billetesUsados = [];
      actualizarVueltoArmadoUI();
    }
  }
}

// ---- Concreta la venta ----
function cobrarVenta(perdidaExtra, tipoError) {
  const { pedido, total, paga, vuelto, sobrePrecio, tipo } = clienteActual;

  // El millonario no se va por precio (task 17): tolera precios altos
  // sin quejarse.
  if (sobrePrecio > 0.5 && Math.random() < 0.45 && !tipoError && tipo !== 'millonario') {
    document.getElementById('dcTexto').innerHTML = `
      <em>"Nah, mirá... paso. Está muy caro, voy al chino de la otra cuadra."</em><br><br>
      Se fue sin comprar. Tus precios están bastante por encima del mercado.`;
    document.getElementById('dcBotones').innerHTML =
      '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 10);
    gameState.clientesAtendidosHoy++;
    actualizarHUD();
    clienteActual = null;
    return;
  }

  for (const it of pedido) it.prod.stock -= it.cant;

  // Impuestos por producto (task 16): se descuentan por unidad
  // vendida, según el % de cada producto gravado.
  const impuestoTotal = Math.round(pedido.reduce(
    (acc, it) => acc + (it.prod.impuesto || 0) * it.subtotal, 0
  ));

  const bonusCartel = (mejoras.carteLuminoso && !tipoError) ? 400 : 0;

  // Propina de clientes ricos (task 18): solo el millonario, solo en
  // ventas sin error, con una chance.
  let propina = 0;
  if (tipo === 'millonario' && !tipoError && Math.random() < 0.4) {
    propina = Math.round((total * (0.1 + Math.random() * 0.15)) / 10) * 10;
  }

  const neto = total - perdidaExtra + bonusCartel + propina - impuestoTotal;

  gameState.caja += neto;
  gameState.ventasDelDia += neto;
  gameState.ventasDeLaSemana += neto;
  gameState.clientesAtendidosHoy++;

  // El cliente enojado (task 17) amplifica el estrés que te genera un
  // error de vuelto, y la mala fama (task 19/4) suma un poco más
  // mientras dure esa semana.
  const factorEnojo = tipo === 'enojado' ? 1.5 : 1;
  const factorFama = (typeof malaFamaSemana !== 'undefined' && malaFamaSemana) ? 1.25 : 1;
  const factorError = factorEnojo * factorFama;

  if (tipoError === 'de_mas')       gameState.estres = Math.min(100, gameState.estres + Math.round(12 * factorError));
  else if (tipoError === 'reclamo') gameState.estres = Math.min(100, gameState.estres + Math.round(18 * factorError));
  else                              gameState.estres = Math.max(0, gameState.estres - 1);

  if (gameState.clientesAtendidosHoy % 3 === 0) {
    gameState.estres = Math.min(100, gameState.estres + 2);
  }

  // Racha de errores de vuelto (task 19): cualquier error la suma,
  // una venta limpia la corta. A los 3 seguidos, mala fama.
  if (tipoError) {
    erroresSeguidos++;
  } else {
    erroresSeguidos = 0;
  }
  let disparaMalaFama = false;
  if (erroresSeguidos >= 3) {
    erroresSeguidos = 0;
    disparaMalaFama = true;
  }

  actualizarHUD();

  const detalle = pedido.map(it => `${it.cant} ${it.prod.nombre}`).join(', ');

  let encabezado, color, cierre;
  if (tipoError === 'de_mas') {
    encabezado = 'VENTA CON ERROR DE VUELTO';
    color = '#ff6b66';
    cierre = 'Se fue sin decir nada. Perdiste plata en el vuelto.';
  } else if (tipoError === 'reclamo') {
    encabezado = 'VENTA CON RECLAMO';
    color = '#ff6b66';
    cierre = '"La próxima fijate bien, eh." Se fue molesto.';
  } else if (propina > 0) {
    encabezado = 'VENTA CORRECTA';
    color = '#5FD96C';
    cierre = '"Quedate con el vuelto, dale. Gracias, hasta luego."';
  } else {
    encabezado = 'VENTA CORRECTA';
    color = '#5FD96C';
    cierre = '"Gracias, hasta luego."';
  }

  document.getElementById('dcTexto').innerHTML = `
    <div style="background:rgba(255,255,255,0.04); border-left:3px solid ${color}; padding:12px 14px; border-radius:6px;">
      <div style="font-size:12px; color:#a8a094; margin-bottom:8px; letter-spacing:1px;">${encabezado}</div>
      <div style="margin-bottom:10px;">Le entregaste: <strong>${detalle}</strong></div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#c9dff0;">
        <span>Total de la compra</span><span>$${total.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#c9dff0;">
        <span>Pagó con</span><span>$${paga.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#c9dff0;">
        <span>Vuelto correcto</span><span>$${vuelto.toLocaleString('es-AR')}</span>
      </div>
      ${perdidaExtra > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#ff6b66;">
        <span>Diste de más</span><span>−$${perdidaExtra.toLocaleString('es-AR')}</span>
      </div>` : ''}
      ${impuestoTotal > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#ff9b6b;">
        <span>Impuestos</span><span>−$${impuestoTotal.toLocaleString('es-AR')}</span>
      </div>` : ''}
      ${bonusCartel > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#5FD96C;">
        <span>Bonus cartel luminoso</span><span>+$${bonusCartel.toLocaleString('es-AR')}</span>
      </div>` : ''}
      ${propina > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#5FD96C;">
        <span>Propina</span><span>+$${propina.toLocaleString('es-AR')}</span>
      </div>` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:700; color:${color}; padding-top:8px; border-top:1px solid #333; margin-top:8px;">
        <span>Neto a caja</span><span>+$${neto.toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:10px; font-style:italic; color:#a8a094;">${cierre}</div>`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Siguiente</button>';

  clienteActual = null;

  // La mala fama se muestra recién al cerrar este cartel (se encola
  // como el resto de los eventos del día, ver cerrarDialogoCliente).
  if (disparaMalaFama) colaEventosDia.unshift(dispararEventoMalaFama);

  chequearMetas();
}

function rechazarVenta() {
  gameState.estres = Math.min(100, gameState.estres + 8);
  gameState.clientesAtendidosHoy++;
  actualizarHUD();

  document.getElementById('dcTexto').innerHTML =
    'Le decís que no lo podés atender. Se va murmurando. Una venta perdida.';
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';

  clienteActual = null;
}

function cerrarDialogoCliente() {
  dialogoAbierto = false;
  clienteActual = null;
  document.getElementById('dialogoCliente').classList.add('oculto');

  // Si ya se llegó al límite de clientes del día, el kiosco cierra
  // solo -- sin importar si quedaban eventos en cola, porque el día
  // termina acá.
  if (!caminos.partidaTerminada && gameState.clientesAtendidosHoy >= LIMITE_CLIENTES_DIA) {
    cerrarDiaAutomatico();
    return;
  }

  // Los eventos del día no aparecen todos juntos al abrir el
  // kiosco: van saliendo de a uno, cada vez que se termina de
  // atender a un cliente (ver colaEventosDia en eventos.js).
  if (!caminos.partidaTerminada && colaEventosDia.length > 0) {
    const siguienteEvento = colaEventosDia.shift();
    siguienteEvento();
  }
}



// ==========================================================
// FIADO
// El cliente no llega con la plata. Podés fiarle, venderle
// menos, o rechazarlo. Enseña un concepto real: vender no
// es lo mismo que cobrar.
// ==========================================================

function ofrecerFiado() {
  const { perfil, pedido, total } = clienteActual;

  // Le falta entre el 10% y el 30% del total
  const falta = Math.round((total * (0.1 + Math.random() * 0.2)) / 10) * 10;
  const tiene = total - falta;
  clienteActual.falta = falta;
  clienteActual.tiene = tiene;

  document.getElementById('dcTexto').innerHTML = `
    <div style="background:rgba(242,169,59,0.08); border-left:3px solid #F2A93B;
                padding:14px 16px; border-radius:6px;">
      <em>"Uh... perdoná. Contá de nuevo."</em>
      <br><br>
      Revisa los bolsillos, cuenta las monedas otra vez y se le nota la incomodidad.
      <br><br>
      <div style="display:flex; justify-content:space-between; color:#c9dff0; font-size:14px;">
        <span>La compra</span><span>$${total.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; color:#c9dff0; font-size:14px;">
        <span>Lo que tiene</span><span>$${tiene.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; color:#ff6b66;
                  font-weight:700; padding-top:8px; border-top:1px solid #333; margin-top:8px;">
        <span>Le falta</span><span>$${falta.toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:12px; font-style:italic; color:#a8a094;">
      "¿Me lo fiás? Mañana te lo traigo, te lo juro."
    </div>`;

  document.getElementById('dcBotones').innerHTML = `
    <button class="btn" onclick="aceptarFiado()">Fiarle $${falta.toLocaleString('es-AR')}</button>
    <button class="btn btnSecundario" onclick="venderMenos()">Venderle solo lo que le alcanza</button>
    <button class="btn btnSecundario" onclick="rechazarPorFalta()">No, así no puedo</button>`;
}

// ---- Le fiás: entra menos plata pero queda una deuda ----
function aceptarFiado() {
  const { perfil, pedido, total, falta, tiene } = clienteActual;

  for (const it of pedido) it.prod.stock -= it.cant;

  gameState.caja += tiene;
  gameState.ventasDelDia += tiene;
  gameState.ventasDeLaSemana += tiene;
  gameState.clientesAtendidosHoy++;

  // Queda anotado en la libreta
  fiado.deudas.push({
    cliente: perfil.nombre,
    monto: falta,
    semanaFiado: gameState.semanaActual
  });
  fiado.totalFiado += falta;

  actualizarHUD();

  document.getElementById('dcTexto').innerHTML = `
    <div style="background:rgba(255,255,255,0.04); border-left:3px solid #F2A93B;
                padding:12px 14px; border-radius:6px;">
      <div style="font-size:12px; color:#a8a094; margin-bottom:8px; letter-spacing:1px;">
        VENTA CON FIADO
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#c9dff0;">
        <span>Cobraste ahora</span><span style="color:#5FD96C;">+$${tiene.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#F2A93B;">
        <span>Quedó anotado</span><span>$${falta.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#a8a094;
                  padding-top:8px; border-top:1px solid #333; margin-top:8px;">
        <span>Total por cobrar</span><span>$${totalPorCobrar().toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:10px; font-style:italic; color:#a8a094;">
      "Gracias, en serio. Mañana sin falta."
    </div>
    <div style="margin-top:8px; font-size:12px; color:#8fb8d8;">
      Le entregaste la mercadería completa. Ahora depende de que vuelva.
    </div>`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Siguiente</button>';

  clienteActual = null;
  chequearMetas();
}

// ---- Le vendés menos: se lleva solo lo que puede pagar ----
function venderMenos() {
  const { pedido, tiene } = clienteActual;

  // Se le saca el producto más caro hasta que entre en su presupuesto
  const ordenado = [...pedido].sort((a, b) => b.subtotal - a.subtotal);
  let acumulado = 0;
  const seLleva = [];

  for (const it of ordenado) {
    if (acumulado + it.subtotal <= tiene) {
      seLleva.push(it);
      acumulado += it.subtotal;
    }
  }

  if (seLleva.length === 0) {
    document.getElementById('dcTexto').innerHTML = `
      Ni siquiera le alcanza para lo más barato. Guarda las monedas y se va sin nada.`;
    document.getElementById('dcBotones').innerHTML =
      '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 5);
    gameState.clientesAtendidosHoy++;
    actualizarHUD();
    clienteActual = null;
    return;
  }

  for (const it of seLleva) it.prod.stock -= it.cant;

  gameState.caja += acumulado;
  gameState.ventasDelDia += acumulado;
  gameState.ventasDeLaSemana += acumulado;
  gameState.clientesAtendidosHoy++;
  actualizarHUD();

  const detalle = seLleva.map(it => `${it.cant} ${it.prod.nombre}`).join(', ');
  const dejo = pedido.filter(it => !seLleva.includes(it))
                     .map(it => it.prod.nombre).join(', ');

  document.getElementById('dcTexto').innerHTML = `
    <div style="background:rgba(255,255,255,0.04); border-left:3px solid #5FD96C;
                padding:12px 14px; border-radius:6px;">
      <div style="font-size:12px; color:#a8a094; margin-bottom:8px; letter-spacing:1px;">
        VENTA PARCIAL
      </div>
      <div style="margin-bottom:8px;">Se llevó: <strong>${detalle}</strong></div>
      ${dejo ? `<div style="color:#a8a094; font-size:13px;">Dejó: ${dejo}</div>` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:700; color:#5FD96C;
                  padding-top:8px; border-top:1px solid #333; margin-top:8px;">
        <span>A caja</span><span>+$${acumulado.toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:10px; font-style:italic; color:#a8a094;">
      "Bueno, dale. Con esto zafo."
    </div>`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Siguiente</button>';

  clienteActual = null;
  chequearMetas();
}

// ---- Lo rechazás ----
function rechazarPorFalta() {
  gameState.estres = Math.min(100, gameState.estres + 6);
  gameState.clientesAtendidosHoy++;
  actualizarHUD();

  document.getElementById('dcTexto').innerHTML = `
    Le decís que no. Se queda un segundo mirando el mostrador, junta las monedas
    y se va sin decir nada.
    <br><br>
    <span style="color:#a8a094; font-size:13px;">
      No perdiste plata, pero en un barrio chico estas cosas se cuentan.
    </span>`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';

  clienteActual = null;
}