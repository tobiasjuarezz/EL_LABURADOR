// ==========================================================
// INTERFAZ
// HUD, panel de gestión (compra y precios), metas y
// pantalla de inicio. Todo lo que es HTML, no 3D.
// ==========================================================

function obtenerDimensiones() {
  const el = document.getElementById('canvasWrapper');
  return {
    w: el.clientWidth  || window.innerWidth,
    h: el.clientHeight || window.innerHeight
  };
}

// ==========================================================
// HUD
// ==========================================================
function actualizarHUD() {
  document.getElementById('hudSemana').textContent =
    `Sem ${gameState.semanaActual} · ${nombreDiaActual()}`;

  document.getElementById('hudCaja').textContent =
    `$${gameState.caja.toLocaleString('es-AR')}`;

  document.getElementById('hudFianza').textContent =
    `$${gameState.caja.toLocaleString('es-AR')} / $${gameState.metaFianza.toLocaleString('es-AR')}`;

  const pct = Math.min(100, (gameState.caja / gameState.metaFianza) * 100);
  document.getElementById('fianzaFill').style.width = pct + '%';

  // Préstamo voluntario activo: se muestra en el HUD para que el
  // plazo de PLAZO_PRESTAMO_DIAS nunca quede escondido en un submenú.
  const bloquePrestamo = document.getElementById('prestamoHud');
  if (bloquePrestamo) {
    if (prestamo.activo) {
      bloquePrestamo.classList.remove('oculto');
      const diasRestantes = Math.max(0, prestamo.diaGlobalVencimiento - gameState.diaGlobal);
      document.getElementById('hudPrestamo').textContent =
        `$${prestamo.monto.toLocaleString('es-AR')} · ${diasRestantes}d`;
    } else {
      bloquePrestamo.classList.add('oculto');
    }
  }

  document.getElementById('estresFill').style.width = gameState.estres + '%';

  let estadoEstres = 'Tranquilo';
  if (gameState.estres >= 67) estadoEstres = 'Al límite';
  else if (gameState.estres >= 34) estadoEstres = 'Tenso';
 document.getElementById('hudEstres').textContent = estadoEstres;

  // Cuando el estrés está al límite, la barra late como aviso
  const barraEstres = document.getElementById('estresFill');
  barraEstres.classList.toggle('critico', gameState.estres >= 85);

  actualizarProgresoMetas();

  // ¿Llegó a la meta? La partida termina en victoria al instante, sin
  // esperar a que cierre la semana (tiene prioridad sobre el colapso).
  if (chequearVictoriaInstantanea()) return;

  // ¿Llegó a 100? La partida termina acá mismo
  chequearColapso();
}

// ==========================================================
// VICTORIA INSTANTÁNEA
// En cuanto gameState.caja alcanza la meta, la partida termina en
// victoria ahí mismo -- sin importar la semana, si el local está
// clausurado, o si hay una escalada de castigo en curso.
// ==========================================================
function chequearVictoriaInstantanea() {
  if (caminos.partidaTerminada) return false;
  if (gameState.caja < gameState.metaFianza) return false;

  // Mismo criterio de "cómo llegaste" que ya usa evaluarFinal() al
  // cierre de semana para elegir entre las variantes con policía.
  let final = 'meta_solo';
  if (caminos.vecesPolicia > 0) {
    final = caminos.seNegoACoima ? 'policia_intachable' : 'policia_limpio';
  }
  terminarPartida(final);

  // Cierra cualquier ventana que esté abierta
  document.getElementById('dialogoCliente').classList.add('oculto');
  document.getElementById('eventoDia').classList.add('oculto');
  document.getElementById('mensajeHermano').classList.add('oculto');
  cerrarEventoGrande();

  // Un instante de pausa antes del final, para que se sienta el golpe
  setTimeout(() => renderFinal(final), 400);
  return true;
}

// ==========================================================
// PANTALLA DE INICIO
// ==========================================================
function mostrarTabInicio(id, btn) {
  document.querySelectorAll('.pi-seccion').forEach(s => s.classList.remove('activa'));
  document.querySelectorAll('.pi-tab').forEach(t => t.classList.remove('activa'));
  document.getElementById('pi-' + id).classList.add('activa');
  btn.classList.add('activa');
}

