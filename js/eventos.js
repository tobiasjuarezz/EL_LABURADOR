// ==========================================================
// EVENTOS DIARIOS Y CICLO DE DÍAS
// Los eventos rompen la rutina de vender. El ciclo de días
// estructura la partida: la semana tiene 6 días (lunes a sábado).
// ==========================================================

// Cada día pueden pasar varias cosas, pero no todas juntas: se
// eligen entre 4 y 5 sin repetir y se guardan acá. Van apareciendo
// de a una, cada vez que se termina de atender a un cliente (ver
// cerrarDialogoCliente en ventas.js), no todas al abrir el kiosco.
// _mostrarEventoDiaTick sirve para saber, al cerrar un cartel, si
// su propio botón abrió un cartel nuevo (evento de varios pasos,
// como el concurso de radio) o si ahí terminó de verdad.
let colaEventosDia = [];
let _mostrarEventoDiaTick = 0;

// Mala fama (task 19/4): se activa cuando el jugador erra 3 vueltos
// seguidos (ver dispararEventoMalaFama). Mientras dure, cualquier
// nuevo error de vuelto pesa un poco más en el estrés (ver cobrarVenta,
// en ventas.js). Se apaga sola al cerrar la semana.
let malaFamaSemana = false;
 
// ---- Cartel de evento diario ----
function mostrarEventoDia(etiqueta, titulo, texto, botones) {
  _mostrarEventoDiaTick++;
  const tickAlAbrir = _mostrarEventoDiaTick;
 
  document.getElementById('edEtiqueta').textContent = etiqueta;
  document.getElementById('edTitulo').textContent = titulo;
  document.getElementById('edTexto').innerHTML = texto;
 
  const cont = document.getElementById('edBotones');
  cont.innerHTML = '';
 
  for (const b of botones) {
    const btn = document.createElement('button');
    btn.className = b.secundario ? 'btn btnSecundario' : 'btn';
    btn.textContent = b.texto;
    btn.onclick = () => {
      if (b.accion) b.accion();
      // Si accion() no mostró un cartel nuevo (el tick no cambió),
      // este evento terminó acá: se pasa al siguiente de la cola,
      // o se cierra de verdad si no queda ninguno.
      if (_mostrarEventoDiaTick === tickAlAbrir) {
        avanzarColaEventos();
      }
    };
    cont.appendChild(btn);
  }
 
  dialogoAbierto = true;
  document.getElementById('eventoDia').classList.remove('oculto');
}
 
// ---- Cierra el cartel de evento diario ----
// El resto de la cola (colaEventosDia) NO se muestra acá: espera a
// que se atienda al próximo cliente (ver cerrarDialogoCliente en
// ventas.js), para que los eventos no aparezcan todos seguidos.
function avanzarColaEventos() {
  document.getElementById('eventoDia').classList.add('oculto');
  dialogoAbierto = false;
}
 
// ---- Se llama al abrir el kiosco cada día ----
function abrirKioscoDelDia() {
  cerrarDialogoCliente();

  // El préstamo vencido corta cualquier otra cosa del día: si no se
  // devolvió a tiempo, la partida termina acá (ver chequearVencimientoPrestamo).
  if (chequearVencimientoPrestamo()) return;

  // Los lunes llega el mensaje del hermano antes que nada
  if (esLunes() && !caminos.partidaTerminada) {
    mostrarMensajeHermano();
    return;
  }

  chequearEventoDelDia();
}
function chequearEventoDelDia() {
  limpiarEfectosDia();
  limpiarClima();
  colaEventosDia = [];

  // Productos vencidos: se revisa antes que cualquier otra cosa (task 21)
  const vencidos = chequearVencimientos();
  if (vencidos.length > 0) {
    const detalle = vencidos.map(v => `${v.cant} ${v.prod.nombre}`).join(', ');
    gameState.estres = Math.min(100, gameState.estres + 6);
    actualizarHUD();
    mostrarEventoDia('El estante', 'Se venció mercadería',
      `Revisando el estante te das cuenta de que se pasó de fecha:
       <br><br><span style="color:#ff6b66;">${detalle}.</span>
       <br><br>Tuviste que tirarlo. Plata perdida.`,
      [{ texto: 'Seguir' }]);
    return;
  }

  // Primero: cobrar multas pendientes de ayer
  if (efectosDia.multaPendiente > 0) {
    const multa = efectosDia.multaPendiente;
    efectosDia.multaPendiente = 0;
    gameState.caja = Math.max(0, gameState.caja - multa);
    gameState.estres = Math.min(100, gameState.estres + 10);
    actualizarHUD();
 
    mostrarEventoDia('Correo', 'Llegó una multa',
      `Vino un inspector con una notificación. La mercadería que aceptaste no tenía factura.
       <br><br><span style="color:#ff6b66;">Multa: $${multa.toLocaleString('es-AR')}</span>`,
      [{ texto: 'Pagar y seguir' }]);
    return;
  }

  // Semana de castigo: el capo exige mercadería cada 2 días exactos
  // (garantizado, no es probabilidad) y, si el jugador ya se negó a
  // entregarla alguna vez, un chorro aprovecha para robar cada 3 días
  // exactos. Ambos usan gameState.diaGlobal (no se reinicia por semana)
  // para no perder el ritmo al cruzar de una semana de castigo a la
  // siguiente. Si coinciden en el mismo día, la exigencia del capo tiene
  // prioridad y el chorro espera a su próximo múltiplo de 3.
  if (enSemanaCastigo()) {
    const diaDeCastigo = gameState.diaGlobal - caminos.diaGlobalInicioCastigo + 1;
    const totalUnidades = gameState.productos.reduce((acc, p) => acc + p.stock, 0);

    if (diaDeCastigo % 2 === 0 && totalUnidades > 0) {
      eventoExtorsionMercaderiaCapo();
      return;
    }
    if (diaDeCastigo % 3 === 0 && caminos.seNegoAlCapoCastigo) {
      eventoChorroCastigo();
      return;
    }
  }

  // Si le pagaste al policía, puede volver a pedir (hasta 2 veces por semana)
  if (caminos.vecesPolicia > 0 && !caminos.seNegoACoima
      && extorsion.vecesEstaSemana < 2 && Math.random() < 0.30) {
    eventoPoliciaProductos();
    return;
  }
 
  // TODOS los días pasa algo. El clima (frío/calor/festejo) se separa
  // del resto: climaHoy solo puede tener un estado a la vez, así que
  // como mucho se elige UNO de esos tres por día (antes podía salir
  // más de uno por azar y el segundo pisaba en silencio al primero).
  const climaEventos = [eventoOlaDeFrio, eventoOlaDeCalor, eventoFestejoDelBarrio];
  const otrosEventos = [
    eventoCorteDeLuz,
    eventoProductoViral,
    eventoConcursoRadio,
    eventoProveedorVencido,
    eventoEntregaEquivocada,
    eventoProductoProhibido
  ];

  const climaElegido = Math.random() < 0.55
    ? [climaEventos[Math.floor(Math.random() * climaEventos.length)]]
    : [];

  let seleccion = [...otrosEventos].sort(() => Math.random() - 0.5);

  // "Día difícil" (task 7): una parte de los días, el corte de luz y
  // el retiro de un producto se fuerzan juntos, para que se sienta que
  // varias cosas malas se combinan el mismo día en vez de venir de a una.
  const diaDificil = Math.random() < 0.25;
  if (diaDificil) {
    seleccion = seleccion.filter(f => f !== eventoCorteDeLuz && f !== eventoProductoProhibido);
    seleccion = [eventoCorteDeLuz, eventoProductoProhibido, ...seleccion];
  }

  // Entre 4 y 5 cosas por día en total, ninguna repetida. No se
  // muestra ninguna todavía: la primera aparece recién cuando se
  // atiende al primer cliente (ver cerrarDialogoCliente en ventas.js).
  const cantidadOtros = Math.min(seleccion.length, (diaDificil ? 3 : 4) + Math.floor(Math.random() * 2));
  colaEventosDia = [...climaElegido, ...seleccion.slice(0, cantidadOtros)]
    .sort(() => Math.random() - 0.5);
}

