// ===========================
// USER & AUTH TYPES
// ===========================

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operador';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// CLIENTE & REVENDEDOR TYPES
// ===========================

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  montoSinConsumir: number;
  serviciosActivos: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Revendedor {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  comisionPorcentaje: number;
  ventasTotales: number;
  montoTotal: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ===========================
// CATEGORIA TYPES
// ===========================

export interface Categoria {
  id: string;
  nombre: string;
  tipo: 'cliente' | 'revendedor' | 'ambos';
  iconUrl?: string;
  color?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ===========================
// SERVICIO TYPES
// ===========================

export interface Servicio {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  tipo: 'individual' | 'familiar';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  perfilesOcupados: number;
  costoPorPerfil: number;
  costoTotal: number;
  activo: boolean;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ===========================
// VENTA TYPES
// ===========================

export type CicloPago = 'mensual' | 'trimestral' | 'anual';
export type EstadoVenta = 'activa' | 'suspendida' | 'inactiva' | 'vencida';
export type TipoVenta = 'cliente' | 'revendedor';

export interface Venta {
  id: string;
  clienteId?: string;
  clienteNombre?: string;
  revendedorId?: string;
  revendedorNombre?: string;
  tipo: TipoVenta;

  servicioId: string;
  servicioNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  correo: string;
  contrasena: string;

  monto: number;
  moneda: 'USD' | 'PAB';
  metodoPagoId: string;
  metodoPagoNombre?: string;

  cicloPago: CicloPago;
  fechaInicio: Date;
  fechaVencimiento: Date;
  renovaciones: number;

  consumoPorcentaje: number;
  montoRestante: number;

  estado: EstadoVenta;
  notificado: boolean;
  diasRetraso?: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ===========================
// METODO PAGO TYPES
// ===========================

export type TipoMetodoPago = 'banco' | 'yappy' | 'paypal' | 'binance' | 'efectivo';
export type TipoCuenta = 'ahorro' | 'corriente' | 'wallet' | 'telefono';

export interface MetodoPago {
  id: string;
  nombre: string;
  tipo: TipoMetodoPago;
  banco?: string;
  pais: string;
  titular: string;
  tipoCuenta?: TipoCuenta;
  identificador: string;
  activo: boolean;
  asociadoUsuarios: number;
  asociadoServicios: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ===========================
// GASTO TYPES
// ===========================

export type MonedaGasto = 'USD' | 'PAB' | 'EUR' | 'NGN';
export type TipoPago = 'recurrente' | 'unico';
export type FrecuenciaPago = 'semanal' | 'mensual' | 'anual';

export interface Gasto {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  servicioId?: string;
  servicioNombre?: string;
  descripcion: string;
  monto: number;
  monedaOriginal: MonedaGasto;
  montoUSD: number;
  tasaCambio: number;
  tipoPago: TipoPago;
  frecuencia?: FrecuenciaPago;
  fechaPago: Date;
  proximoPago?: Date;
  pagado: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ===========================
// NOTIFICACION TYPES
// ===========================

export type TipoNotificacion = 'venta_vencimiento' | 'pago_servicio' | 'sistema';
export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoNotificacion = '100_dias' | '11_dias' | '8_dias' | '7_dias' | '3_dias' | '2_dias' | '1_dia' | 'vencido';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  ventaId?: string;
  clienteId?: string;
  clienteNombre?: string;
  titulo: string;
  mensaje: string;
  diasRetraso?: number;
  estado: EstadoNotificacion;
  leida: boolean;
  fechaEvento: Date;
  createdAt: Date;
}

// ===========================
// TEMPLATE MENSAJE TYPES
// ===========================

export type TipoTemplate = 'notificacion_regular' | 'dia_pago' | 'renovacion' | 'venta' | 'cancelacion';

export interface TemplateMensaje {
  id: string;
  nombre: string;
  tipo: TipoTemplate;
  contenido: string;
  placeholders: string[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// ACTIVITY LOG TYPES
// ===========================

export type AccionLog = 'creacion' | 'actualizacion' | 'eliminacion' | 'renovacion';
export type EntidadLog = 'venta' | 'cliente' | 'revendedor' | 'servicio' | 'usuario' | 'categoria' | 'metodo_pago' | 'gasto';

export interface ActivityLog {
  id: string;
  usuarioId: string;
  usuarioEmail: string;
  accion: AccionLog;
  entidad: EntidadLog;
  entidadId: string;
  entidadNombre: string;
  detalles: string;
  timestamp: Date;
}

// ===========================
// CONFIGURACION TYPES
// ===========================

export interface TasasCambio {
  USD_PAB: number;
  USD_EUR: number;
  USD_NGN: number;
  ultimaActualizacion: Date;
}

export interface ConfiguracionNotificaciones {
  diasAntes: number[];
  horaEnvio: number;
}

export interface ConfiguracionWhatsApp {
  prefijoTelefono: string;
}

export interface Configuracion {
  id: 'global';
  tasasCambio: TasasCambio;
  notificaciones: ConfiguracionNotificaciones;
  whatsapp: ConfiguracionWhatsApp;
  updatedAt: Date;
}

// ===========================
// DASHBOARD METRICS TYPES
// ===========================

export interface DashboardMetrics {
  gastosTotal: number;
  ingresosTotal: number;
  gananciasTotal: number;
  gastoMensualEsperado: number;
  ingresoMensualEsperado: number;
  clientesActivos: number;
  revendedoresActivos: number;
  serviciosActivos: number;
  ventasActivas: number;
}

export interface MetricaPorCategoria {
  categoriaId: string;
  categoriaNombre: string;
  ingresos: number;
  gastos: number;
  ganancias: number;
  rentabilidad: number;
}

export interface PronosticoMensual {
  mes: string;
  ingresos: number;
  gastos: number;
  ganancias: number;
}

// ===========================
// WHATSAPP TYPES
// ===========================

export interface WhatsAppData {
  cliente: string;
  categoria: string;
  correo: string;
  contrasena: string;
  vencimiento: string;
  monto: string;
  diasRetraso?: number;
}

// ===========================
// FORM TYPES
// ===========================

export interface ClienteFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
}

export interface RevendedorFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  comisionPorcentaje: number;
}

export interface ServicioFormData {
  categoriaId: string;
  nombre: string;
  tipo: 'individual' | 'familiar';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  costoPorPerfil: number;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
}

export interface VentaFormData {
  tipo: TipoVenta;
  clienteId?: string;
  revendedorId?: string;
  servicioId: string;
  monto: number;
  moneda: 'USD' | 'PAB';
  metodoPagoId: string;
  cicloPago: CicloPago;
  fechaInicio: Date;
}

export interface GastoFormData {
  categoriaId: string;
  servicioId?: string;
  descripcion: string;
  monto: number;
  monedaOriginal: MonedaGasto;
  tipoPago: TipoPago;
  frecuencia?: FrecuenciaPago;
  fechaPago: Date;
}