function empezarJuego() {
  juegoIniciado = true;
  document.getElementById('pantallaInicio').classList.add('oculto');

  // Nombre personalizado del kiosco (task 9): si el jugador dejó el
  // campo vacío, se queda con el default que ya trae gameState.
  const inputNombre = document.getElementById('inputNombreKiosco');
  const nombreElegido = inputNombre ? inputNombre.value.trim() : '';
  if (nombreElegido) gameState.nombreKiosco = nombreElegido;

  document.getElementById('kioscoSign').textContent = gameState.nombreKiosco;
  document.title = `${gameState.nombreKiosco} — El Laburador`;

  // El primer día también es lunes: llega el mensaje del hermano
  setTimeout(abrirKioscoDelDia, 400);
}

// ==========================================================
// PANEL DE GESTIÓN
// ==========================================================
function togglePanel() {
  const panel = document.getElementById('phasePanel');
  const btn = document.getElementById('btnPanel');
  const estabaOculto = panel.classList.contains('oculto');

  panel.classList.toggle('oculto');
  btn.classList.toggle('panelAbierto', estabaOculto);
  btn.textContent = estabaOculto ? 'Cerrar ✕' : 'Abrir gestión del kiosco';

  if (estabaOculto) renderFaseCompra();
}

function irAFase(fase, btn) {
  document.querySelectorAll('.navBtn').forEach(b => b.classList.remove('activa'));
  if (btn) btn.classList.add('activa');

  if (fase === 'COMPRA') {
    document.getElementById('phaseTitle').textContent = 'Compra de stock';
    document.getElementById('phaseSubtitle').textContent =
      'Decidí cuánto reponer de cada producto.';
    renderFaseCompra();
  } else if (fase === 'PRESTAMO') {
    document.getElementById('phaseTitle').textContent = 'Préstamo voluntario';
    document.getElementById('phaseSubtitle').textContent =
      `Sin interés, pero con ${PLAZO_PRESTAMO_DIAS} días de plazo. Si no lo devolvés a tiempo, perdés.`;
    renderFasePrestamo();
  } else {
    document.getElementById('phaseTitle').textContent = 'Fijación de precios';
    document.getElementById('phaseSubtitle').textContent =
      'Muy caro vendés menos, muy barato ganás poco margen.';
    renderFasePrecios();
  }
}

// ---- Compra de stock ----
function renderFaseCompra() {
  const cont = document.getElementById('phaseContent');
  let html = '';

  for (const p of gameState.productos) {
    const costoUnit = p.costo;
    const subtotal = costoUnit * (p.cantidadCompra || 0);
    html += `
      <div class="compraRow">
        <div class="compraNombre">${p.nombre}</div>
        <div class="compraDato">Stock: ${p.stock}</div>
        <div class="compraDato">$${costoUnit.toLocaleString('es-AR')} c/u</div>
        <button class="qtyBtn" onclick="cambiarCantidadCompra('${p.id}', -1)">−</button>
        <span class="qtyValor" id="qty-${p.id}">${p.cantidadCompra || 0}</span>
        <button class="qtyBtn" onclick="cambiarCantidadCompra('${p.id}', 1)">+</button>
        <div class="compraSubtotal" id="subtotal-${p.id}">$${subtotal.toLocaleString('es-AR')}</div>
      </div>`;
  }

  const total = calcularTotalCompra();
  const excede = total > gameState.caja;

  html += `
    <div class="compraResumen">
      <div>Caja disponible: <strong>$${gameState.caja.toLocaleString('es-AR')}</strong></div>
      <div class="total${excede ? ' excede' : ''}" id="compraTotal">Total: $${total.toLocaleString('es-AR')}</div>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btnSecundario" onclick="cancelarCompra()">Cancelar</button>
      <button class="btn" id="btnConfirmarCompra" onclick="confirmarCompra()" ${excede ? 'disabled' : ''}>Confirmar compra</button>
    </div>`;

  // Vendedor de la esquina: defensa personal
  html += `<div class="vendedorTitulo">Vendedor de la esquina — defensa personal</div>
           <div class="armasLista">`;

  for (const tipo of ORDEN_ARMAS) {
    const arma = ARMAS[tipo];
    const equipada = armaActual === tipo;
    const puedeComprar = !equipada && arma.costo <= gameState.caja;

    html += `
      <div class="armaCard ${equipada ? 'equipada' : ''}">
        <div class="armaNombre">${arma.nombre}</div>
        <div class="armaDato">
          ${arma.costo > 0 ? '$' + arma.costo.toLocaleString('es-AR') : 'Gratis'} ·
          ${Math.round(arma.probDefensa * 100)}% defensa
        </div>
        <button class="armaBtn" onclick="comprarArma('${tipo}')"
                ${equipada || !puedeComprar ? 'disabled' : ''}>
          ${equipada ? 'Equipada' : 'Comprar'}
        </button>
      </div>`;
  }

  html += '</div>';

  cont.innerHTML = html;
}

