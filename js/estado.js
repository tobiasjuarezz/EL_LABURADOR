// ==========================================================
// ESTADO DEL JUEGO
// Todo lo que cambia durante la partida vive acá.
// Tenerlo centralizado facilita leerlo y guardarlo después.
// ==========================================================

const gameState = {
  // --- Tiempo ---
  // 2 semanas de 6 días (lunes a sábado, sin domingo) como base. Puede
  // crecer durante la partida por la escalada de semanas de castigo
  // (ver SEMANAS_BASE / enSemanaCastigo más abajo, y caminos.js/eventos.js).
  semanaActual: 1,
  totalSemanas: 2,
  diaActual: 1,
  diasPorSemana: 6,

  // Contador de días que NO se reinicia por semana (a diferencia de
  // diaActual). Sirve para calcular cadencias exactas ("cada 2 días",
  // "cada 3 días") durante las semanas de castigo, que pueden cruzar
  // límites de semana sin perder el ritmo.
  diaGlobal: 1,

  // --- Economía ---
  // Meta deliberadamente altísima: con el kiosco solo es casi imposible
  // llegar. La idea de diseño es empujar al jugador hacia los caminos
  // narrativos (capo, abogado) como vía realista para completar la fianza.
  metaFianza: 50000,
  caja: 2200,
  alquilerSemanal: 3500,
  luzSemanal: 1200,
  deudaAcumulada: 0,

  // Los gastos fijos (alquiler + luz) se cobran dos veces por
  // semana: la mitad el miércoles, la otra mitad el sábado (que es
  // el día de cierre). Esta bandera evita cobrar la mitad dos
  // veces la misma semana.
  gastoParcialCobradoEstaSemana: false,

  // --- Ventas ---
  ventasDelDia: 0,
  ventasDeLaSemana: 0,
  clientesAtendidosHoy: 0,
 
  // --- Estado del jugador ---
  estres: 0,

  // Nombre que el jugador le puso al kiosco en la pantalla de inicio
  // (empezarJuego(), en interfaz.js). 'EL LABURADOR' si lo dejó vacío.
  nombreKiosco: 'EL LABURADOR',

  // --- Catálogo de productos ---
  // impuesto: % que se descuenta de cada venta de ese producto (ver
  // cobrarVenta en ventas.js) -- gravamos gaseosa y papas fritas, en la
  // línea de los impuestos internos reales a bebidas azucaradas y
  // snacks. diasVencimiento + diaIngresoStock: ver chequearVencimientos
  // en eventos.js -- diaIngresoStock se fija la primera vez que se
  // compra stock de ese producto (confirmarCompra, interfaz.js) y se
  // actualiza en cada reposición siguiente (simplificación: se trata
  // todo el stock de un producto como si tuviera la antigüedad de la
  // compra más reciente, no se lleva la cuenta por lote).
  productos: [
    { id: 'alfajor',   nombre: 'Alfajor',      costo: 350,  precioJusto: 700,  precio: 700,  stock: 2, demandaBase: 9,  diasVencimiento: 14, diaIngresoStock: null },
    { id: 'chocolate', nombre: 'Chocolate',    costo: 500,  precioJusto: 950,  precio: 950,  stock: 1, demandaBase: 7,  diasVencimiento: 14, diaIngresoStock: null },
    { id: 'chicles',   nombre: 'Chicles',      costo: 150,  precioJusto: 350,  precio: 350,  stock: 3, demandaBase: 12, diasVencimiento: 21, diaIngresoStock: null },
    { id: 'gaseosa',   nombre: 'Gaseosa',      costo: 600,  precioJusto: 1200, precio: 1200, stock: 1, demandaBase: 6,  diasVencimiento: 10, diaIngresoStock: null, impuesto: 0.08 },
    { id: 'agua',      nombre: 'Agua',         costo: 400,  precioJusto: 800,  precio: 800,  stock: 2, demandaBase: 8,  diasVencimiento: 12, diaIngresoStock: null },
    { id: 'jugo',      nombre: 'Jugo',         costo: 450,  precioJusto: 900,  precio: 900,  stock: 1, demandaBase: 7,  diasVencimiento: 10, diaIngresoStock: null },
    { id: 'papas',     nombre: 'Papas fritas', costo: 700,  precioJusto: 1400, precio: 1400, stock: 0, demandaBase: 5,  diasVencimiento: 11, diaIngresoStock: null, impuesto: 0.08 },
    { id: 'palitos',   nombre: 'Palitos',      costo: 550,  precioJusto: 1100, precio: 1100, stock: 1, demandaBase: 6,  diasVencimiento: 11, diaIngresoStock: null }
  ]
};

