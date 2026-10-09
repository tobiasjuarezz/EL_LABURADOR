// ==========================================================
// EVENTOS DIARIOS Y CICLO DE DÍAS
// Los eventos rompen la rutina de vender. El ciclo de días
// estructura la partida: 7 días forman una semana.
// ==========================================================

// ---- Cartel de evento diario ----
function mostrarEventoDia(etiqueta, titulo, texto, botones) {
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
      document.getElementById('eventoDia').classList.add('oculto');
      dialogoAbierto = false;
      if (b.accion) b.accion();
    };
    cont.appendChild(btn);
  }

  dialogoAbierto = true;
  document.getElementById('eventoDia').classList.remove('oculto');
}

// ---- Se llama al abrir el kiosco cada día ----
function abrirKioscoDelDia() {
  cerrarDialogoCliente();

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

  // Si le pagaste al policía, puede volver a pedir (hasta 2 veces por semana)
  if (caminos.vecesPolicia > 0 && !caminos.seNegoACoima
      && extorsion.vecesEstaSemana < 2 && Math.random() < 0.30) {
    eventoPoliciaProductos();
    return;
  }

  // TODOS los días pasa algo
  const eventos = [
    eventoCorteDeLuz,
    eventoProductoViral,
    eventoConcursoRadio,
    eventoProveedorVencido,
    eventoEntregaEquivocada,
    eventoProductoProhibido,
    eventoOlaDeFrio,
    eventoOlaDeCalor,
    eventoFestejoDelBarrio
  ];

  const elegido = eventos[Math.floor(Math.random() * eventos.length)];
  elegido();
}

// ---- Corte de luz ----
function eventoCorteDeLuz() {
  efectosDia.sinLuz = true;
  sonidoCorteLuz();

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
  if (conStock.length === 0) return;

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
  if (conStock.length === 0) return;

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

  // Dormir baja algo de estrés, pero poco: si venís muy quemado,
  // una noche no alcanza para recuperarte.
  const descanso = gameState.estres > 60 ? 4 : 8;
  gameState.estres = Math.max(0, gameState.estres - descanso);

  gameState.ventasDelDia = 0;
  gameState.clientesAtendidosHoy = 0;
  actualizarHUD();

  // Autoguardado: arranca un día nuevo
  guardarPartida();

  document.getElementById('dcTitulo').textContent = nombreDiaActual();
  document.getElementById('dcTexto').innerHTML =
    `Bajaste la persiana. Amanece el <strong>${nombreDiaActual()}</strong>,
     día ${gameState.diaActual} de ${gameState.diasPorSemana}.
     ${gameState.estres > 60
       ? '<br><br><span style="color:#ff6b66;">Dormiste mal. Seguís con la cabeza en el kiosco.</span>'
       : ''}`;
  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="abrirKioscoDelDia()">Abrir el kiosco</button>';
}

function confirmarFinDeSemana() {
  const ventasSemana = gameState.ventasDeLaSemana;

  // --- Gastos fijos: alquiler y luz, sí o sí ---
  const gastos = gameState.alquilerSemanal + gameState.luzSemanal + gameState.deudaAcumulada;
  let mensajeGastos;

  if (gameState.caja >= gastos) {
    gameState.caja -= gastos;
    const teniaDeuda = gameState.deudaAcumulada > 0;
    gameState.deudaAcumulada = 0;
    mensajeGastos = `
      <div style="color:#ff9b6b;">
        Pagaste $${gameState.alquilerSemanal.toLocaleString('es-AR')} de alquiler
        y $${gameState.luzSemanal.toLocaleString('es-AR')} de luz.
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
  }

  // --- Se resuelven las cuentas fiadas ---
  const msgFiados = resolverFiados();
  if (msgFiados) mensajeGastos += msgFiados;

  // --- Avanzar la semana ---
  gameState.semanaActual++;
  gameState.diaActual = 1;
  gameState.ventasDelDia = 0;
  gameState.ventasDeLaSemana = 0;
  gameState.clientesAtendidosHoy = 0;

  if (caminos.clausurado > 0) caminos.clausurado--;
  extorsion.vecesEstaSemana = 0;   // se reinicia la extorsión del policía

  // Inflación: la mercadería sube todas las semanas
  const inflacion = aplicarInflacionSemanal();
  mensajeGastos += `<div style="color:#ff9b6b; margin-top:8px;">
    Los precios mayoristas subieron un <strong>${inflacion}%</strong> esta semana.
    Si no ajustás tus precios de venta, vas a perder margen.
  </div>`;

  actualizarHUD();

  // Autoguardado: arranca la semana (y el día) nuevo
  guardarPartida();

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
  ]
};

function elegirAnecdota(tipo) {
  const pool = ANECDOTAS[tipo].filter(a => !hermano.anecdotasUsadas.includes(a));
  const lista = pool.length > 0 ? pool : ANECDOTAS[tipo];
  const elegida = lista[Math.floor(Math.random() * lista.length)];
  hermano.anecdotasUsadas.push(elegida);
  return elegida;
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
// CIERRE AUTOMÁTICO DEL DÍA
// Cuando llegás al límite de clientes, el día se acaba solo.
// ==========================================================
function cerrarDiaAutomatico() {
  const dlg = document.getElementById('dialogoCliente');
  dialogoAbierto = true;
  dlg.classList.remove('oculto');

  const esUltimoDia = gameState.diaActual >= gameState.diasPorSemana;

  document.getElementById('dcTitulo').textContent = 'Se hizo la hora';
  document.getElementById('dcTexto').innerHTML = `
    Atendiste <strong>${CLIENTES_POR_DIA} clientes</strong> hoy. Ya está oscureciendo
    y no viene más nadie.
    <br><br>
    <span style="color:#a8a094; font-size:13px;">
      Vendiste $${gameState.ventasDelDia.toLocaleString('es-AR')} en el día.
    </span>
    ${esUltimoDia
      ? '<br><br><span style="color:#F2A93B;">Es domingo: se cierra la semana.</span>'
      : ''}`;

  document.getElementById('dcBotones').innerHTML = esUltimoDia
    ? '<button class="btn" onclick="confirmarFinDeSemana()">Cerrar la semana</button>'
    : '<button class="btn" onclick="confirmarFinDeDia()">Bajar la persiana</button>';
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