function calcularTotalCompra() {
  return gameState.productos.reduce(
    (acc, p) => acc + p.costo * (p.cantidadCompra || 0), 0
  );
}

function cambiarCantidadCompra(id, delta) {
  const p = gameState.productos.find(prod => prod.id === id);
  if (!p) return;

  const nueva = (p.cantidadCompra || 0) + delta;
  if (nueva < 0) return;   // no se compra en negativo
  p.cantidadCompra = nueva;

  // Se actualiza solo lo que cambió, sin redibujar toda la lista
  document.getElementById(`qty-${id}`).textContent = p.cantidadCompra;
  document.getElementById(`subtotal-${id}`).textContent =
    `$${(p.costo * p.cantidadCompra).toLocaleString('es-AR')}`;

  const total = calcularTotalCompra();
  const excede = total > gameState.caja;
  const totalEl = document.getElementById('compraTotal');
  totalEl.textContent = `Total: $${total.toLocaleString('es-AR')}`;
  totalEl.classList.toggle('excede', excede);
  document.getElementById('btnConfirmarCompra').disabled = excede;
}

function cancelarCompra() {
  for (const p of gameState.productos) p.cantidadCompra = 0;
  renderFaseCompra();
}

function confirmarCompra() {
  const total = calcularTotalCompra();

  if (total === 0) {
    alert('No pusiste cantidad en ningún producto.');
    return;
  }
  if (total > gameState.caja) {
    alert('No te alcanza la caja para esta compra.');
    return;
  }

  for (const p of gameState.productos) {
    if (p.cantidadCompra > 0) {
      // Se trata todo el stock de un producto como si tuviera la
      // antigüedad de la compra más reciente (ver comentario en
      // estado.js, junto a diasVencimiento).
      p.diaIngresoStock = gameState.diaGlobal;
    }
    p.stock += (p.cantidadCompra || 0);
    p.cantidadCompra = 0;
  }
  gameState.caja -= total;

  actualizarHUD();
  renderFaseCompra();
  alert(`Compra confirmada por $${total.toLocaleString('es-AR')}. El estante ya refleja el nuevo stock.`);
}

// ---- Fijación de precios (rediseñado, task 12) ----
// Ya no hay sliders: el jugador ve el costo real (referencia fija) y
// escribe a mano el precio de venta, mira el beneficio que le queda
// por unidad, y confirma con "De acuerdo". La relación precio-demanda
// se mantiene igual que antes (ver abrirDialogoCliente, en
// ventas.js): más barato que el precio justo del mercado se pide más,
// al precio justo se vende normal, más caro hay quejas y se vende menos.
function renderFasePrecios() {
  const cont = document.getElementById('phaseContent');

  let html = `<div class="precioLeyenda">
    Tenés de referencia lo que <strong>realmente te sale</strong> cada producto (el costo).
    Escribí el precio de venta a mano, fijate el beneficio, y confirmá con "De acuerdo".
    <br>Barato: se lo piden más. Al precio justo: vende normal.
    Caro: se quejan y compran menos.
  </div>`;

  for (const p of gameState.productos) {
    html += renderFilaPrecio(p);
  }

  cont.innerHTML = html;
}

function renderFilaPrecio(p) {
  const beneficio = p.precio - p.costo;
  return `
    <div class="precioRow" id="precioRow-${p.id}">
      <div class="precioNombre">${p.nombre}</div>
      <div class="precioCosto">Costo real<br><strong>$${p.costo.toLocaleString('es-AR')}</strong></div>
      <div class="precioInputWrap">
        <span>Vender a $</span>
        <input type="number" step="10" min="0" class="precioInput" id="precioInput-${p.id}"
               value="${p.precio}" oninput="cambiarPrecioBorrador('${p.id}', this.value)">
      </div>
      <div class="precioBeneficio ${clasificarBeneficio(beneficio)}" id="precioBeneficio-${p.id}">
        Beneficio: $${beneficio.toLocaleString('es-AR')} / u.
      </div>
      <button class="btn btnChico" id="precioOk-${p.id}" onclick="confirmarPrecioProducto('${p.id}')">De acuerdo</button>
    </div>`;
}

function clasificarBeneficio(beneficio) {
  if (beneficio < 0) return 'negativo';
  if (beneficio === 0) return 'nulo';
  return 'positivo';
}

