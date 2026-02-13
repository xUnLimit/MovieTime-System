// ===========================
// COMMON TYPES
// ===========================

// Activity Log Types
export type AccionLog = 'creacion' | 'actualizacion' | 'eliminacion' | 'renovacion';
export type EntidadLog = 'cliente' | 'revendedor' | 'servicio' | 'usuario' | 'categoria' | 'metodo_pago' | 'gasto' | 'venta' | 'template';

export interface CambioLog {
  campo: string;        // Nombre del campo en español (ej: "Precio", "Estado")
  campoKey: string;     // Key técnico del campo (ej: "precio", "estado")
  anterior: unknown;    // Valor anterior
  nuevo: unknown;       // Valor nuevo
  tipo?: 'string' | 'number' | 'boolean' | 'date' | 'money' | 'object';  // Para formateo
}

export interface ActivityLog {
  id: string;
  usuarioId: string;
  usuarioEmail: string;
  accion: AccionLog;
  entidad: EntidadLog;
  entidadId: string;
  entidadNombre: string;
  detalles: string;     // Texto resumido (backward compatible)
  cambios?: CambioLog[]; // Solo presente en actualizaciones
  timestamp: Date;
}

// Configuration Types
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

// Gasto Types
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

// Template Mensaje Types
export type TipoTemplate = 'notificacion_regular' | 'dia_pago' | 'renovacion' | 'suscripcion' | 'cancelacion';

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