// Productos que arrancan fuera del catálogo y se agregan a
// gameState.productos al alcanzar ciertas metas de progreso (ver
// METAS en interfaz.js). No tienen diasVencimiento/impuesto propios:
// se comportan como el resto de los no gravados.
const PRODUCTOS_DESBLOQUEABLES = {
  cafe:     { id: 'cafe',     nombre: 'Café en vaso', costo: 300, precioJusto: 650,  precio: 650,  stock: 0, demandaBase: 6, diasVencimiento: 30, diaIngresoStock: null },
  sanguche: { id: 'sanguche', nombre: 'Sanguche',     costo: 650, precioJusto: 1300, precio: 1300, stock: 0, demandaBase: 5, diasVencimiento: 3,  diaIngresoStock: null }
};

// ==========================================================
// PRÉSTAMO VOLUNTARIO
// El jugador puede pedirle plata a un prestamista para reforzar la
// compra de stock. Tiene 5 días (gameState.diaGlobal) para
// devolverlo; si no lo hace, pierde la partida (ver
// chequearVencimientoPrestamo en eventos.js). Sin interés: se debe
// exactamente lo que se pidió.
// ==========================================================
const PLAZO_PRESTAMO_DIAS = 5;

const prestamo = {
  activo: false,
  monto: 0,
  diaGlobalPedido: null,
  diaGlobalVencimiento: null
};

// ==========================================================
// DENOMINACIONES DE BILLETES Y MONEDAS
// Para armar el vuelto a mano (ver agregarDenominacion en ventas.js).
// BILLETES (más arriba en ventas.js) son los billetes con los que
// PAGAN los clientes; estas son todas las denominaciones disponibles
// para DAR de vuelto.
// ==========================================================
const DENOMINACIONES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function nombreDiaActual() {
  return NOMBRES_DIA[(gameState.diaActual - 1) % 7];
}

// ==========================================================
// SEMANAS DE CASTIGO
// La partida dura SEMANAS_BASE semanas "normales". Toda semana por
// encima de eso es una semana de castigo: se desbloquean negándose a
// la policía o al capo (ver caminos.js / eventos.js) y no tienen un
// tope fijo -- gameState.totalSemanas puede seguir creciendo mientras
// el jugador se siga negando.
// ==========================================================
const SEMANAS_BASE = 2;

function enSemanaCastigo() {
  return gameState.semanaActual > SEMANAS_BASE;
}
 