// ---- Productos que se vencen (task 21) ----
// Se revisa cada día antes de armar la cola de eventos. Un producto
// vencido se pierde entero (no se prorratea la pérdida): si ya pasó
// diasVencimiento desde la última reposición (diaIngresoStock, que se
// fija en confirmarCompra, interfaz.js), se tira. El stock inicial
// (diaIngresoStock null) no vence hasta la primera reposición.
function chequearVencimientos() {
  const vencidos = [];
  for (const p of gameState.productos) {
    if (p.stock > 0 && p.diaIngresoStock !== null &&
        gameState.diaGlobal - p.diaIngresoStock >= p.diasVencimiento) {
      vencidos.push({ prod: p, cant: p.stock });
      p.stock = 0;
      p.diaIngresoStock = null;
    }
  }
  return vencidos;
}

// ---- Evento negativo por 3 errores de vuelto seguidos (task 19) ----
function dispararEventoMalaFama() {
  malaFamaSemana = true;
  gameState.estres = Math.min(100, gameState.estres + 12);
  actualizarHUD();

  mostrarEventoDia('En el barrio', 'Se corrió la bola',
    `Tres vueltos mal dados seguidos no pasan desapercibidos en un barrio chico.
     Alguien comentó en el grupo de WhatsApp del barrio que "en ese kiosco te dan
     cualquier cosa de vuelto".
     <br><br><span style="color:#ff6b66;">Mala fama: durante el resto de la semana vas a
     tener menos paciencia de sobra con los clientes -- cualquier nuevo error de vuelto
     te va a costar un poco más de estrés.</span>`,
    [{ texto: 'Aguantar el golpe' }]);
}

// ---- Préstamo voluntario: chequeo del vencimiento (task 13/9) ----
// Se llama al abrir cada día. Si hay un préstamo activo y ya se pasó
// el plazo (PLAZO_PRESTAMO_DIAS desde que se pidió), la partida
// termina ahí mismo: perdiste.
function chequearVencimientoPrestamo() {
  if (!prestamo.activo || caminos.partidaTerminada) return false;
  if (gameState.diaGlobal < prestamo.diaGlobalVencimiento) return false;

  _mostrarEventoDiaTick++;
  terminarPartida('bancarrota');
  mostrarEventoGrande({
    etiqueta: 'El prestamista',
    titulo: 'Se cumplió el plazo',
    relato: `Pediste $${prestamo.monto.toLocaleString('es-AR')} prestados y te diste
             ${PLAZO_PRESTAMO_DIAS} días para devolverlos. El plazo se cumplió y no
             tenías la plata.
             <br><br>El prestamista no te dio ni un día más. El kiosco no puede
             seguir así.`,
    opciones: [{
      titulo: 'Ver el final',
      accion: () => renderFinal(caminos.finalObtenido)
    }]
  });
  return true;
}

// ---- El camino del policía: saltear la espera de la clausura ----
// El local queda clausurado exactamente UNA semana (caminos.clausurado
// se pone en 1 y se descuenta a 0 en confirmarFinDeSemana). Antes había
// que clickear "cerrar el día" uno por uno hasta que se terminaba sola;
// esto salta directo al último día de esa semana, cobra lo que haya que
// cobrar en el camino (el medio aguinaldo del miércoles, si no se cobró
// todavía) y deja al jugador en el balance de fin de semana, que reabre
// el kiosco normalmente.
function saltearSemanaClausurada() {
  if (caminos.clausurado <= 0 || caminos.partidaTerminada) return;

  let mensajeGastoParcial = '';
  if (!gameState.gastoParcialCobradoEstaSemana) {
    mensajeGastoParcial = cobrarGastoParcialSemanaLimite();
  }

  gameState.diaGlobal += Math.max(0, gameState.diasPorSemana - gameState.diaActual);
  gameState.diaActual = gameState.diasPorSemana;
  colaEventosDia = [];
  actualizarHUD();

  const dlg = document.getElementById('dialogoCliente');
  dialogoAbierto = true;
  dlg.classList.remove('oculto');
  document.getElementById('dcTitulo').textContent = 'Clausura';
  document.getElementById('dcTexto').innerHTML = `
    Bajaste la persiana y dejaste pasar los días con el local precintado. No había nada
    para hacer ahí adentro.
    ${mensajeGastoParcial}
    <br><br>Llegó el último día de la clausura.`;
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="confirmarFinDeSemana()">Ver el balance y reabrir</button>';
}
 
// ---- Corte de luz ----
function eventoCorteDeLuz() {
  efectosDia.sinLuz = true;
 
  // Con la heladera nueva (meta 2) las bebidas se salvan
  const perecederos = mejoras.heladeraNueva ? [] : gameState.productos.filter(
    p => ['gaseosa', 'agua', 'jugo'].includes(p.id) && p.stock > 0
  );
 
  let perdidos = 0;
  let detalle = '';
 
  for (const p of perecederos) {
    if (Math.random() < 0.5) {
      const cuantos = Math.ceil(p.stock / 2);
      p.stock -= cuantos;
      perdidos += cuantos;
      detalle += `${cuantos} ${p.nombre}, `;
    }
  }
 
  gameState.estres = Math.min(100, gameState.estres + 14);
  actualizarHUD();
 
  mostrarEventoDia('Sin luz', 'Se cortó la luz',
    `Todo el barrio quedó a oscuras. La heladera dejó de andar y el local está negro:
     hoy no vas a poder vender nada.
     ${perdidos > 0
       ? `<br><br><span style="color:#ff6b66;">Se echó a perder: ${detalle.slice(0, -2)}.</span>`
       : mejoras.heladeraNueva
         ? '<br><br><span style="color:#5FD96C;">La heladera con batería aguantó. No perdiste nada.</span>'
         : '<br><br>Por suerte no se perdió mercadería.'}
     <br><br>Un día entero de pérdida.`,
    [{ texto: 'Bancar el día' }]);
}
 
// ---- Producto viral ----
function eventoProductoViral() {
  const conStock = gameState.productos.filter(p => p.stock > 0);
  if (conStock.length === 0) { avanzarColaEventos(); return; }
 
  const p = conStock[Math.floor(Math.random() * conStock.length)];
  efectosDia.productoViral = p.id;
 
  mostrarEventoDia('Se hizo viral', `Todos quieren ${p.nombre}`,
    `Apareció en un video que se hizo viral y hoy no para de venir gente
     preguntando por <strong>${p.nombre}</strong>.
     <br><br><span style="color:#5FD96C;">Hoy se lleva más cantidad y no se queja del precio.</span>`,
    [{ texto: 'Aprovechar' }]);
}
 
// ---- Concurso de radio ----
function eventoConcursoRadio() {
  const preguntas = [
    { p: '¿En qué año fue la Revolución de Mayo?', ops: ['1810', '1816', '1806'], ok: 0 },
    { p: '¿Quién cruzó los Andes?', ops: ['Belgrano', 'San Martín', 'Sarmiento'], ok: 1 },
    { p: '¿Cuánto es el 15% de 400?', ops: ['60', '45', '75'], ok: 0 },
    { p: '¿Cuánto es 8 × 7?', ops: ['54', '56', '58'], ok: 1 },
    { p: '¿Quién creó la bandera argentina?', ops: ['San Martín', 'Moreno', 'Belgrano'], ok: 2 },
    { p: 'Algo cuesta $250 y pagás con $1000. ¿Cuánto es el vuelto?', ops: ['$750', '$850', '$650'], ok: 0 },
    { p: '¿En qué año se declaró la Independencia?', ops: ['1810', '1816', '1820'], ok: 1 },
    { p: '¿Cuánto es 12 × 12?', ops: ['144', '124', '164'], ok: 0 }
  ];
 
  const q = preguntas[Math.floor(Math.random() * preguntas.length)];
  const premio = 3000;
 
  const botones = q.ops.map((op, i) => ({
    texto: op,
    secundario: true,
    accion: () => {
      if (i === q.ok) {
        gameState.caja += premio;
        gameState.estres = Math.max(0, gameState.estres - 5);
        actualizarHUD();
        mostrarEventoDia('Radio', '¡Acertaste!',
          `"¡Correcto! Te ganaste <strong>$${premio.toLocaleString('es-AR')}</strong>."
           <br><br>Un poco de aire para la semana.`,
          [{ texto: 'Genial' }]);
      } else {
        mostrarEventoDia('Radio', 'Erraste',
          `"Uh, no. La respuesta era <strong>${q.ops[q.ok]}</strong>. Suerte la próxima."`,
          [{ texto: 'Seguir' }]);
      }
    }
  }));
 
  mostrarEventoDia('Radio del kiosco', 'Concurso al aire',
    `La radio que tenés prendida está haciendo un concurso. Llamás y te atienden.
     <br><br><strong>"${q.p}"</strong>
     <br><br><span style="color:#8fb8d8;">Premio: $${premio.toLocaleString('es-AR')}</span>`,
    botones);
}
 
