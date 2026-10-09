// ==========================================================
// LOS TRES CAMINOS Y LOS FINALES
// La parte narrativa del juego. Cada camino excluye a los
// otros y lleva a un desenlace distinto.
// ==========================================================

// ---- Cartel grande, para los momentos importantes ----
function mostrarEventoGrande({ etiqueta, titulo, relato, dialogo, aviso, opciones }) {
  document.getElementById('egEtiqueta').textContent = etiqueta || 'EVENTO';
  document.getElementById('egTitulo').textContent = titulo || '';
  document.getElementById('egRelato').innerHTML = relato || '';
  document.getElementById('egDialogo').innerHTML = dialogo || '';
  document.getElementById('egAviso').innerHTML = aviso || '';

  const cont = document.getElementById('egOpciones');
  cont.innerHTML = '';

  for (const op of opciones) {
    const btn = document.createElement('button');
    btn.className = 'eg-opcion';
    btn.innerHTML = `
      <div class="eo-titulo">${op.titulo}</div>
      ${op.detalle ? `<div class="eo-detalle">${op.detalle}</div>` : ''}`;
    btn.onclick = () => {
      cerrarEventoGrande();
      op.accion();
    };
    cont.appendChild(btn);
  }

  document.getElementById('eventoGrande').classList.remove('oculto');
}

function cerrarEventoGrande() {
  document.getElementById('eventoGrande').classList.add('oculto');
}

// ==========================================================
// ORQUESTACIÓN: qué evento se dispara al cerrar la semana
// El return después de cada uno garantiza que no aparezca
// más de un evento por semana.
// ==========================================================
function continuarTrasBalance() {
  cerrarDialogoCliente();

  // 1. ¿Terminó la partida?
  const final = evaluarFinal();
  if (final) {
    renderFinal(final);
    return;
  }

  // 2. ¿Viene el sicario? (solo si delató antes)
  if (chequearSicario()) return;

  // 3. Eventos de los caminos, por prioridad narrativa
  if (ofrecerAbogado())        { eventoAbogado(mostrarResultadoEvento); return; }
  if (ofrecerCoima())          { eventoPolicia(mostrarResultadoEvento); return; }
  if (ofrecerProteccionCapo()) { eventoCapo(mostrarResultadoEvento); return; }

  // 4. Semana tranquila
  avisoSemanaNueva();
}

function mostrarResultadoEvento(texto) {
  const dlg = document.getElementById('dialogoCliente');
  dialogoAbierto = true;
  dlg.classList.remove('oculto');

  actualizarHUD();

  document.getElementById('dcTitulo').textContent = 'Lo que pasó';
  document.getElementById('dcTexto').innerHTML = `
    ${texto}
    <br><br>
    <span style="color:#F2A93B;">
      Arranca la semana ${gameState.semanaActual} de ${gameState.totalSemanas}.
    </span>
    ${caminos.clausurado > 0
      ? '<br><br><span style="color:#ff6b66;">El local está CLAUSURADO esta semana: no vas a poder vender.</span>'
      : ''}`;

  document.getElementById('dcBotones').innerHTML =
    '<button class="btn" onclick="abrirKioscoDelDia()">Empezar la semana</button>';
}

// ==========================================================
// CAMINO 1 — EL CAPO
// Protección semanal. Si te atrasás, las consecuencias son
// peores que no haber aceptado nunca.
// ==========================================================

function ofrecerProteccionCapo() {
  // Todas las condiciones deben cumplirse (&&)
  return !caminos.pagaProteccion
      && caminos.atrasosCapo === 0
      && !caminos.delato
      && gameState.semanaActual >= 2
      && gameState.semanaActual <= 4
      && Math.random() < 0.55;
}

function eventoCapo(alTerminar) {
  mostrarEventoGrande({
    etiqueta: 'Alguien golpea el mostrador',
    titulo: 'El capo del barrio',
    relato: `Es media tarde. Un auto para en la puerta y baja un tipo grande, campera de
             cuero, cadena gruesa. No hace falta que se presente: en el barrio todos saben
             quién es. Se apoya en el mostrador con calma, como si el local fuera suyo.`,
    dialogo: `"Mirá, pibe. Esto está jodido, ¿viste? Entran, se llevan todo, te dejan sin nada.
              <br><br>Por <strong>$${caminos.montoProteccion.toLocaleString('es-AR')}</strong>
              por semana yo me encargo de que nadie te toque. Vos tranquilo, trabajá.
              <br><br>Pero eso sí: se paga todas las semanas. Sin faltar."`,
    aviso: 'Si aceptás y después te atrasás, las consecuencias son peores que no haber aceptado nunca.',
    opciones: [
      {
        titulo: 'Aceptar la protección',
        detalle: `Pagás $${caminos.montoProteccion.toLocaleString('es-AR')} por semana.
                  Si sostenés la confianza, puede terminar ayudándote con lo de tu hermano.`,
        accion: () => {
          caminos.pagaProteccion = true;
          caminos.confianzaCapo = 0;
          alTerminar('Aceptaste la protección del capo.');
        }
      },
      {
        titulo: 'Rechazar',
        detalle: 'No le debés nada a nadie, pero quedás expuesto.',
        accion: () => alTerminar('Rechazaste la oferta del capo. Te quedás solo.')
      }
    ]
  });
}