function cambiarPrecioBorrador(id, valor) {
  const p = gameState.productos.find(prod => prod.id === id);
  if (!p) return;

  const nuevo = Math.max(0, Number(valor) || 0);
  const beneficio = nuevo - p.costo;
  const el = document.getElementById(`precioBeneficio-${id}`);
  el.textContent = `Beneficio: $${beneficio.toLocaleString('es-AR')} / u.`;
  el.className = `precioBeneficio ${clasificarBeneficio(beneficio)}`;

  const btn = document.getElementById(`precioOk-${id}`);
  if (btn) btn.textContent = 'De acuerdo';
}

function confirmarPrecioProducto(id) {
  const p = gameState.productos.find(prod => prod.id === id);
  const input = document.getElementById(`precioInput-${id}`);
  if (!p || !input) return;

  p.precio = Math.max(0, Math.round((Number(input.value) || 0) / 10) * 10);
  input.value = p.precio;

  const btn = document.getElementById(`precioOk-${id}`);
  if (btn) {
    btn.textContent = 'Guardado ✓';
    setTimeout(() => { if (btn) btn.textContent = 'De acuerdo'; }, 1000);
  }
}

// ---- Préstamo voluntario (task 9 de la lista de 14) ----
// Sin interés: se debe exactamente lo que se pidió, pero con un plazo
// corto de PLAZO_PRESTAMO_DIAS días (gameState.diaGlobal). Si se
// cumple el plazo sin devolverlo, se pierde la partida (ver
// chequearVencimientoPrestamo, en eventos.js).
function renderFasePrestamo() {
  const cont = document.getElementById('phaseContent');

  if (prestamo.activo) {
    const diasRestantes = prestamo.diaGlobalVencimiento - gameState.diaGlobal;
    const alcanza = gameState.caja >= prestamo.monto;

    cont.innerHTML = `
      <div class="prestamoResumen">
        <div>Debés <strong>$${prestamo.monto.toLocaleString('es-AR')}</strong> (sin interés).</div>
        <div class="${diasRestantes <= 1 ? 'prestamoUrgente' : ''}" style="margin-top:6px;">
          Te quedan <strong>${Math.max(0, diasRestantes)}</strong> día(s) para devolverlo.
          Si se cumple el plazo y no pagaste, perdés la partida.
        </div>
      </div>
      <div style="display:flex; gap:10px; margin-top:14px;">
        <button class="btn" onclick="devolverPrestamo()" ${alcanza ? '' : 'disabled'}>
          Devolver ahora ($${prestamo.monto.toLocaleString('es-AR')})
        </button>
      </div>
      ${alcanza ? '' : '<div class="prestamoAviso">Todavía no te alcanza la caja para devolverlo.</div>'}`;
    return;
  }

  cont.innerHTML = `
    <div class="prestamoIntro">
      Un prestamista del barrio te presta plata para reforzar la compra de stock.
      Sin interés, pero con un plazo corto: <strong>${PLAZO_PRESTAMO_DIAS} días</strong>.
      Si no se lo devolvés a tiempo, perdés el kiosco.
    </div>
    <div class="prestamoMontos">
      <button class="btn btnSecundario" onclick="pedirPrestamo(3000)">Pedir $3.000</button>
      <button class="btn btnSecundario" onclick="pedirPrestamo(6000)">Pedir $6.000</button>
      <button class="btn btnSecundario" onclick="pedirPrestamo(10000)">Pedir $10.000</button>
    </div>`;
}

function pedirPrestamo(monto) {
  if (prestamo.activo) return;

  prestamo.activo = true;
  prestamo.monto = monto;
  prestamo.diaGlobalPedido = gameState.diaGlobal;
  prestamo.diaGlobalVencimiento = gameState.diaGlobal + PLAZO_PRESTAMO_DIAS;

  gameState.caja += monto;
  actualizarHUD();
  renderFasePrestamo();
}

function devolverPrestamo() {
  if (!prestamo.activo || gameState.caja < prestamo.monto) return;

  gameState.caja -= prestamo.monto;
  prestamo.activo = false;
  prestamo.monto = 0;
  prestamo.diaGlobalPedido = null;
  prestamo.diaGlobalVencimiento = null;

  actualizarHUD();
  renderFasePrestamo();
}

// ==========================================================
// METAS INTERMEDIAS
// Cada una da una mejora PERMANENTE del kiosco, no solo un
// cartel. Rompen la espera larga hasta la meta final.
// ==========================================================