// ---- Proveedor con mercadería vencida ----
function eventoProveedorVencido() {
  const p = gameState.productos[Math.floor(Math.random() * gameState.productos.length)];
  const cantidad = 8;
  const precioTotal = Math.round(p.costo * cantidad * 0.35);
 
  mostrarEventoDia('En la puerta', 'Un proveedor con oferta',
    `Para una camioneta sin identificación. El tipo abre el baúl:
     <br><br>"Che, tengo <strong>${cantidad} ${p.nombre}</strong> a
     <strong>$${precioTotal.toLocaleString('es-AR')}</strong>, un tercio de lo que te sale normal.
     Están apenas pasados de fecha, pero se venden igual."
     <br><br><span style="color:#ff6b66;">Si alguien se da cuenta, te puede costar caro.</span>`,
    [
      {
        texto: `Comprar ($${precioTotal.toLocaleString('es-AR')})`,
        accion: () => {
          if (gameState.caja < precioTotal) {
            mostrarEventoDia('En la puerta', 'No te alcanza',
              'Contás la plata y no llegás. El tipo se encoge de hombros y arranca.',
              [{ texto: 'Cerrar' }]);
            return;
          }
          gameState.caja -= precioTotal;
          p.stock += cantidad;
 
          // 35% de chance de multa al día siguiente
          if (Math.random() < 0.35) efectosDia.multaPendiente = 9000;
 
          gameState.estres = Math.min(100, gameState.estres + 6);
          actualizarHUD();
 
          mostrarEventoDia('Trato hecho', 'Cargaste la mercadería',
            `Guardaste ${cantidad} ${p.nombre} en el estante. Nadie va a mirar la fecha.
             <br><br>Ojalá.`,
            [{ texto: 'Seguir' }]);
        }
      },
      {
        texto: 'Decirle que no',
        secundario: true,
        accion: () => {
          mostrarEventoDia('En la puerta', 'Lo dejaste pasar',
            'Le decís que no. Cierra el baúl y arranca sin decir nada.',
            [{ texto: 'Cerrar' }]);
        }
      }
    ]);
}
 
// ---- Entrega equivocada ----
function eventoEntregaEquivocada() {
  mostrarEventoDia('Llegó algo', 'Una caja que no pediste',
    `Un repartidor deja una caja en la puerta y se va rápido, sin pedirte firma.
     No tiene remito ni nombre.
     <br><br>Podés abrirla o dejarla ahí.
     <br><br><span style="color:#ff6b66;">Si la abrís, no la vas a poder devolver.</span>`,
    [
      {
        texto: 'Abrirla',
        accion: () => {
          const suerte = Math.random();
 
          if (suerte < 0.2) {
            // Vacía
            gameState.estres = Math.min(100, gameState.estres + 8);
            actualizarHUD();
            mostrarEventoDia('La caja', 'Estaba vacía',
              'Cartón, papel de diario, y nada más. Perdiste diez minutos.',
              [{ texto: 'Seguir' }]);
 
          } else if (suerte < 0.7) {
            // Poco
            const p = gameState.productos[Math.floor(Math.random() * gameState.productos.length)];
            p.stock += 3;
            mostrarEventoDia('La caja', 'Había algo',
              `Adentro hay <strong>3 ${p.nombre}</strong>. Poco, pero es gratis.`,
              [{ texto: 'Guardarlo' }]);
 
          } else {
            // Mucho
            let detalle = '';
            const mezclados = [...gameState.productos].sort(() => Math.random() - 0.5);
            for (let i = 0; i < 3; i++) {
              mezclados[i].stock += 6;
              detalle += `6 ${mezclados[i].nombre}, `;
            }
            mostrarEventoDia('La caja', 'Estaba llena',
              `Adentro hay <strong>${detalle.slice(0, -2)}</strong>.
               <br><br>Alguien se equivocó feo, pero es tu día de suerte.`,
              [{ texto: 'Guardar todo' }]);
          }
 
          // Riesgo de multa por mercadería sin factura
          if (Math.random() < 0.3) efectosDia.multaPendiente = 7000;
        }
      },
      {
        texto: 'Dejarla ahí',
        secundario: true,
        accion: () => {
          mostrarEventoDia('La caja', 'La dejaste',
            'A la media hora vuelve el repartidor, la carga y se va pidiendo disculpas.',
            [{ texto: 'Cerrar' }]);
        }
      }
    ]);
}
 
// ---- Producto prohibido ----
function eventoProductoProhibido() {
  const conStock = gameState.productos.filter(p => p.stock > 0);
  if (conStock.length === 0) { avanzarColaEventos(); return; }
 
  const p = conStock[Math.floor(Math.random() * conStock.length)];
  efectosDia.productoProhibido = p.id;
 
  gameState.estres = Math.min(100, gameState.estres + 8);
  actualizarHUD();
 
  mostrarEventoDia('Bromatología', `Retiran ${p.nombre} del mercado`,
    `Salió en las noticias: retiraron del mercado el lote de <strong>${p.nombre}</strong>
     por un problema de fabricación.
     <br><br><span style="color:#ff6b66;">Hoy no lo podés vender. Lo tenés que dejar
     guardado hasta mañana.</span>`,
    [{ texto: 'Entendido' }]);
}
 
// ==========================================================
// LA PUERTA DE SALIDA — cierre de día y de semana
// ==========================================================
 
function abrirDialogoSalida() {
  const dlg     = document.getElementById('dialogoCliente');
  const titulo  = document.getElementById('dcTitulo');
  const texto   = document.getElementById('dcTexto');
  const botones = document.getElementById('dcBotones');
 
  dialogoAbierto = true;
  dlg.classList.remove('oculto');
  document.getElementById('promptPuerta').classList.add('oculto');
 
  const esUltimoDia = gameState.diaActual >= gameState.diasPorSemana;
 
  // Último día: confirmación especial para saltar de semana
  if (esUltimoDia) {
    titulo.textContent = `Fin de la semana ${gameState.semanaActual}`;
    texto.innerHTML = `
      Este es el último día de la semana. Si cerrás ahora, se hace el balance
      y arrancás la <strong>semana ${gameState.semanaActual + 1}</strong>.
      <br><br>
      <span style="color:#a8a094; font-size:13px;">
        Vendiste $${gameState.ventasDeLaSemana.toLocaleString('es-AR')} esta semana ·
        Caja: $${gameState.caja.toLocaleString('es-AR')}
      </span>
      <br><br>
      <span style="color:#F2A93B;">
        ¿Seguro? Ya vas a saltar a la semana ${gameState.semanaActual + 1}.
      </span>`;
 
    botones.innerHTML = `
      <button class="btn" onclick="confirmarFinDeSemana()">Sí, cerrar la semana</button>
      <button class="btn btnSecundario" onclick="cerrarDialogoCliente()">Todavía no</button>`;
    return;
  }
 
  const proximoDia = NOMBRES_DIA[gameState.diaActual % 7];
 
  titulo.textContent = `Cerrar el ${nombreDiaActual()}`;
  texto.innerHTML = `
    ¿Bajás la persiana por hoy?
    <br><br>
    <span style="color:#a8a094; font-size:13px;">
      Hoy atendiste ${gameState.clientesAtendidosHoy} cliente(s) ·
      Vendiste $${gameState.ventasDelDia.toLocaleString('es-AR')}
    </span>`;
 
  botones.innerHTML = `
    <button class="btn" onclick="confirmarFinDeDia()">Cerrar y pasar al ${proximoDia}</button>
    <button class="btn btnSecundario" onclick="cerrarDialogoCliente()">Seguir atendiendo</button>`;
}
 