// Se cobra al cerrar cada semana
function cobrarProteccion() {
  if (!caminos.pagaProteccion) return null;

  const monto = caminos.montoProteccion;

  if (gameState.caja >= monto) {
    gameState.caja -= monto;
    caminos.confianzaCapo++;

    let texto = `Le pagaste $${monto.toLocaleString('es-AR')} de protección al capo.`;
    if (caminos.confianzaCapo >= 3 && Math.random() < 0.5) {
      texto += ' Te avisó: "cuidate esta semana, anda alguien raro rondando".';
    }
    return { color: '#5FD96C', texto };
  }

  // No le alcanzó: atraso
  caminos.atrasosCapo++;
  caminos.confianzaCapo = 0;
  gameState.estres = Math.min(100, gameState.estres + 12);

  if (caminos.atrasosCapo === 1) {
    caminos.montoProteccion = Math.round(monto * 1.5);
    return {
      color: '#ff6b66',
      texto: `No le pudiste pagar al capo. Te lo perdonó, pero ahora te cobra
              $${caminos.montoProteccion.toLocaleString('es-AR')} por semana.`
    };
  }

  caminos.pagaProteccion = false;
  return {
    color: '#ff6b66',
    texto: `Segundo atraso con el capo. Se cortó la protección y empezaron las represalias.
            Ahora estás más expuesto que antes de pagarle.`
  };
}

// ==========================================================
// CAMINO 2 — EL ABOGADO
// El atajo: tu hermano sale ya, pero delatás al capo.
// ==========================================================

function ofrecerAbogado() {
  if (caminos.abogadoOfrecido || caminos.delato) return false;
  if (gameState.semanaActual < 4) return false;

  // Solo aparece si estás desesperado
  const lejosDeLaMeta = gameState.caja < gameState.metaFianza * 0.5;
  const estresAlto = gameState.estres > 55;
  if (!lejosDeLaMeta && !estresAlto) return false;

  return Math.random() < 0.7;
}

function eventoAbogado(alTerminar) {
  caminos.abogadoOfrecido = true;

  mostrarEventoGrande({
    etiqueta: 'Una visita inesperada',
    titulo: 'El abogado',
    relato: `Un tipo de traje azul, prolijo, con un portafolio de cuero, se para en la
             ventanita. No compra nada. Dice tu nombre completo y el de tu hermano. Sabe
             en qué causa está, sabe cuánto falta para la audiencia, sabe que no vas a
             llegar con la plata.`,
    dialogo: `"Puedo sacar a tu hermano esta misma semana. No necesitás juntar un peso más.
              <br><br>Solo tenés que declarar ante la policía quién maneja el barrio.
              Un nombre, nada más.<br><br>Pensalo bien, porque vuelvo una sola vez: nunca."`,
    aviso: 'Esta decisión no tiene vuelta atrás.',
    opciones: [
      {
        titulo: 'Dar el nombre',
        detalle: `Tu hermano sale libre. Pero delatar al capo en un barrio como este tiene
                  consecuencias que no podés anticipar.`,
        accion: () => {
          caminos.delato = true;
          caminos.semanaDelacion = gameState.semanaActual;
          gameState.estres = Math.min(100, gameState.estres + 25);
          alTerminar('Delataste al capo. Salís de la comisaría con una sensación rara en el cuerpo.');
        }
      },
      {
        titulo: 'Negarte',
        detalle: 'Seguís juntando la plata por tus propios medios.',
        accion: () => alTerminar('Le dijiste que no al abogado. Se fue sin insistir.')
      }
    ]
  });
}

