// ==========================================================
// CLIENTES CON HISTORIA
// No son gente anónima: cada uno tiene nombre, forma de
// hablar, y una historia que avanza cada vez que lo atendés.
// La gracia es que el jugador piense "uh, vino el del Fiat,
// a ver qué le pasó ahora".
// ==========================================================

const CLIENTES = [
  // ------------------------------------------------------
  {
    id: 'rosa',
    nombre: 'Doña Rosa',
    visitas: 0,

    // Frases sueltas que dice entre etapa y etapa
    frases: [
      'Mirá, yo a tu edad ya tenía tres hijos y una deuda con el almacén.',
      'Mi marido dice que no hay que gastar tanto. Ayer se compró una caña nueva. No pesca desde 1998.',
      '¿Tenés caramelos de esos de antes? No estos modernos que tienen gusto a perfume.',
      'Ayer se me cayó el control remoto abajo del sillón. Tuve que mover el sillón. Casi me desmayo.',
      'Mi hija me dijo que me haga Facebook. Ahora tengo 47 solicitudes de gente que no conozco.',
      'Mi vecina se compró una pileta. Tiene tres metros de largo y un metro de agua. Se mete igual.'
    ],

    // Su historia: el gato de la vecina del tercero
    historia: [
      'La vecina del tercero tiene un gato enorme. Enorme, en serio.',
      'El gato de la vecina del tercero se metió en mi casa. No sé por dónde entró.',
      'Ahora el gato entra solo. Ni maúlla. Entra y se sienta en MI sillón.',
      'Vino la vecina a buscarlo. El gato no quiso irse. Se hizo el dormido.',
      'Creo que el gato ya vive conmigo. Le compré comida. No sé en qué momento pasó esto.'
    ]
  },

  // ------------------------------------------------------
  {
    id: 'nacho',
    nombre: 'Nacho',
    visitas: 0,

    frases: [
      'Amigo, ayer casi me pongo de novio porque me respondió una historia.',
      'Le mandé "jajaja" y me clavó el visto. Creo que terminó todo.',
      'Mi vieja me pidió que compre leche. Me olvidé. Compré una gaseosa.',
      'Ayer salí con veinte pesos y volví con menos veinte. No preguntes.',
      '¿Tenés cargador? Mi celular está en 2%. Si se apaga, desaparezco.',
      'Me levanté temprano para estudiar. Después me acosté cinco minutos. Eran las cuatro de la tarde.'
    ],

    // Su historia: Kevin y la moto
    historia: [
      'Mi primo Kevin se compró una moto. Está re contento el pibe.',
      'Kevin se cayó con la moto. Él está bien. La moto no tanto.',
      'Kevin arregló la moto. Ahora anda peor que antes, pero anda.',
      'Kevin vendió la moto. Dice que fue una decisión madura.',
      'Kevin se compró un auto. Amigo, no aprende más.'
    ]
  },

  // ------------------------------------------------------
  {
    id: 'ramirez',
    nombre: 'El Gordo Ramírez',
    visitas: 0,

    frases: [
      'Hoy el jefe me dijo "tenemos que hablar" y estuve cuatro horas pensando que me echaba. Era para preguntarme si quería café.',
      'Hoy hice horas extra. Me pagaron con experiencia.',
      'Salí del laburo a las seis. Llegué a casa a las ocho. Vivo a veinte minutos.',
      'Hoy dije "buen día" en el trabajo y nadie me contestó. Creo que ya no pertenezco ahí.',
      'Mi mujer me dijo que compre pan. Me olvidé. Ahora estoy acá como si fuera una misión de vida o muerte.',
      'El viernes mi jefe dijo "salimos temprano". Nos dejó salir seis minutos antes.'
    ],

    // Su historia: el Fiat que hace ruidos
    historia: [
      'Mi Fiat hace un ruido raro. Empezó ayer.',
      'El ruido del Fiat empeoró. Ahora lo escucho hasta con la radio puesta.',
      'Llevé el Fiat al mecánico. Me dijo que no sabe qué tiene. Me cobró igual.',
      'El Fiat ahora hace tres ruidos distintos. Uno cuando arranco, otro cuando doblo, otro cuando freno.',
      'Hoy el Fiat no hizo ningún ruido. Eso me preocupa más que cuando hacía ruido.'
    ]
  },

  // ------------------------------------------------------
  {
    id: 'alberto',
    nombre: 'Don Alberto',
    visitas: 0,

    frases: [
      'Yo antes venía acá y las galletitas salían dos pesos. Dos pesos, pibe.',
      'Yo tuve un televisor que duró treinta años. Ahora comprás uno y a los tres años empieza a hablar solo.',
      'El otro día fui al banco. Había tanta gente que pensé que regalaban plata.',
      'Tengo una silla en casa que tiene más años que vos.',
      'Yo arreglaba todo con alambre. Ahora llaman a un técnico y les cobra una fortuna.',
      'Mi hijo dice que no sé usar el celular. Pero mirá, sé mandarte un audio.'
    ],

    // Su historia: Roberto, el perro del vecino
    historia: [
      'Mi vecino tiene un perro que se llama Roberto. Es medio boludo, pero lo queremos.',
      'Che, ¿no viste a Roberto? Se escapó ayer. Andamos buscándolo por todo el barrio.',
      'Encontramos a Roberto. Estaba durmiendo en la casa del vecino de enfrente. Ni se movió.',
      'Roberto ahora tiene novia. No sabemos de dónde salió la perra esa.',
      'Roberto tuvo cachorros. Mi vecino no puede mantener ni sus propias pulgas y ahora tiene cinco perros.'
    ]
  },

  // ------------------------------------------------------
  {
    id: 'marian',
    nombre: 'Marian',
    visitas: 0,

    frases: [
      'Dame unas galletitas... no, esas no, porque después este se pone insoportable.',
      'No le des caramelos, por favor. Después en casa corre por las paredes.',
      'Vine por leche y pañales. Ya gasté más de lo que tenía.',
      'No, mi amor, no tenemos plata para eso. No. Te dije que no. Bueno, uno.',
      'Hoy durmió toda la noche. Estoy sospechando que algo anda mal.',
      'Mi marido dijo que iba a hacer las compras. Terminó comprando solamente cerveza.'
    ],

    // Su historia: Tomás, que no para quieto
    historia: [
      'Tomás, bajate de ahí. Perdoná. TOMÁS.',
      'Tomás aprendió a abrir la heladera. Estamos en problemas.',
      'Tomás se escondió en el placard y se durmió. Lo busqué una hora.',
      'Tomás dijo su primera mala palabra. La aprendió de mi marido. Obvio.',
      'Tomás empieza el jardín la semana que viene. No sé si estoy lista yo.'
    ]
  },

  // ------------------------------------------------------
  {
    id: 'chusma',
    nombre: 'El vecino del 2°',
    visitas: 0,

    frases: [
      '¿Viste al de la esquina? Bueno... después te cuento.',
      'Yo no quiero hablar mal de nadie, pero...',
      'No te voy a decir quién fue, pero alguien rompió el tacho de basura.',
      'Ayer escuché una discusión en la otra cuadra. No entendí nada, pero fue fuerte.',
      'La señora del 4° se compró un lavarropas nuevo. Te lo digo porque yo sé esas cosas.',
      'No puedo hablar mucho porque después dicen que soy chusma.'
    ],

    // Su historia: el kiosco de la competencia
    historia: [
      '¿Viste que el kiosco de la otra esquina anda mal? Yo sé por qué.',
      'Al de la otra esquina lo vinieron a ver unos tipos. No te digo más.',
      'El kiosco de la otra esquina bajó la persiana. Dicen que fue por deudas.',
      'Cerró el kiosco de la otra esquina. Ahora los clientes vienen todos para acá.',
      'Che, ¿sabías que están preguntando por vos en el barrio? Nada malo, eh. Creo.'
    ]
  }
];

// ==========================================================
// ELEGIR QUIÉN VIENE Y QUÉ DICE
// ==========================================================

// Elige un cliente al azar, pero da prioridad a los que
// vinieron menos veces, para que todos tengan su historia.
function elegirCliente() {
  const minVisitas = Math.min(...CLIENTES.map(c => c.visitas));
  const candidatos = CLIENTES.filter(c => c.visitas <= minVisitas + 1);
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

// Devuelve qué dice esta vez.
// Alterna: la primera visita y cada dos visitas avanza la
// historia; en el medio dice una frase suelta.
function dialogoDelCliente(cliente) {
  const etapaHistoria = Math.floor(cliente.visitas / 2);
  const toca = cliente.visitas % 2 === 0;

  if (toca && etapaHistoria < cliente.historia.length) {
    return cliente.historia[etapaHistoria];
  }

  return cliente.frases[Math.floor(Math.random() * cliente.frases.length)];
}

// Saludo: cambia si ya te conoce
function saludoDelCliente(cliente) {
  if (cliente.visitas === 0) return 'Buenas.';
  if (cliente.visitas < 3)   return 'Buenas, ¿cómo andás?';
  return '¡Eh, buenas! ¿Todo bien?';   // ya son conocidos
}