function confirmarFinDeDia() {
  gameState.diaActual++;
  gameState.diaGlobal++;

  // Dormir baja algo de estrés, pero poco: si venís muy quemado,
  // una noche no alcanza para recuperarte.
  const descanso = gameState.estres > 60 ? 4 : 8;
  gameState.estres = Math.max(0, gameState.estres - descanso);
 
  gameState.ventasDelDia = 0;
  gameState.clientesAtendidosHoy = 0;

  // La cola de eventos del día anterior no debe arrastrarse al
  // día siguiente: lo que no se llegó a mostrar, se descarta.
  colaEventosDia = [];

  // Los gastos fijos se cobran dos veces por semana. La primera
  // mitad se cobra al llegar al miércoles (día 3); la segunda la
  // cobra confirmarFinDeSemana() el sábado.
  let mensajeGastoParcial = '';
  if (gameState.diaActual === 3 && !gameState.gastoParcialCobradoEstaSemana) {
    mensajeGastoParcial = cobrarGastoParcialSemanaLimite();
  }

  actualizarHUD();

  // Además del balance semanal, también se puede cruzar un camino
  // narrativo al cerrar cualquier día -- si no, con un ciclo de
  // solo 6 días casi no da tiempo a que aparezca más de un camino
  // en toda la partida.
  if (intentarOfrecerCaminoDelDia(mensajeGastoParcial)) return;

  document.getElementById('dcTitulo').textContent = nombreDiaActual();
  document.getElementById('dcTexto').innerHTML =
    `Bajaste la persiana. Amanece el <strong>${nombreDiaActual()}</strong>,
     día ${gameState.diaActual} de ${gameState.diasPorSemana}.
     ${gameState.estres > 60
       ? '<br><br><span style="color:#ff6b66;">Dormiste mal. Seguís con la cabeza en el kiosco.</span>'
       : ''}
     ${mensajeGastoParcial}`;
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="abrirKioscoDelDia()">Abrir el kiosco</button>';
}

// ==========================================================
// CIERRE AUTOMÁTICO DEL DÍA
// Al llegar a LIMITE_CLIENTES_DIA clientes atendidos, el día se
// acaba solo: el cartel se muestra un ratito, el jugador queda
// congelado (diaBloqueado) y después se pasa solo al día siguiente
// (o al balance de la semana, si era el último día).
// ==========================================================
function cerrarDiaAutomatico() {
  const dlg = document.getElementById('dialogoCliente');
  dialogoAbierto = true;
  diaBloqueado = true;
  dlg.classList.remove('oculto');

  const esUltimoDia = gameState.diaActual >= gameState.diasPorSemana;

  document.getElementById('dcTitulo').textContent = 'Terminó el día';
  document.getElementById('dcTexto').innerHTML = `
    Atendiste <strong>${LIMITE_CLIENTES_DIA} clientes</strong> hoy. Ya está oscureciendo
    y no viene más nadie.
    <br><br>
    <span style="color:#a8a094; font-size:13px;">
      Juntaste $${gameState.ventasDelDia.toLocaleString('es-AR')} en el día.
    </span>
    ${esUltimoDia
      ? '<br><br><span style="color:#F2A93B;">Es el último día: se cierra la semana.</span>'
      : ''}`;

  // Sin botones: el cartel avanza solo, no se puede apurar.
  document.getElementById('dcBotones').innerHTML = '';

  setTimeout(() => {
    diaBloqueado = false;
    if (esUltimoDia) {
      confirmarFinDeSemana();
    } else {
      confirmarFinDeDia();
    }
  }, 2200);
}

// ---- Cobro de la mitad de los gastos fijos (miércoles) ----
function cobrarGastoParcialSemanaLimite() {
  const mitad = Math.round((gameState.alquilerSemanal + gameState.luzSemanal) / 2 / 10) * 10;
  gameState.gastoParcialCobradoEstaSemana = true;
 
  if (gameState.caja >= mitad) {
    gameState.caja -= mitad;
    return `<br><br><span style="color:#ff9b6b;">
      Tocó pagar la mitad de los gastos fijos de la semana:
      $${mitad.toLocaleString('es-AR')}.</span>`;
  }
 
  const pagado = gameState.caja;
  const faltante = mitad - pagado;
  const recargo = Math.round(faltante * 1.2);
  gameState.caja = 0;
  gameState.deudaAcumulada += recargo;
  gameState.estres = Math.min(100, gameState.estres + 15);
 
  return `<br><br><span style="color:#ff6b66;">
    No te alcanzó para la mitad de los gastos fijos ($${mitad.toLocaleString('es-AR')}).
    Pagaste $${pagado.toLocaleString('es-AR')} y quedás debiendo
    $${recargo.toLocaleString('es-AR')} (con recargo).</span>`;
}
 
