// ==========================================================
// SISTEMA DE VENTAS
// El cliente pide productos y VOS calculás el vuelto.
// El juego no hace las cuentas: ese es el ejercicio.
// ==========================================================

let clienteActual = null;

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

function clienteSeImpacienta() {
  const nivel = nivelEstres();
  const factor = mejoras.clientelaFija ? 0.5 : 1;

  if (nivel === 2) return Math.random() < 0.30 * factor;
  if (nivel === 1) return Math.random() < 0.12 * factor;
  return false;
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
      <br><br><span style="color:#ff6b66;">Vas a tener que esperar.</span>`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
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
    sonidoPasosImportante();
    const perfil = {
    nombre:  cliente.nombre,
    saludo:  saludoDelCliente(cliente),
    charla:  dialogoDelCliente(cliente),
    visitas: cliente.visitas
  };
  cliente.visitas++;

  // Con estrés alto podés perder al cliente antes de atenderlo
  if (clienteSeImpacienta()) {
    titulo.textContent = perfil.nombre;
    texto.innerHTML = `<em>"${perfil.saludo}"</em><br><br>
      Tardaste en reaccionar. El cliente golpeó el mostrador, esperó, y se fue.
      <br><br><span style="color:#ff6b66;">
      Estás demasiado quemado como para atender bien.</span>`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 5);
    actualizarHUD();
    return;
  }

  if (disponibles.length === 0) {
    titulo.textContent = perfil.nombre;
    texto.innerHTML = `<em>"${perfil.saludo}"</em><br><br>
      Mira el estante vacío y se va sin decir nada. No tenés nada para venderle.`;
    botones.innerHTML = '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 10);
    actualizarHUD();
    return;
  }

  // --- Arma el pedido: 1 a 3 productos distintos ---
  const cantidadItems = Math.min(disponibles.length, 1 + Math.floor(Math.random() * 3));
  const mezclados = [...disponibles].sort(() => Math.random() - 0.5);

  const pedido = [];
  let total = 0;

  for (let i = 0; i < cantidadItems; i++) {
    const prod = mezclados[i];
    const esViral = prod.id === efectosDia.productoViral;
    const base = esViral ? 3 : 1;
    const cant = Math.min(prod.stock, base + Math.floor(Math.random() * 2));
    pedido.push({ prod, cant, subtotal: cant * prod.precio });
    total += cant * prod.precio;
  }

  // Promedio de desviación respecto del precio de mercado
  let sobrePrecio = pedido.reduce((acc, it) =>
    acc + (it.prod.precio - it.prod.precioJusto) / it.prod.precioJusto, 0) / pedido.length;

  const tieneViral = pedido.some(it => it.prod.id === efectosDia.productoViral);
  if (tieneViral) sobrePrecio = 0;

  const paga = billeteQuePaga(total);

  clienteActual = { perfil, pedido, total, paga, vuelto: paga - total, sobrePrecio, intentos: 0 };

  renderPedidoCliente();
}

// ---- Muestra el pedido SIN el total: eso lo calcula el jugador ----
function renderPedidoCliente() {
  const { perfil, pedido, paga, sobrePrecio } = clienteActual;

  document.getElementById('dcTitulo').textContent = perfil.nombre;

  const lista = pedido.map(it => `
    <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #2a2a2a;">
      <span>${it.cant} × ${it.prod.nombre}
        <span style="color:#8fb8d8; font-size:12px;">($${it.prod.precio.toLocaleString('es-AR')} c/u)</span>
      </span>
    </div>`).join('');

  let comentario = '';
  if (sobrePrecio > 0.35) {
    comentario = `<div style="color:#ff6b66; font-size:13px; margin-top:8px;">"Uh, ¿tanto está? Me parece caro eh..."</div>`;
  } else if (sobrePrecio < -0.2) {
    comentario = `<div style="color:#5FD96C; font-size:13px; margin-top:8px;">"Mirá qué bien de precio. Dame nomás."</div>`;
  }

  document.getElementById('dcTexto').innerHTML = `
    <em>"${perfil.saludo}"</em>

    <div style="font-style:italic; color:#a8c8d8; margin-top:8px; font-size:14px;
                border-left:2px solid #3a5a68; padding-left:12px;">
      "${perfil.charla}"
    </div>

    <div style="margin:12px 0; background:rgba(255,255,255,0.04); border-radius:8px; padding:10px 14px;">
      ${lista}
    </div>
    ${comentario}
    <div style="margin-top:12px; padding:10px 14px; background:rgba(61,124,181,0.12); border-radius:8px;">
      Te paga con un billete de
      <strong style="color:#fff; font-size:17px;">$${paga.toLocaleString('es-AR')}</strong>.
      <br><span style="color:#F2A93B;">¿Cuánto vuelto le tenés que dar?</span>
    </div>
    <div style="display:flex; gap:8px; align-items:center; margin-top:12px;">
      <span style="color:#a8a094; font-size:15px;">Vuelto: $</span>
      <input type="number" id="inputVuelto" placeholder="0">
    </div>
    <div id="feedbackVuelto" style="margin-top:10px; font-size:13px;"></div>`;

  // Hay un 25% de chance de que al cliente no le alcance la plata
  const noLeAlcanza = Math.random() < 0.25 && clienteActual.total > 1500;
  clienteActual.noLeAlcanza = noLeAlcanza;

  document.getElementById('dcBotones').innerHTML = `
    <button class="btn" onclick="verificarVuelto()">Entregar vuelto</button>
    ${noLeAlcanza
      ? `<button class="btn btnSecundario" onclick="ofrecerFiado()">Le falta plata...</button>`
      : ''}
    <button class="btn btnSecundario" onclick="rechazarVenta()">No atenderlo</button>`;

  setTimeout(() => {
    const inp = document.getElementById('inputVuelto');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') verificarVuelto();
      });
    }
  }, 50);
}

// ---- Comprueba si el vuelto está bien ----
function verificarVuelto() {
  const inp = document.getElementById('inputVuelto');
  const feedback = document.getElementById('feedbackVuelto');
  if (!inp || !clienteActual) return;

  if (inp.value === '') {
    feedback.innerHTML = '<span style="color:#ff6b66;">Poné cuánto vuelto le vas a dar.</span>';
    return;
  }

  const respuesta = Number(inp.value);
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
      inp.value = '';
      inp.focus();
    }
  }
}

// ---- Concreta la venta ----
function cobrarVenta(perdidaExtra, tipoError) {
  const { pedido, total, paga, vuelto, sobrePrecio } = clienteActual;

  if (sobrePrecio > 0.5 && Math.random() < 0.45 && !tipoError) {
    document.getElementById('dcTexto').innerHTML = `
      <em>"Nah, mirá... paso. Está muy caro, voy al chino de la otra cuadra."</em><br><br>
      Se fue sin comprar. Tus precios están bastante por encima del mercado.`;
    document.getElementById('dcBotones').innerHTML =
      '<button class="btn" onclick="cerrarDialogoCliente()">Cerrar</button>';
    gameState.estres = Math.min(100, gameState.estres + 10);
    actualizarHUD();
    clienteActual = null;
    return;
  }

  for (const it of pedido) it.prod.stock -= it.cant;

  const bonusCartel = (mejoras.carteLuminoso && !tipoError) ? 400 : 0;
  const neto = total - perdidaExtra + bonusCartel;

  gameState.caja += neto;
  gameState.ventasDelDia += neto;
  gameState.ventasDeLaSemana += neto;
  gameState.clientesAtendidosHoy++;

  if (tipoError === 'de_mas')       gameState.estres = Math.min(100, gameState.estres + 12);
  else if (tipoError === 'reclamo') gameState.estres = Math.min(100, gameState.estres + 18);
  else                              gameState.estres = Math.max(0, gameState.estres - 1);

  if (gameState.clientesAtendidosHoy % 3 === 0) {
    gameState.estres = Math.min(100, gameState.estres + 2);
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
      ${bonusCartel > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:13px; color:#5FD96C;">
        <span>Bonus cartel luminoso</span><span>+$${bonusCartel.toLocaleString('es-AR')}</span>
      </div>` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:700; color:${color}; padding-top:8px; border-top:1px solid #333; margin-top:8px;">
        <span>Neto a caja</span><span>+$${neto.toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:10px; font-style:italic; color:#a8a094;">${cierre}</div>`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="cerrarDialogoCliente()">Siguiente</button>';

  clienteActual = null;

  chequearMetas();
}

function rechazarVenta() {
  gameState.estres = Math.min(100, gameState.estres + 8);
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