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

  document.getElementById('estresFill').style.width = gameState.estres + '%';

  let estadoEstres = 'Tranquilo';
  if (gameState.estres >= 67) estadoEstres = 'Al límite';
  else if (gameState.estres >= 34) estadoEstres = 'Tenso';
 document.getElementById('hudEstres').textContent = estadoEstres;

  // Cuando el estrés está al límite, la barra late como aviso
  const barraEstres = document.getElementById('estresFill');
  barraEstres.classList.toggle('critico', gameState.estres >= 85);

  actualizarProgresoMetas();

  // ¿Llegó a 100? La partida termina acá mismo
  chequearColapso();
}

// ==========================================================
// PANTALLA DE INICIO
// ==========================================================
function mostrarTabInicio(id, btn) {
  sonidoClick();
  document.querySelectorAll('.pi-seccion').forEach(s => s.classList.remove('activa'));
  document.querySelectorAll('.pi-tab').forEach(t => t.classList.remove('activa'));
  document.getElementById('pi-' + id).classList.add('activa');
  btn.classList.add('activa');
}

function empezarJuego() {
  sonidoClick();
  juegoIniciado = true;
  document.getElementById('pantallaInicio').classList.add('oculto');

  iniciarMusicaAmbiente();

  setTimeout(abrirKioscoDelDia, 400);
}

async function continuarPartida() {
  sonidoClick();

  const cargado = await cargarPartida();
  if (!cargado) {
    sonidoError();
    alert('No se pudo cargar la partida guardada.');
    return;
  }

  juegoIniciado = true;
  document.getElementById('pantallaInicio').classList.add('oculto');

  iniciarMusicaAmbiente();
  actualizarHUD();
}

function nuevaPartidaConfirmar() {
  if (haySartidaGuardada()) {
    const confirmar = confirm('Ya hay una partida guardada. ¿Empezar una nueva de todos modos? Se va a perder el progreso guardado.');
    if (!confirmar) return;
    borrarPartidaGuardada();
  }
  empezarJuego();
}

// ==========================================================
// PANEL DE GESTIÓN
// ==========================================================
function togglePanel() {
  sonidoClick();
  const panel = document.getElementById('phasePanel');
  const btn = document.getElementById('btnPanel');
  const estabaOculto = panel.classList.contains('oculto');

  panel.classList.toggle('oculto');
  btn.classList.toggle('panelAbierto', estabaOculto);
  btn.textContent = estabaOculto ? 'Cerrar ✕' : 'Abrir gestión del kiosco';

  if (estabaOculto) renderFaseCompra();
}