function confirmarFinDeSemana() {
  const ventasSemana = gameState.ventasDeLaSemana;
  // Se guarda ANTES de avanzar semanaActual más abajo: representa la
  // semana que se está cerrando ahora mismo (necesario para saber si
  // fue una semana de castigo, ver semanaCastigoCerradaLimpia).
  const semanaQueTermina = gameState.semanaActual;

  // La cola de eventos que no se llegó a mostrar esta semana no
  // debe arrastrarse a la semana siguiente.
  colaEventosDia = [];

  // --- Gastos fijos: alquiler y luz, sí o sí ---
  // Ya se cobró la primera mitad el miércoles (confirmarFinDeDia ->
  // cobrarGastoParcialSemanaLimite), así que acá solo se cobra la
  // segunda mitad.
  const gastoPeriodico = Math.round((gameState.alquilerSemanal + gameState.luzSemanal) / 2 / 10) * 10;
  const gastos = gastoPeriodico + gameState.deudaAcumulada;
  let mensajeGastos;

  if (gameState.caja >= gastos) {
    gameState.caja -= gastos;
    const teniaDeuda = gameState.deudaAcumulada > 0;
    gameState.deudaAcumulada = 0;
    mensajeGastos = `<div style="color:#ff9b6b;">
        Pagaste la segunda mitad de los gastos fijos de la semana:
        $${gastoPeriodico.toLocaleString('es-AR')}.
        ${teniaDeuda ? 'Además saldaste la deuda que arrastrabas.' : ''}
      </div>`;
  } else {
    // No alcanzó: la deuda se acumula con 20% de recargo
    const pagado = gameState.caja;
    const faltante = gastos - pagado;
    gameState.caja = 0;
    gameState.deudaAcumulada = Math.round(faltante * 1.2);
    gameState.estres = Math.min(100, gameState.estres + 20);
 
    mensajeGastos = `
      <div style="color:#ff6b66;">
        No te alcanzó para los gastos fijos. Pagaste $${pagado.toLocaleString('es-AR')}
        de $${gastos.toLocaleString('es-AR')}.
        Quedás debiendo <strong>$${gameState.deudaAcumulada.toLocaleString('es-AR')}</strong>
        (con recargo) y la caja en cero.
      </div>`;
  }
 
  // --- Protección del capo (si corresponde) ---
  const msgProteccion = cobrarProteccion();
  if (msgProteccion) {
    mensajeGastos += `<div style="color:${msgProteccion.color}; margin-top:8px;">
      ${msgProteccion.texto}</div>`;

    // Un atraso cuenta como "negarse" al capo para la sumisión total
    // (ver semanaActualSinNegarseCapo / semanaCastigoCerradaLimpia).
    if (!msgProteccion.exito) caminos.semanaActualSinNegarseCapo = false;
  }

  // --- Se resuelven las cuentas fiadas ---
  const msgFiados = resolverFiados();
  if (msgFiados) mensajeGastos += msgFiados;
 
  // --- Avanzar la semana ---
  gameState.diaGlobal++;
  gameState.semanaActual++;
  gameState.diaActual = 1;
  gameState.ventasDelDia = 0;
  gameState.ventasDeLaSemana = 0;
  gameState.clientesAtendidosHoy = 0;
  gameState.gastoParcialCobradoEstaSemana = false;

  // Sumisión total al capo (evaluarFinal, en caminos.js, la consume
  // apenas se llame a continuarTrasBalance): la semana que se acaba de
  // cerrar (semanaQueTermina) califica si fue una semana de castigo,
  // se pagó la protección Y no hubo ninguna negativa al capo. Se
  // calcula ANTES de reiniciar la bandera para la semana que arranca.
  caminos.semanaCastigoCerradaLimpia =
    semanaQueTermina > SEMANAS_BASE &&
    caminos.pagaProteccion &&
    caminos.semanaActualSinNegarseCapo;
  caminos.semanaActualSinNegarseCapo = true;

  // Si con este avance se entra en una semana de castigo por primera
  // vez, se fija el ancla de días para la cadencia de extorsión/chorro
  // (ver chequearEventoDelDia).
  if (gameState.semanaActual > SEMANAS_BASE && caminos.diaGlobalInicioCastigo === null) {
    caminos.diaGlobalInicioCastigo = gameState.diaGlobal;
  }

  if (caminos.clausurado > 0) caminos.clausurado--;
  extorsion.vecesEstaSemana = 0;   // se reinicia la extorsión del policía
  malaFamaSemana = false;          // la mala fama no se arrastra a la semana siguiente
  // Modo Semana Límite: se reabre la chance de ofrecer coima/capo
  // al cerrar cada día, para la semana que arranca.
  caminos.capoOfrecidoEnDia = false;
  caminos.coimaOfrecidaEnDia = false;

  // Inflación: la mercadería sube todas las semanas
  const inflacion = aplicarInflacionSemanal();
  mensajeGastos += `<div style="color:#ff9b6b; margin-top:8px;">
    Los precios mayoristas subieron un <strong>${inflacion}%</strong> esta semana.
    Si no ajustás tus precios de venta, vas a perder margen.
  </div>`;
 
  actualizarHUD();
 
  document.getElementById('dcTitulo').textContent =
    `Balance de la semana ${gameState.semanaActual - 1}`;
 
  document.getElementById('dcTexto').innerHTML = `
    <div style="background:rgba(255,255,255,0.04); padding:12px 14px; border-radius:8px; border-left:3px solid #F2A93B;">
      <div style="display:flex; justify-content:space-between; padding:4px 0; color:#c9dff0;">
        <span>Vendiste esta semana</span>
        <span style="color:#5FD96C;">+$${ventasSemana.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:4px 0; color:#c9dff0;">
        <span>Gastos fijos</span>
        <span style="color:#ff6b66;">−$${gastos.toLocaleString('es-AR')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0 0; border-top:1px solid #333; margin-top:6px; font-weight:700;">
        <span>Caja actual</span>
        <span style="color:#F2A93B;">$${gameState.caja.toLocaleString('es-AR')}</span>
      </div>
    </div>
    <div style="margin-top:12px;">${mensajeGastos}</div>`;
 
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="continuarTrasBalance()">Continuar</button>';
}
 
function avisoSemanaNueva() {
  const dlg = document.getElementById('dialogoCliente');
  dialogoAbierto = true;
  dlg.classList.remove('oculto');
 
  document.getElementById('dcTitulo').textContent = 'Semana nueva';
  document.getElementById('dcTexto').innerHTML = `
    <span style="color:#F2A93B;">
      Arranca la semana ${gameState.semanaActual} de ${gameState.totalSemanas}.
    </span>
    ${caminos.clausurado > 0
      ? '<br><br><span style="color:#ff6b66;">El local está CLAUSURADO esta semana: no vas a poder vender.</span>'
      : ''}`;
 
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="abrirKioscoDelDia()">Abrir el kiosco</button>';
}
 
// ==========================================================
// MENSAJES DEL HERMANO
// La relación evoluciona: lo que respondés cambia el tono de
// los mensajes siguientes, las anécdotas y hasta qué opciones
// de respuesta tenés disponibles.
// ==========================================================
 
const hermano = {
  relacion: 0,             // de -3 (rota) a +3 (muy unida)
  mensajesRecibidos: 0,
  anecdotasUsadas: []
};
 
const ANECDOTAS = {
  buenas: [
    'Hoy nos dieron pan fresco. Una pavada, pero acá es un montón.',
    'Conocí a un tipo del taller de carpintería. Me está enseñando a lijar.',
    'Me anoté en la escuela de acá. Empiezo la semana que viene.',
    'Salió el sol y nos dejaron estar dos horas en el patio. Me acordé de vos.',
    'Hay un pibe que toca la guitarra a la noche. No lo hace mal.'
  ],
  neutras: [
    'Acá los días son todos iguales. Te levantás, comés, esperás.',
    'Cambiaron al guardia del pabellón. Este es más tranquilo.',
    'Me tocó limpiar el comedor toda la semana. Al menos me mantiene ocupado.',
    'Anoche no dormí. Se escuchaban gritos del otro pabellón.',
    'Hoy no pasó nada. Y eso ya es una buena noticia acá.'
  ],
  malas: [
    'Ayer hubo lío en el patio. Yo no me metí, pero se puso feo.',
    'Me sacaron el colchón por una requisa. Dormí en el piso.',
    'Hay uno que me está buscando. Trato de no cruzármelo.',
    'La comida está peor que nunca. Llevo tres días con dolor de panza.',
    'Se llevaron a un pibe del pabellón y no volvió. Nadie dice nada.',
    'Empecé a contar los días. Es lo peor que podés hacer acá adentro.'
  ],
  // Repertorio aparte para las semanas de castigo (punto 7 del diseño):
  // no son anécdotas del día a día, son urgencia explícita. Se elige
  // con el mismo elegirAnecdota('urgencia') para reusar el de-dup.
  urgencia: [
    'Escuché que a un pibe del pabellón le adelantaron la condena. Ojalá a mí también me pase, para bien.',
    'El abogado de acá adentro me dijo que la audiencia ya no se corre más. Se viene.',
    'Ya no cuento los días como antes. Ahora cuento "cuánto me falta para vos".',
    'No sé cómo decirte esto sin asustarte, pero se está acabando el margen que teníamos.',
    'Un compañero me preguntó si tenía a alguien afuera peleándola en serio. Le dije que sí. No me falles con eso.'
  ]
};
 
function elegirAnecdota(tipo) {
  const pool = ANECDOTAS[tipo].filter(a => !hermano.anecdotasUsadas.includes(a));
  const lista = pool.length > 0 ? pool : ANECDOTAS[tipo];
  const elegida = lista[Math.floor(Math.random() * lista.length)];
  hermano.anecdotasUsadas.push(elegida);
  return elegida;
}
 
// Mensaje especial para el lunes de cada semana de castigo (punto 7 del
// diseño): urgencia explícita, pidiendo que te apures porque el tiempo
// se agota. Reusa el repertorio 'urgencia' de ANECDOTAS y el mismo
// mecanismo de de-dup que el resto de las anécdotas.
function armarMensajeUrgencia() {
  return {
    lineas: [
      'Hermano, tengo que decirte esto directo.',
      elegirAnecdota('urgencia'),
      'Por favor, apurate. El tiempo se nos está acabando de verdad.'
    ],
    opciones: [
      { tipo: 'apoyo',   texto: '"Ya sé. Estoy a full con esto. Aguantá un poco más."' },
      { tipo: 'neutro',  texto: '"Entiendo. Sigo dándole todos los días."' },
      { tipo: 'presion', texto: '"No hace falta que me lo repitas. Ya lo sé."' }
    ]
  };
}