// ==========================================================
// ESTADO DE LOS TRES CAMINOS
// ==========================================================
const caminos = {
  // Camino 1: el capo
  // OJO: el capo tiene dos comportamientos DISTINTOS que conviven en
  // paralelo, sin mezclarse entre sí:
  //  - el capo "protector": cobra una cuota semanal en plata a cambio
  //    de protección (pagaProteccion / confianzaCapo / atrasosCapo /
  //    montoProteccion, todo esto ya existía).
  //  - el capo "extorsionador de mercadería": mecánica nueva, que solo
  //    aparece durante semanas de castigo y le exige la mitad del stock
  //    cada 2 días (ver eventos.js). Un jugador puede estar pagando la
  //    protección Y sufrir la extorsión de mercadería en la misma
  //    semana de castigo: no son excluyentes.
  pagaProteccion: false,
  confianzaCapo: 0,
  atrasosCapo: 0,
  montoProteccion: 2500,

  // true desde la primera vez que se aceptó pagar la protección, para
  // siempre (aunque después se corte por atrasos). Define si negarse a
  // la extorsión de mercadería arriesga la vida (ver punto 5 del
  // diseño, en eventos.js).
  aceptoProteccionAlgunaVez: false,

  // true desde la primera vez que el jugador se niega a entregar la
  // mercadería que exige el capo en una semana de castigo. A partir de
  // ahí, un chorro puede aparecer cada 3 días (ver eventos.js).
  seNegoAlCapoCastigo: false,

  // Día global (gameState.diaGlobal) en el que arrancó la primera
  // semana de castigo. Ancla la cadencia de "cada 2 / cada 3 días" para
  // que no se reinicie en cada semana nueva. null hasta que se entra
  // en castigo por primera vez.
  diaGlobalInicioCastigo: null,

  // Se reinicia en true al arrancar cada semana; se apaga apenas el
  // jugador se niega a pagar la protección (o le falta la plata) o se
  // niega a entregar la mercadería en esa semana. Sirve para detectar
  // el final de sumisión total (ver evaluarFinal en caminos.js).
  semanaActualSinNegarseCapo: true,

  // Se calcula al cerrar cada semana (confirmarFinDeSemana, en
  // eventos.js): true si la semana que se acaba de cerrar fue una
  // semana de castigo "limpia" -- pagó la protección y nunca se negó
  // a nada del capo. evaluarFinal() la consume para el final
  // capo_sumision y se recalcula de cero en cada cierre de semana.
  semanaCastigoCerradaLimpia: false,

  // Camino 2: el abogado
  delato: false,
  semanaDelacion: null,
  abogadoOfrecido: false,

  // Camino 3: la policía
  vecesPolicia: 0,
  seNegoACoima: false,
  clausurado: 0,

  // Modo Semana Límite: además del balance semanal, se vuelve a
  // evaluar si corresponde ofrecer un camino narrativo al cerrar
  // cada día. Estas banderas evitan que el mismo camino insista
  // día tras día una vez que ya se ofreció (se acepte o no); se
  // reinician al arrancar cada semana nueva.
  capoOfrecidoEnDia: false,
  coimaOfrecidaEnDia: false,

  // Cierre
  partidaTerminada: false,
  finalObtenido: null
};
 
// ==========================================================
// EFECTOS QUE DURAN UN DÍA
// ==========================================================
const efectosDia = {
  sinLuz: false,
  productoViral: null,
  productoProhibido: null,
  multaPendiente: 0
};
 
function limpiarEfectosDia() {
  efectosDia.sinLuz = false;
  efectosDia.productoViral = null;
  efectosDia.productoProhibido = null;
}
 
// ==========================================================
// SISTEMA DE ARMAS
// ==========================================================
const ARMAS = {
  manos:    { nombre: 'Manos',    costo: 0,    probDefensa: 0.15 },
  cuchillo: { nombre: 'Cuchillo', costo: 1200, probDefensa: 0.40 },
  machete:  { nombre: 'Machete',  costo: 3000, probDefensa: 0.65 },
  pistola:  { nombre: 'Pistola',  costo: 8000, probDefensa: 0.85 }
};
 
const ORDEN_ARMAS = ['manos', 'cuchillo', 'machete', 'pistola'];
 
let armaActual = 'manos';
 
function comprarArma(tipo) {
  const arma = ARMAS[tipo];
  if (armaActual === tipo) return;
 
  if (arma.costo > gameState.caja) {
    alert('No te alcanza la caja para eso.');
    return;
  }
 
  gameState.caja -= arma.costo;
  armaActual = tipo;
  actualizarHUD();
  renderFaseCompra();
}
 
// ==========================================================
// MEJORAS DEL KIOSCO (metas intermedias)
// ==========================================================
const mejoras = {
  clientelaFija: false,
  heladeraNueva: false,
  carteLuminoso: false,
  camaraSeguridad: false,
  proveedorFijo: false
};
 