// El sicario viene 1-2 semanas después de delatar, sin aviso
function chequearSicario() {
  if (!caminos.delato || caminos.semanaDelacion === null) return false;
  if (gameState.semanaActual - caminos.semanaDelacion < 1) return false;
  if (caminos.finalObtenido) return false;

  caminos.semanaDelacion = null;   // solo se dispara una vez

  // Acá la condición es BINARIA: solo la pistola salva.
  // El jugador que la compró "por las dudas" es recompensado
  // retroactivamente, sin haber sabido que este evento existía.
  const tienePistola = armaActual === 'pistola';
  terminarPartida(tienePistola ? 'abogado_sobrevive' : 'abogado_tragico');

  mostrarEventoGrande({
    etiqueta: 'Nadie lo vio venir',
    titulo: tienePistola ? 'Alcanzaste a reaccionar' : 'No llegaste a entender',
    relato: tienePistola
      ? `Un tipo que no habías visto nunca se paró en la ventanita. No pidió nada.
         Metió la mano en la campera.<br><br>
         No pensaste. La mano fue sola hasta abajo del mostrador, donde estaba la pistola
         que compraste hace semanas sin saber bien para qué.<br><br>
         El tipo salió corriendo. Vos te quedaste ahí, temblando, con el arma en la mano
         y el barrio entero mirando por la ventana.`
      : `Un tipo que no habías visto nunca se paró en la ventanita. No pidió nada.
         Metió la mano en la campera.<br><br>
         Buscaste algo abajo del mostrador. No había nada. Nunca compraste con qué defenderte.
         <br><br>No llegaste a entender qué estaba pasando.`,
    opciones: [{
      titulo: 'Ver el final',
      accion: () => renderFinal(caminos.finalObtenido)
    }]
  });

  return true;
}

// ==========================================================
// CAMINO 3 — LA POLICÍA
// Coimas que escalan, o clausura del local.
// ==========================================================

function ofrecerCoima() {
  if (caminos.pagaProteccion || caminos.delato) return false;
  if (caminos.vecesPolicia >= 3) return false;
  if (gameState.semanaActual < 2) return false;
  if (caminos.clausurado > 0) return false;
  return Math.random() < 0.4;
}

// Escala exponencialmente: 6000, 9600, 15360...
function montoCoima() {
  return Math.round(6000 * Math.pow(1.6, caminos.vecesPolicia));
}

function eventoPolicia(alTerminar) {
  const monto = montoCoima();
  const esReincidencia = caminos.vecesPolicia > 0;
  caminos.vecesPolicia++;

  mostrarEventoGrande({
    etiqueta: esReincidencia ? 'Otra vez el mismo' : 'Control municipal',
    titulo: 'El policía',
    relato: esReincidencia
      ? `Es el mismo de la otra vez. Ni disimula. Se para frente a la ventanita, mira
         alrededor con cara de aburrido y golpea el mostrador con los nudillos.
         Ya sabés para qué vino.`
      : `Un patrullero frena en la esquina. Baja un policía, camina despacio hasta el
         local y se queda mirando el estante un rato largo, sin decir nada.
         Después saca una libreta.`,
    dialogo: esReincidencia
      ? `"Che, ¿seguimos con lo mismo? Mirá que ahora subió.
         <br><br>Son <strong>$${monto.toLocaleString('es-AR')}</strong>. Vos sabés cómo es esto."`
      : `"¿Vos tenés la habilitación bromatológica al día? Porque yo acá no la veo.
         <br><br>Mirá, esto se puede solucionar acá mismo con
         <strong>$${monto.toLocaleString('es-AR')}</strong>. O te clausuro el local ahora."`,
    aviso: 'Ceder ahora no cierra el tema: si volvés a pagar, va a volver a pedir, y más caro.',
    opciones: [
      {
        titulo: `Pagar $${monto.toLocaleString('es-AR')}`,
        detalle: 'El local sigue abierto, pero es un golpe fuerte al fondo de la fianza.',
        accion: () => {
          if (gameState.caja < monto) {
            caminos.clausurado = 1;
            gameState.estres = Math.min(100, gameState.estres + 20);
            alTerminar('Quisiste pagar pero no te alcanzó. Te clausuraron el local por una semana.');
            return;
          }
          gameState.caja -= monto;
          gameState.estres = Math.min(100, gameState.estres + 8);
          alTerminar(`Le pagaste $${monto.toLocaleString('es-AR')} al policía.`);
        }
      },
      {
        titulo: 'Negarte y bancar la clausura',
        detalle: 'No le das un peso. Te clausuran una semana entera: cero ventas.',
        accion: () => {
          caminos.seNegoACoima = true;
          caminos.clausurado = 1;
          gameState.estres = Math.min(100, gameState.estres + 14);
          alTerminar('Te plantaste y no pagaste. Te clausuraron el local por una semana.');
        }
      }
    ]
  });
}

// ==========================================================
// LOS FINALES
// ==========================================================

function terminarPartida(tipo) {
  caminos.partidaTerminada = true;
  caminos.finalObtenido = tipo;
}