function armarMensajeHermano() {
  const progreso = gameState.caja / gameState.metaFianza;
  const semanasRestantes = gameState.totalSemanas - gameState.semanaActual;
  const rel = hermano.relacion;
 
  // Primer mensaje: siempre igual
  if (hermano.mensajesRecibidos === 0) {
    return {
      lineas: [
        'Hermano, ¿estás ahí?',
        'Me dejaron usar el teléfono cinco minutos.',
        'Acá adentro está complicado. Si conseguís la plata, salgo. Es lo único que necesito.'
      ],
      opciones: [
        { tipo: 'apoyo',   texto: '"Tranquilo. Te voy a sacar de ahí, te lo prometo."' },
        { tipo: 'neutro',  texto: '"Estoy en eso. Dame tiempo."' },
        { tipo: 'presion', texto: '"Estoy haciendo lo que puedo. No me metas presión."' }
      ]
    };
  }

  // Semana de castigo: el mensaje del lunes prioriza urgencia explícita
  // por sobre el patrón normal de anécdotas -- más allá de cómo esté
  // el medidor de relación (punto 7 del diseño).
  if (enSemanaCastigo()) {
    return armarMensajeUrgencia();
  }

  // Relación rota: mensajes secos y distantes
  if (rel <= -2) {
    return {
      lineas: [
        'Sé que no querés que te escriba.',
        elegirAnecdota('malas'),
        'Nada más. Era eso.'
      ],
      opciones: [
        { tipo: 'reparar', texto: '"Perdoname. La estoy pasando mal yo también."' },
        { tipo: 'presion', texto: '"Ya te dije que estoy ocupado."' }
      ]
    };
  }
 
  // Relación fría: dolido pero todavía intenta
  if (rel === -1) {
    return {
      lineas: [
        'No te quiero molestar, en serio.',
        elegirAnecdota(progreso > 0.4 ? 'neutras' : 'malas'),
        '¿Vos cómo estás?'
      ],
      opciones: [
        { tipo: 'apoyo',   texto: '"Estoy bien. Y te voy a sacar, no aflojes."' },
        { tipo: 'neutro',  texto: '"Ahí ando. Con el kiosco."' },
        { tipo: 'presion', texto: '"No tengo mucho tiempo para hablar."' }
      ]
    };
  }
 
  // Relación muy buena
  if (rel >= 2) {
    if (progreso >= 0.85) {
      return {
        lineas: [
          '¡Hermano!',
          'Me dijo el abogado que ya casi está el monto.',
          elegirAnecdota('buenas'),
          'No puedo creer que lo estés haciendo. Sos un grande.'
        ],
        opciones: [
          { tipo: 'apoyo',  texto: '"Falta poquito. Preparate para salir."' },
          { tipo: 'neutro', texto: '"Todavía no cantemos victoria."' }
        ]
      };
    }
 
    return {
      lineas: [
        'Buen día, hermano.',
        elegirAnecdota(progreso > 0.4 ? 'buenas' : 'neutras'),
        progreso > 0.4
          ? 'Me contaron que el kiosco anda bien. Estoy orgulloso de vos.'
          : 'Sé que es difícil. Gracias por bancarme igual.'
      ],
      opciones: [
        { tipo: 'apoyo',   texto: '"Vamos a salir de esta. Los dos."' },
        { tipo: 'neutro',  texto: '"Estamos remando. Aguantá."' },
        { tipo: 'presion', texto: '"Perdoname, hoy no puedo hablar."' }
      ]
    };
  }
 
  // Relación normal: se acaba el tiempo
  if (semanasRestantes <= 2 && progreso < 0.7) {
    return {
      lineas: [
        'Hermano, queda muy poco para la audiencia.',
        elegirAnecdota('malas'),
        'No te quiero meter presión pero... si no llegamos me quedo acá un montón de tiempo.'
      ],
      opciones: [
        { tipo: 'apoyo',   texto: '"Llego. Te juro que llego."' },
        { tipo: 'neutro',  texto: '"Estoy haciendo todo lo que puedo."' },
        { tipo: 'presion', texto: '"Basta. No puedo con esto encima."' }
      ]
    };
  }
 
  if (progreso >= 0.6) {
    return {
      lineas: [
        '¿Cómo venís con el kiosco?',
        elegirAnecdota('neutras'),
        'Me dijeron que estás juntando bien. Ojalá.'
      ],
      opciones: [
        { tipo: 'apoyo',   texto: '"Vamos bien. Falta menos de lo que pensás."' },
        { tipo: 'neutro',  texto: '"Ahí voy. Semana a semana."' },
        { tipo: 'presion', texto: '"Prefiero no hablar de plata."' }
      ]
    };
  }
 
  return {
    lineas: [
      '¿Todo bien por casa?',
      elegirAnecdota(gameState.estres > 60 ? 'malas' : 'neutras'),
      'Contame algo vos. Me hace bien saber de afuera.'
    ],
    opciones: [
      { tipo: 'apoyo',   texto: '"Todo bien acá. Vos aguantá que yo me encargo."' },
      { tipo: 'neutro',  texto: '"Con el kiosco, como siempre."' },
      { tipo: 'presion', texto: '"Estoy cansado. Hablamos otro día."' }
    ]
  };
}
 
function mostrarMensajeHermano() {
  const msg = armarMensajeHermano();
  const chat = document.getElementById('mhChat');
  const resp = document.getElementById('mhRespuestas');
 
  // Hora aleatoria de la mañana, para que se sienta real
  const hora = 8 + Math.floor(Math.random() * 3);
  const min = Math.floor(Math.random() * 60);
  document.getElementById('mhHora').textContent =
    `${hora}:${min.toString().padStart(2, '0')}`;
 
  chat.innerHTML = msg.lineas
    .map(l => `<div class="mh-burbuja">${l}</div>`)
    .join('');
 
  resp.innerHTML = msg.opciones.map(op =>
    `<button class="mh-btn" onclick="responderHermano('${op.tipo}', ${JSON.stringify(op.texto).replace(/"/g, '&quot;')})">
       ${op.texto}
     </button>`
  ).join('');
 
  dialogoAbierto = true;
  document.getElementById('mensajeHermano').classList.remove('oculto');
}
 
function responderHermano(tipo, textoRespuesta) {
  hermano.mensajesRecibidos++;
 
  const chat = document.getElementById('mhChat');
  const resp = document.getElementById('mhRespuestas');
 
  chat.innerHTML += `<div class="mh-burbuja propia">${textoRespuesta}</div>`;
 
  let cierre, efecto;
 
  if (tipo === 'apoyo') {
    // Prometer acerca la relación, pero te pesa
    hermano.relacion = Math.min(3, hermano.relacion + 1);
    gameState.estres = Math.min(100, gameState.estres + 6);
    cierre = hermano.relacion >= 2
      ? 'Sos lo único que tengo, hermano. Gracias.'
      : 'Gracias. Me hace bien escucharte decir eso.';
    efecto = '<span style="color:#ff9b6b;">La promesa te pesa. +6 de estrés · relación más fuerte.</span>';
 
  } else if (tipo === 'presion') {
    // Cortar te alivia, pero enfría la relación
    hermano.relacion = Math.max(-3, hermano.relacion - 1);
    gameState.estres = Math.max(0, gameState.estres - 8);
    cierre = hermano.relacion <= -2
      ? 'Está bien. No te escribo más.'
      : 'Perdón. Tenés razón.';
    efecto = '<span style="color:#8fb8d8;">Pusiste un límite. −8 de estrés · la relación se enfrió.</span>';
 
  } else if (tipo === 'reparar') {
    // Pedir perdón recompone bastante
    hermano.relacion = Math.min(3, hermano.relacion + 2);
    gameState.estres = Math.min(100, gameState.estres + 3);
    cierre = 'Uh. No sabía que la estabas pasando así. Perdoname vos a mí.';
    efecto = '<span style="color:#5FD96C;">Recompusiste la relación. +3 de estrés.</span>';
 
  } else {
    // Neutro: no cambia nada
    cierre = 'Dale. Cualquier cosa me escribís.';
    efecto = '<span style="color:#a8a094;">Sin cambios.</span>';
  }
 
  actualizarHUD();
 
  setTimeout(() => {
    chat.innerHTML += `<div class="mh-burbuja">${cierre}</div>`;
    resp.innerHTML = `
      <div style="font-size:12px; color:#6a7d8a; text-align:center; padding:4px 0 8px;">
        ${efecto}
      </div>
      <button class="mh-btn" style="text-align:center;"
              onclick="cerrarMensajeHermano()">Guardar el celular</button>`;
  }, 800);
}
 