// ==========================================================
// PALETAS DE COLORES
// ==========================================================
const PALETA = {
  pisoClaro:   [108, 56, 34],
  pisoOscuro:  [78, 40, 24],
  paredClara:  [96, 90, 80],
  paredSombra: [70, 65, 56],
  viga:        [52, 33, 19],
  neon:        [206, 138, 42],
  estanteMetal:       [72, 60, 44],
  estanteMetalOscuro: [46, 38, 28],
  heladeraCuerpo: [120, 124, 128],
  heladeraVidrio: [80, 110, 122],
  // --- Detalle y realismo: zócalos, molduras, madera, toldo ---
  zocalo:      [30, 26, 22],
  moldura:     [88, 80, 68],
  maderaClara: [138, 92, 50],
  maderaOscura:[74, 46, 24],
  metalBrillo: [200, 200, 208],
  toldo:       [176, 44, 40],
  toldoSombra: [126, 30, 28],
  bronce:      [196, 156, 84]
};
 
const PALETA_CALLE = {
  vereda:      [96, 92, 86],
  veredaLinea: [78, 74, 70],
  cordon:      [128, 124, 116],
  cordonPint:  [150, 130, 60],
  asfalto:     [46, 44, 44],
  lineaBlanca: [190, 186, 172],
  farolLuz:    [255, 214, 140]
};
 
const COLOR_PRODUCTO = {
  alfajor:   [150, 82, 38],
  chocolate: [92, 52, 30],
  chicles:   [188, 76, 128],
  gaseosa:   [172, 42, 44],
  agua:      [70, 140, 178],
  jugo:      [206, 138, 40],
  papas:     [196, 168, 62],
  palitos:   [88, 132, 66]
};
 
// ==========================================================
// ZONAS DE INTERACCIÓN
// ==========================================================
const ZONA_CAJA = { x: 0, z: 250, radio: 220 };
const PUERTA    = { x: 880, z: 270, radio: 200 };
 
// Estado compartido de los diálogos
let dialogoAbierto = false;
let juegoIniciado = false;

// El día se corta solo al llegar a este número de clientes
// atendidos (ver cerrarDiaAutomatico en eventos.js). Mientras el
// cartel de "Terminó el día" está en pantalla, el jugador queda
// congelado (no puede moverse ni interactuar).
const LIMITE_CLIENTES_DIA = 10;
let diaBloqueado = false;

// ==========================================================
// CLIMA Y EVENTOS QUE AFECTAN LA DEMANDA
// ==========================================================
const climaHoy = {
  tipo: null,        // 'frio' | 'calor' | 'festejo' | null
  productos: [],     // qué productos se venden más
  multiplicador: 1   // cuánto más se llevan
};
 
function limpiarClima() {
  climaHoy.tipo = null;
  climaHoy.productos = [];
  climaHoy.multiplicador = 1;
}
 
// ==========================================================
// INFLACIÓN
// Los precios de reposición suben todas las semanas.
// Si no ajustás tus precios de venta, perdés margen.
// ==========================================================
const economia = {
  inflacionAcumulada: 0   // en porcentaje
};
 
function aplicarInflacionSemanal() {
  // Entre 4% y 9% por semana: la mercadería sube sola
  const tasa = 0.04 + Math.random() * 0.05;
  economia.inflacionAcumulada += tasa * 100;
 
  for (const p of gameState.productos) {
    p.costo = Math.round((p.costo * (1 + tasa)) / 10) * 10;
    // El precio de mercado también sube, pero un poco menos
    p.precioJusto = Math.round((p.precioJusto * (1 + tasa * 0.85)) / 10) * 10;
  }
 
  return Math.round(tasa * 100);
}
 
// ==========================================================
// EXTORSIÓN DEL POLICÍA
// Si le pagaste una coima, vuelve a pedirte mercadería gratis.
// ==========================================================
const extorsion = {
  vecesEstaSemana: 0,
  vecesQueTeNegaste: 0
};
 
 
 
 
 
 
// ==========================================================
// FIADO — cuentas por cobrar
// Enseña un concepto real: vender no es lo mismo que cobrar.
// ==========================================================
const fiado = {
  deudas: [],        // { cliente, monto, semanaFiado }
  totalFiado: 0,     // cuánto te deben en total
  cobrado: 0,        // cuánto te pagaron de vuelta
  perdido: 0         // cuánto no volvió nunca
};
 
function totalPorCobrar() {
  return fiado.deudas.reduce((acc, d) => acc + d.monto, 0);
}