const FINALES = {
  capo: {
    titulo: 'La deuda con el barrio',
    texto: `El capo movió sus contactos y tu hermano salió sin que tuvieras que juntar toda
            la fianza. Está libre. Pero ahora le debés un favor a alguien del barrio, y esos
            favores siempre se cobran.`
  },
  abogado_sobrevive: {
    titulo: 'Marcado',
    texto: `Tu hermano quedó libre. Vos estás vivo de casualidad, porque compraste esa pistola
            sin saber para qué. En el barrio ya saben que hablaste: no vas a poder volver a
            caminar tranquilo por acá.`
  },
  abogado_tragico: {
    titulo: 'Hasta acá',
    texto: `Tu hermano salió libre. Vos no llegaste a verlo.`
  },
  policia_limpio: {
    titulo: 'Limpio, pero manchado',
    texto: `Juntaste la fianza sin deberle nada a nadie del barrio. Solo tuviste que pagarle
            a la policía para que te dejara trabajar. Tu hermano está libre, y vos aprendiste
            que la vía legal también tiene su precio.`
  },
  policia_intachable: {
    titulo: 'Sin agachar la cabeza',
    texto: `Te clausuraron el local, perdiste semanas de venta, y aun así llegaste. No le
            pagaste a nadie. Tu hermano está libre y vos podés mirar a cualquiera a los ojos.
            El camino más difícil de todos.`
  },
  meta_solo: {
    titulo: 'Con lo justo',
    texto: `Juntaste la fianza a tiempo trabajando el kiosco. Tu hermano vuelve a casa.`
  },
  salida_parcial: {
    titulo: 'Media victoria',
    texto: `No llegaste al monto completo, pero juntaste lo suficiente para un abogado más
            barato. A tu hermano le redujeron la condena. No es lo que querías, pero es algo.`
  },
  bancarrota: {
    titulo: 'Fundido',
    texto: `Te quedaste sin plata y sin mercadería. El kiosco cerró. Tu hermano se queda adentro.`
  },
  quiebra_tecnica: {
    titulo: 'Lleno de mercadería, sin un peso',
    texto: `El estante estaba repleto. Habías comprado bien, tenías stock para semanas.
            Pero cuando vino el del alquiler no tenías con qué pagarle, y la mercadería
            no se puede usar para saldar deudas.<br><br>
            Aprendiste tarde algo que descubre todo el que arranca un negocio: tener
            mercadería no es tener plata. Lo que importa es el efectivo disponible,
            no el valor de lo que hay en el depósito.<br><br>
            El kiosco cerró con los estantes llenos.`
  },
  colapso_estres: {
    titulo: 'No dio más',
    texto: `Semanas al límite, sin dormir, mirando la puerta cada vez que sonaba algo.
            El cuerpo dijo basta antes que la plata. El kiosco quedó cerrado.`
  }
};

// Se evalúa al cerrar cada semana, en orden de prioridad
function evaluarFinal() {
  if (caminos.finalObtenido) return caminos.finalObtenido;

  // 1. Final del capo: confianza sostenida
  if (caminos.pagaProteccion && caminos.confianzaCapo >= 4 && !caminos.delato) {
    terminarPartida('capo');
    return 'capo';
  }

  // 2. Colapso por estrés
  if (gameState.estres >= 100) {
    terminarPartida('colapso_estres');
    return 'colapso_estres';
  }

  // 3. Bancarrota: sin plata y sin nada que vender
  const sinStock = gameState.productos.every(p => p.stock === 0);
  if (gameState.caja <= 0 && sinStock) {
    terminarPartida('bancarrota');
    return 'bancarrota';
  }

  // 4. Quiebra técnica: tenés mercadería pero no podés pagar nada.
  //    Enseña que stock no es lo mismo que efectivo disponible.
  const valorStock = gameState.productos.reduce(
    (acc, p) => acc + p.stock * p.costo, 0
  );
  if (gameState.caja === 0 && gameState.deudaAcumulada > 0
      && valorStock > gameState.deudaAcumulada * 1.5) {
    terminarPartida('quiebra_tecnica');
    return 'quiebra_tecnica';
  }

  // 5. Llegó a la meta
  if (gameState.caja >= gameState.metaFianza) {
    let final = 'meta_solo';
    if (caminos.vecesPolicia > 0) {
      final = caminos.seNegoACoima ? 'policia_intachable' : 'policia_limpio';
    }
    terminarPartida(final);
    return final;
  }

  // 6. Se acabaron las semanas
  if (gameState.semanaActual > gameState.totalSemanas) {
    const final = gameState.caja >= gameState.metaFianza * 0.5 ? 'salida_parcial' : 'bancarrota';
    terminarPartida(final);
    return final;
  }

  return null;
}
function renderFinal(tipo) {
  const f = FINALES[tipo];

  mostrarEventoGrande({
    etiqueta: 'Fin de la partida',
    titulo: f.titulo,
    relato: f.texto,
    aviso: `Semanas jugadas: ${gameState.semanaActual} ·
            Plata reunida: $${gameState.caja.toLocaleString('es-AR')} de
            $${gameState.metaFianza.toLocaleString('es-AR')} ·
            Estrés final: ${gameState.estres}%`,
    opciones: [{
      titulo: 'Jugar de nuevo',
      accion: () => location.reload()
    }]
  });
}