function cerrarMensajeHermano() {
  dialogoAbierto = false;
  document.getElementById('mensajeHermano').classList.add('oculto');
  chequearEventoDelDia();   // después del mensaje sigue el día normal
}
 
function esLunes() {
  return gameState.diaActual === 1;
}
 
 
// ==========================================================
// EVENTOS DE CLIMA
// El clima cambia qué productos se llevan más ese día.
// ==========================================================
 
function eventoOlaDeFrio() {
  climaHoy.tipo = 'frio';
  climaHoy.productos = ['chocolate', 'alfajor'];
  climaHoy.multiplicador = 3;
 
  mostrarEventoDia('El tiempo', 'Ola de frío',
    `Amaneció a 4 grados y no para de soplar viento. La gente entra tapada hasta las orejas
     y busca algo caliente.
     <br><br><span style="color:#8fb8d8;">Hoy vuelan el <strong>chocolate</strong> y los
     <strong>alfajores</strong>. Fijate de tener stock.</span>`,
    [{ texto: 'Abrir el kiosco' }]);
}
 
function eventoOlaDeCalor() {
  climaHoy.tipo = 'calor';
  climaHoy.productos = ['gaseosa', 'agua', 'jugo'];
  climaHoy.multiplicador = 3;
 
  mostrarEventoDia('El tiempo', 'Ola de calor',
    `Treinta y ocho grados a la sombra. El asfalto está que arde y no corre nada de aire.
     <br><br><span style="color:#F2A93B;">Hoy se llevan todo lo frío: <strong>gaseosa,
     agua y jugo</strong>. Es el día para hacer caja.</span>`,
    [{ texto: 'Abrir el kiosco' }]);
}
 
function eventoFestejoDelBarrio() {
  climaHoy.tipo = 'festejo';
  climaHoy.productos = [];   // vacío = afecta a todos los productos
  climaHoy.multiplicador = 2;
 
  mostrarEventoDia('En la plaza', 'Hay festejo en el barrio',
    `Cortaron la calle. Armaron un escenario en la plaza y hay parlantes desde temprano.
     Va a pasar muchísima gente por la puerta.
     <br><br><span style="color:#5FD96C;">Hoy los clientes se llevan más de todo.
     Aprovechá, pero cuidado con quedarte sin stock.</span>`,
    [{ texto: 'Abrir el kiosco' }]);
}
 
// ==========================================================
// EL POLICÍA QUE PIDE MERCADERÍA GRATIS
// Si cediste una vez, vuelve. Y no viene a pagar.
// ==========================================================
function eventoPoliciaProductos() {
  extorsion.vecesEstaSemana++;
 
  const conStock = gameState.productos.filter(p => p.stock >= 2);
  if (conStock.length === 0) return;
 
  const p = conStock[Math.floor(Math.random() * conStock.length)];
  const cantidad = Math.min(p.stock, 3);
  const valor = cantidad * p.precio;
 
  mostrarEventoDia('Otra vez él', 'El policía se sirve solo',
    `Estaciona el patrullero en la vereda y entra sin saludar. Mira el estante como si
     fuera el suyo.
     <br><br>"Che, llevame <strong>${cantidad} ${p.nombre}</strong>. Después arreglamos."
     <br><br><span style="color:#a8a094;">Los dos saben que no va a arreglar nada.</span>`,
    [
      {
        texto: 'Dárselos',
        accion: () => {
          p.stock -= cantidad;
          gameState.estres = Math.min(100, gameState.estres + 6);
          actualizarHUD();
          mostrarEventoDia('Se fue', 'Se llevó la mercadería',
            `Se llevó ${cantidad} ${p.nombre} sin pagar. Son
             $${valor.toLocaleString('es-AR')} que no vas a ver.
             <br><br>Ni gracias dijo.`,
            [{ texto: 'Seguir' }]);
        }
      },
      {
        texto: 'Negarse',
        secundario: true,
        accion: () => {
          extorsion.vecesQueTeNegaste++;
          caminos.seNegoACoima = true;
 
          // Negarse cuesta caro: el estrés salta a la mitad como mínimo
          gameState.estres = Math.max(50, Math.min(100, gameState.estres + 30));
          actualizarHUD();
 
          mostrarEventoDia('Se puso feo', 'Te amenazó',
            `Se queda mirándote un rato largo sin decir nada. Después se acerca al mostrador.
             <br><br>"Mirá, pibe. Yo vengo acá de buen modo. Vos fijate cómo querés que sea
             la cosa, porque puedo venir de otra manera."
             <br><br>Se fue dando un portazo.
             <br><br><span style="color:#ff6b66;">Te quedaste temblando. El estrés se
             te disparó.</span>`,
            [{ texto: 'Respirar hondo' }]);
        }
      }
    ]);
}
 
// ==========================================================
// EL CAPO EXTORSIONADOR DE MERCADERÍA (semanas de castigo)
// Comportamiento nuevo y DISTINTO del capo "protector" de más arriba
// (montoProteccion / cobrarProteccion): acá no pide plata, pide la
// mitad del stock total del kiosco, cada 2 días exactos, mientras dure
// una semana de castigo. Pueden convivir: pagar la protección semanal
// no salva de esto.
// ==========================================================

// Elige, de a una unidad por vez y al azar entre lo que todavía tiene
// stock, qué se lleva el capo (o el chorro) hasta completar el total
// pedido. Se auto-corrige solo: si un producto se queda sin stock en
// el medio, deja de poder salir elegido.
function elegirDespojoCapo(cantidadTotal) {
  const restante = gameState.productos.map(p => ({ prod: p, disponible: p.stock }));
  const resultado = [];
  let faltan = cantidadTotal;

  while (faltan > 0) {
    const conStock = restante.filter(r => r.disponible > 0);
    if (conStock.length === 0) break;

    const elegido = conStock[Math.floor(Math.random() * conStock.length)];
    elegido.disponible--;
    faltan--;

    let entry = resultado.find(r => r.prod === elegido.prod);
    if (!entry) {
      entry = { prod: elegido.prod, cant: 0 };
      resultado.push(entry);
    }
    entry.cant++;
  }

  return resultado;
}

function eventoExtorsionMercaderiaCapo() {
  const totalUnidades = gameState.productos.reduce((acc, p) => acc + p.stock, 0);
  const cantidad = Math.floor(totalUnidades / 2);
  const despojo = elegirDespojoCapo(cantidad);
  const detalle = despojo.map(d => `${d.cant} ${d.prod.nombre}`).join(', ');

  mostrarEventoDia('El capo se sirve', 'Vienen a buscar mercadería',
    `Dos tipos del capo entran sin golpear ni pedir permiso. No vinieron por plata esta vez.
     <br><br>"Che, nos llevamos la mitad de lo que tenés en el estante. Así es la cosa
     esta semana."
     <br><br><span style="color:#ff6b66;">Piden <strong>${cantidad} unidades</strong> en
     total: ${detalle}.</span>`,
    [
      {
        texto: 'Dejar que se lo lleven',
        accion: () => {
          for (const d of despojo) d.prod.stock -= d.cant;
          gameState.estres = Math.min(100, gameState.estres + 10);
          actualizarHUD();

          mostrarEventoDia('Se lo llevaron', 'El estante quedó a la mitad',
            `Cargaron ${detalle} sin dejar un peso. Ni se despidieron.`,
            [{ texto: 'Seguir' }]);
        }
      },
      {
        texto: 'Negarte',
        secundario: true,
        accion: () => resolverNegativaCapoCastigo()
      }
    ]);
}

