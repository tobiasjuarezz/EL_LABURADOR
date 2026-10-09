
// ==========================================================
// ESTADO DEL JUEGO
// Todo lo que cambia durante la partida vive acá.
// Tenerlo centralizado facilita leerlo y guardarlo después.
// ==========================================================
 
const gameState = {
  // --- Tiempo ---
  semanaActual: 1,
  totalSemanas: 8,
  diaActual: 1,
  diasPorSemana: 7,
 
  // --- Economía ---
  metaFianza: 50000,
  caja: 2200,
  alquilerSemanal: 3500,
  luzSemanal: 1200,
  deudaAcumulada: 0,
 
  // --- Ventas ---
  ventasDelDia: 0,
  ventasDeLaSemana: 0,
  clientesAtendidosHoy: 0,
 
  // --- Estado del jugador ---
  estres: 0,
 
  // --- Catálogo de productos ---
  productos: [
    { id: 'alfajor',   nombre: 'Alfajor',      costo: 350,  precioJusto: 700,  precio: 700,  stock: 2, demandaBase: 9  },
    { id: 'chocolate', nombre: 'Chocolate',    costo: 500,  precioJusto: 950,  precio: 950,  stock: 1, demandaBase: 7  },
    { id: 'chicles',   nombre: 'Chicles',      costo: 150,  precioJusto: 350,  precio: 350,  stock: 3, demandaBase: 12 },
    { id: 'gaseosa',   nombre: 'Gaseosa',      costo: 600,  precioJusto: 1200, precio: 1200, stock: 1, demandaBase: 6  },
    { id: 'agua',      nombre: 'Agua',         costo: 400,  precioJusto: 800,  precio: 800,  stock: 2, demandaBase: 8  },
    { id: 'jugo',      nombre: 'Jugo',         costo: 450,  precioJusto: 900,  precio: 900,  stock: 1, demandaBase: 7  },
    { id: 'papas',     nombre: 'Papas fritas', costo: 700,  precioJusto: 1400, precio: 1400, stock: 0, demandaBase: 5  },
    { id: 'palitos',   nombre: 'Palitos',      costo: 550,  precioJusto: 1100, precio: 1100, stock: 1, demandaBase: 6  }
  ]
};
 
const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
 
function nombreDiaActual() {
  return NOMBRES_DIA[(gameState.diaActual - 1) % 7];
}
 
// ==========================================================
// ESTADO DE LOS TRES CAMINOS
// ==========================================================
const caminos = {
  // Camino 1: el capo
  pagaProteccion: false,
  confianzaCapo: 0,
  atrasosCapo: 0,
  montoProteccion: 2500,
 
  // Camino 2: el abogado
  delato: false,
  semanaDelacion: null,
  abogadoOfrecido: false,
 
  // Camino 3: la policía
  vecesPolicia: 0,
  seNegoACoima: false,
  clausurado: 0,
 
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
 
 
// ==========================================================
// LÍMITE DE CLIENTES POR DÍA
// El día se acaba solo: no podés atender infinito.
// ==========================================================
const CLIENTES_POR_DIA = 15;
 
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