const METAS = [
  {
    monto: 8000,
    titulo: 'El kiosco respira',
    premio: 'Clientela fija',
    descripcion: 'Ya te conocen en el barrio. Los clientes tienen más paciencia: ' +
                 'baja a la mitad la chance de que se vayan cuando estás estresado.',
    aplicar: () => { mejoras.clientelaFija = true; }
  },
  {
    monto: 16000,
    titulo: 'Heladera nueva',
    premio: 'Heladera con batería + café en vaso',
    descripcion: 'Compraste una heladera que aguanta los cortes de luz. ' +
                 'Ya no se te van a echar a perder las bebidas. Además, con la heladera ' +
                 'nueva sumaste café en vaso al catálogo.',
    aplicar: () => {
      mejoras.heladeraNueva = true;
      gameState.productos.push({ ...PRODUCTOS_DESBLOQUEABLES.cafe });
    }
  },
  {
    monto: 25000,
    titulo: 'Media fianza',
    premio: 'Cartel luminoso',
    descripcion: 'Pusiste un cartel de neón en la ventanita. Se ve desde la esquina ' +
                 'y entra más gente: ganás $400 extra por cada cliente que atendés bien.',
    aplicar: () => { mejoras.carteLuminoso = true; }
  },
  {
    monto: 34000,
    titulo: 'Ya casi',
    premio: 'Cámara de seguridad + sanguches',
    descripcion: 'Instalaste una cámara sobre el mostrador. Los que vienen a probar ' +
                 'suerte lo piensan dos veces: bajan mucho los robos. Con más movimiento ' +
                 'en el local, sumaste sanguches al catálogo.',
    aplicar: () => {
      mejoras.camaraSeguridad = true;
      gameState.productos.push({ ...PRODUCTOS_DESBLOQUEABLES.sanguche });
    }
  },
  {
    monto: 43000,
    titulo: 'La recta final',
    premio: 'Proveedor de confianza',
    descripcion: 'Un mayorista te dio cuenta corriente. Toda la mercadería te sale ' +
                 'un 20% más barata de acá en adelante.',
    aplicar: () => {
      mejoras.proveedorFijo = true;
      for (const p of gameState.productos) {
        p.costo = Math.round(p.costo * 0.8);
      }
    }
  }
];

let metasAlcanzadas = 0;

function chequearMetas() {
  // Si la partida ya terminó (por ejemplo, por chequearVictoriaInstantanea
  // en la misma jugada que disparó esto), no hay que mostrar un cartel
  // de meta alcanzada peleando con el cartel de final.
  if (caminos.partidaTerminada) return false;
  if (metasAlcanzadas >= METAS.length) return false;

  const meta = METAS[metasAlcanzadas];
  if (gameState.caja < meta.monto) return false;

  metasAlcanzadas++;
  meta.aplicar();
  mostrarMetaAlcanzada(meta);
  return true;
}

function mostrarMetaAlcanzada(meta) {
  document.getElementById('maTitulo').textContent = meta.titulo;
  document.getElementById('maMonto').textContent =
    `Superaste los $${meta.monto.toLocaleString('es-AR')}`;
  document.getElementById('maPremio').innerHTML =
    `<strong style="color:#5FD96C;">${meta.premio}</strong><br>${meta.descripcion}`;

  dialogoAbierto = true;
  document.getElementById('metaAlcanzada').classList.remove('oculto');
}

function cerrarMetaAlcanzada() {
  dialogoAbierto = false;
  document.getElementById('metaAlcanzada').classList.add('oculto');
  actualizarProgresoMetas();
}

function actualizarProgresoMetas() {
  const elMeta = document.getElementById('mpMeta');
  const elFalta = document.getElementById('mpFalta');
  if (!elMeta) return;

  if (metasAlcanzadas >= METAS.length) {
    elMeta.textContent = 'Todas conseguidas';
    elFalta.textContent = `Falta la fianza: $${
      Math.max(0, gameState.metaFianza - gameState.caja).toLocaleString('es-AR')}`;
    return;
  }

  const meta = METAS[metasAlcanzadas];
  const falta = meta.monto - gameState.caja;

  elMeta.textContent = meta.premio;
  elFalta.textContent = falta > 0
    ? `Faltan $${falta.toLocaleString('es-AR')}`
    : '¡Alcanzada!';
}

// ==========================================================
// COLAPSO POR ESTRÉS
// Si el estrés llega a 100, la partida termina en el momento
// (antes solo se chequeaba al cerrar la semana).
// ==========================================================
function chequearColapso() {
  if (caminos.partidaTerminada) return false;
  if (gameState.estres < 100) return false;

  terminarPartida('colapso_estres');

  // Cierra cualquier ventana que esté abierta
  document.getElementById('dialogoCliente').classList.add('oculto');
  document.getElementById('eventoDia').classList.add('oculto');
  document.getElementById('mensajeHermano').classList.add('oculto');

  // Un instante de pausa antes del final, para que se sienta el golpe
  setTimeout(() => renderFinal('colapso_estres'), 500);
  return true;
}