// Qué pasa cuando el jugador le dice que no a la mercadería. El riesgo
// depende de si alguna vez aceptó la protección del capo (punto 5 del
// diseño): si nunca la aceptó, solo se suma una semana de castigo; si
// la aceptó alguna vez -- aunque ya no la esté pagando -- se juega la
// vida con el sistema normal de % por arma. Esto NO es binario como el
// sicario del abogado (donde solo la pistola salva): acá cada arma
// tiene su propia probabilidad de sobrevivir.
function resolverNegativaCapoCastigo() {
  caminos.seNegoAlCapoCastigo = true;
  caminos.semanaActualSinNegarseCapo = false;

  if (!caminos.aceptoProteccionAlgunaVez) {
    gameState.totalSemanas++;
    mostrarEventoDia('Te plantaste', 'No les diste nada',
      `Les dijiste que no. Se miraron entre ellos, se rieron, y se fueron sin insistir.
       <br><br><span style="color:#ff6b66;">Esto no se olvida: se suma otra semana de
       plazo para la fianza.</span>`,
      [{ texto: 'Seguir' }]);
    return;
  }

  const arma = ARMAS[armaActual];
  const sobrevive = Math.random() < arma.probDefensa;

  if (!sobrevive) {
    // Evita que el auto-cierre del cartel de evento diario (ver
    // mostrarEventoDia/avanzarColaEventos más arriba) pise el cartel
    // de final que se abre a continuación.
    _mostrarEventoDiaTick++;

    terminarPartida('capo_muerte');
    mostrarEventoGrande({
      etiqueta: 'Se les fue la mano',
      titulo: 'No alcanzaste a reaccionar',
      relato: `Le dijiste que no, otra vez. Esta vez no se rieron ni se fueron.
               <br><br>Todo pasó demasiado rápido como para pensar en nada: ni en tu
               hermano, ni en el kiosco, ni en la plata. Cuando quisiste reaccionar
               ya era tarde.`,
      opciones: [{
        titulo: 'Ver el final',
        accion: () => renderFinal(caminos.finalObtenido)
      }]
    });
    return;
  }

  gameState.totalSemanas++;
  mostrarEventoDia('Por poco', 'Zafaste',
    `Te negaste, y por un segundo pensaste que no ibas a contar el cuento. Pero no pasó
     nada esta vez.
     <br><br><span style="color:#ff6b66;">Igual se suma otra semana de plazo: no te vas
     a sacar al capo de encima tan fácil.</span>`,
    [{ texto: 'Respirar hondo' }]);
}

// ---- El chorro que aprovecha que ya te negaste al capo ----
// Roba cada 3 días exactos mientras dure la semana de castigo, sin
// riesgo de vida (es un robo común, no una represalia del capo). El
// jugador puede defenderse con el mismo sistema de % por arma.
function eventoChorroCastigo() {
  mostrarEventoDia('Un movimiento raro', 'Alguien te está robando',
    `Ves a un pibe metiendo la mano entre los estantes cuando pensás que no lo estás
     mirando. Va rápido, agarra lo que puede.`,
    [{
      texto: 'Defenderte',
      accion: () => {
        const arma = ARMAS[armaActual];
        const exito = Math.random() < arma.probDefensa;

        if (exito) {
          mostrarEventoDia('Lo espantaste', 'No se llevó nada',
            `Reaccionaste a tiempo. Te vio venir, soltó todo y salió corriendo.`,
            [{ texto: 'Seguir' }]);
          return;
        }

        // Roba 4 unidades al azar del stock disponible. Si no hay
        // stock suficiente, se lleva en plata el equivalente al precio
        // de venta de lo que faltó (criterio propio: no hay un
        // producto puntual asociado a esas unidades faltantes, así que
        // se usa el precio de venta promedio del catálogo).
        const robo = elegirDespojoCapo(4);
        const unidadesRobadas = robo.reduce((acc, r) => acc + r.cant, 0);
        const faltantes = 4 - unidadesRobadas;

        for (const r of robo) r.prod.stock -= r.cant;

        let plataRobada = 0;
        if (faltantes > 0) {
          const precioProm = gameState.productos.reduce((a, p) => a + p.precio, 0)
                              / gameState.productos.length;
          plataRobada = Math.round(precioProm * faltantes);
          gameState.caja = Math.max(0, gameState.caja - plataRobada);
        }

        gameState.estres = Math.min(100, gameState.estres + 8);
        actualizarHUD();

        const detalleRobo = robo.length > 0
          ? robo.map(r => `${r.cant} ${r.prod.nombre}`).join(', ')
          : null;

        mostrarEventoDia('No llegaste', 'Se escapó con algo',
          `Se llevó ${detalleRobo || 'lo que pudo'}${
            plataRobada > 0
              ? ` y $${plataRobada.toLocaleString('es-AR')} de la caja (no quedaba
                 más mercadería para robar)`
              : ''
          }.`,
          [{ texto: 'Seguir' }]);
      }
    }]);
}

// ==========================================================
// COBRO DE LAS DEUDAS FIADAS
// Se resuelve al cerrar cada semana. Cada deuda tiene 40% de
// chance de que el cliente vuelva a pagar. Después de dos
// semanas sin aparecer, se da por perdida.
// ==========================================================
function resolverFiados() {
  if (fiado.deudas.length === 0) return null;
 
  let cobradoAhora = 0;
  let perdidoAhora = 0;
  const pagaron = [];
  const nuncaVolvieron = [];
  const quedanPendientes = [];
 
  for (const d of fiado.deudas) {
    const semanasPasadas = gameState.semanaActual - d.semanaFiado;
 
    if (Math.random() < 0.40) {
      // Volvió y pagó
      cobradoAhora += d.monto;
      pagaron.push(`${d.cliente} ($${d.monto.toLocaleString('es-AR')})`);
    } else if (semanasPasadas >= 2) {
      // Después de dos semanas, no vuelve más
      perdidoAhora += d.monto;
      nuncaVolvieron.push(`${d.cliente} ($${d.monto.toLocaleString('es-AR')})`);
    } else {
      // Todavía puede aparecer
      quedanPendientes.push(d);
    }
  }
 
  fiado.deudas = quedanPendientes;
  fiado.cobrado += cobradoAhora;
  fiado.perdido += perdidoAhora;
  gameState.caja += cobradoAhora;
 
  if (perdidoAhora > 0) {
    gameState.estres = Math.min(100, gameState.estres + 8);
  }
 
  // Arma el mensaje del balance
  let html = '';
 
  if (cobradoAhora > 0) {
    html += `<div style="color:#5FD96C; margin-top:8px;">
      Volvieron a pagar: ${pagaron.join(', ')}.
      Entraron <strong>$${cobradoAhora.toLocaleString('es-AR')}</strong>.
    </div>`;
  }
 
  if (perdidoAhora > 0) {
    html += `<div style="color:#ff6b66; margin-top:8px;">
      No volvieron más: ${nuncaVolvieron.join(', ')}.
      Diste por perdidos <strong>$${perdidoAhora.toLocaleString('es-AR')}</strong>.
    </div>`;
  }
 
  if (quedanPendientes.length > 0) {
    html += `<div style="color:#F2A93B; margin-top:8px;">
      Todavía te deben $${totalPorCobrar().toLocaleString('es-AR')}
      (${quedanPendientes.length} cuenta${quedanPendientes.length > 1 ? 's' : ''} pendiente${quedanPendientes.length > 1 ? 's' : ''}).
    </div>`;
  }
 
  return html || null;
}