function irAFase(fase, btn) {
  sonidoClick();
  document.querySelectorAll('.navBtn').forEach(b => b.classList.remove('activa'));
  if (btn) btn.classList.add('activa');

  if (fase === 'COMPRA') {
    document.getElementById('phaseTitle').textContent = 'Compra de stock';
    document.getElementById('phaseSubtitle').textContent =
      'Decidí cuánto reponer de cada producto.';
    renderFaseCompra();
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
    const subtotal = p.costo * (p.cantidadCompra || 0);
    html += `
      <div class="compraRow">
        <div class="compraNombre">${p.nombre}</div>
        <div class="compraDato">Stock: ${p.stock}</div>
        <div class="compraDato">$${p.costo.toLocaleString('es-AR')} c/u</div>
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

  html += `<button class="btn btnSecundario" style="margin-top:12px; width:100%;" onclick="guardarPartidaManual()">💾 Guardar partida</button>`;

  cont.innerHTML = html;
}

function calcularTotalCompra() {
  return gameState.productos.reduce(
    (acc, p) => acc + p.costo * (p.cantidadCompra || 0), 0
  );
}

function cambiarCantidadCompra(id, delta) {
  sonidoClick();
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
  sonidoClick();
  for (const p of gameState.productos) p.cantidadCompra = 0;
  renderFaseCompra();
}

function confirmarCompra() {
  const total = calcularTotalCompra();

  if (total === 0) {
    sonidoError();
    alert('No pusiste cantidad en ningún producto.');
    return;
  }
  if (total > gameState.caja) {
    sonidoError();
    alert('No te alcanza la caja para esta compra.');
    return;
  }

  for (const p of gameState.productos) {
    p.stock += (p.cantidadCompra || 0);
    p.cantidadCompra = 0;
  }
  gameState.caja -= total;

  sonidoVenta();
  actualizarHUD();
  renderFaseCompra();
  alert(`Compra confirmada por $${total.toLocaleString('es-AR')}. El estante ya refleja el nuevo stock.`);
}

// ---- Fijación de precios ----
// El jugador NO ve el precio justo como número: solo una marca
// visual y el color. Tiene que aprender por tanteo.
function renderFasePrecios() {
  const cont = document.getElementById('phaseContent');

  let html = `<div class="precioLeyenda">
    La <span>línea ámbar</span> marca la referencia del mercado.
    Verde = precio equilibrado · Celeste = barato · Rojo = caro.
  </div>`;

  for (const p of gameState.productos) {
    // El slider va del 40% al 180% del precio justo
    const min = Math.round((p.precioJusto * 0.4) / 10) * 10;
    const max = Math.round((p.precioJusto * 1.8) / 10) * 10;
    // Dónde cae el precio justo dentro de ese rango
    const pct = ((p.precioJusto - min) / (max - min)) * 100;

    html += `
      <div class="precioRow">
        <div class="precioNombre">${p.nombre}</div>
        <div class="precioCosto">Costo: $${p.costo.toLocaleString('es-AR')}</div>
        <div class="precioSliderWrap">
          <div class="precioMarker" style="left: calc(${pct}% - 1.5px);"></div>
          <input type="range" class="precioSlider"
                 min="${min}" max="${max}" step="10" value="${p.precio}"
                 oninput="cambiarPrecio('${p.id}', this.value)">
        </div>
        <div class="precioValor ${clasificarPrecio(p)}" id="precioValor-${p.id}">
          $${p.precio.toLocaleString('es-AR')}
        </div>
      </div>`;
  }

  cont.innerHTML = html;
}

function clasificarPrecio(p) {
  const distancia = Math.abs(p.precio - p.precioJusto) / p.precioJusto;
  if (distancia <= 0.08) return 'justo';
  return p.precio < p.precioJusto ? 'bajo' : 'alto';
}

function cambiarPrecio(id, valor) {
  const p = gameState.productos.find(prod => prod.id === id);
  if (!p) return;

  p.precio = Number(valor);

  const el = document.getElementById(`precioValor-${id}`);
  el.textContent = `$${p.precio.toLocaleString('es-AR')}`;
  el.className = `precioValor ${clasificarPrecio(p)}`;
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
    premio: 'Heladera con batería',
    descripcion: 'Compraste una heladera que aguanta los cortes de luz. ' +
                 'Ya no se te van a echar a perder las bebidas.',
    aplicar: () => { mejoras.heladeraNueva = true; }
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
    premio: 'Cámara de seguridad',
    descripcion: 'Instalaste una cámara sobre el mostrador. Los que vienen a probar ' +
                 'suerte lo piensan dos veces: bajan mucho los robos.',
    aplicar: () => { mejoras.camaraSeguridad = true; }
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
  if (metasAlcanzadas >= METAS.length) return false;

  const meta = METAS[metasAlcanzadas];
  if (gameState.caja < meta.monto) return false;

  metasAlcanzadas++;
  meta.aplicar();
  mostrarMetaAlcanzada(meta);
  return true;
}

function mostrarMetaAlcanzada(meta) {
  sonidoVenta();
  document.getElementById('maTitulo').textContent = meta.titulo;
  document.getElementById('maMonto').textContent =
    `Superaste los $${meta.monto.toLocaleString('es-AR')}`;
  document.getElementById('maPremio').innerHTML =
    `<strong style="color:#5FD96C;">${meta.premio}</strong><br>${meta.descripcion}`;

  dialogoAbierto = true;
  document.getElementById('metaAlcanzada').classList.remove('oculto');
}

function cerrarMetaAlcanzada() {
  sonidoClick();
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

  detenerMusicaAmbiente();
  terminarPartida('colapso_estres');

  // Cierra cualquier ventana que esté abierta
  document.getElementById('dialogoCliente').classList.add('oculto');
  document.getElementById('eventoDia').classList.add('oculto');
  document.getElementById('mensajeHermano').classList.add('oculto');

  // Un instante de pausa antes del final, para que se sienta el golpe
  setTimeout(() => renderFinal('colapso_estres'), 500);
  return true;
}