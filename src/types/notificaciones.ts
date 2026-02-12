/**
 * Notification Types with Discriminated Union
 *
 * Architecture:
 * - NotificacionVenta: For venta (sale) expiration notifications
 * - NotificacionServicio: For servicio (streaming service) expiration notifications
 * - Discriminator field `entidad` enables type-safe filtering and type guards
 *
 * All notification fields are DENORMALIZED to avoid additional queries:
 * - No joins needed when displaying notifications in tables
 * - Single query to notificaciones collection = complete data
 * - 50% reduction in Firebase reads vs. storing only references
 */

/**
 * Base interface with common fields for all notifications
 */
export interface NotificacionBase {
  id: string;
  tipo: 'sistema'; // For future extensibility (could add 'user' type)
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  titulo: string; // Generated: "Venta vence en 15 días" or "Servicio Netflix vence en 2 días"
  leida: boolean; // Read status
  resaltada: boolean; // Highlighted/starred for priority actions
  diasRestantes: number; // Can be negative if expired
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Notification for venta (sale) expiration
 *
 * Denormalized fields from VentaDoc + PagoVenta:
 * - Avoids joins when displaying VentasProximasTableV2
 * - Updated daily by notificationSyncService
 * - All fields needed for table display are included
 */
export interface NotificacionVenta extends NotificacionBase {
  entidad: 'venta'; // Discriminator: helps TypeScript narrow union types

  // References (for identification and filtering)
  ventaId: string;
  clienteId: string;
  servicioId: string;

  // Denormalized from VentaDoc
  clienteNombre: string; // For display in table
  servicioNombre: string; // Name of streaming service (Netflix, Disney+, etc.)
  categoriaNombre: string; // Category name
  perfilNombre?: string; // Profile name (optional, for shared accounts)
  estado: 'activo' | 'inactivo';

  // Denormalized from PagoVenta (most recent)
  cicloPago: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio: Date; // Start of current payment period
  fechaFin: Date; // Expiration date
  precioFinal?: number; // Final price after discount
}

/**
 * Notification for servicio (streaming service) expiration
 *
 * Denormalized fields from Servicio document:
 * - Avoids joins when displaying ServiciosProximosTableV2
 * - Updated daily by notificationSyncService
 * - All fields needed for table display are included
 */
export interface NotificacionServicio extends NotificacionBase {
  entidad: 'servicio'; // Discriminator: helps TypeScript narrow union types

  // References
  servicioId: string;
  categoriaId: string;

  // Denormalized from Servicio
  servicioNombre: string; // Name of the streaming service
  categoriaNombre: string; // Category name
  tipoServicio: 'cuenta_completa' | 'perfiles'; // Service type
  metodoPagoNombre: string; // Payment method name
  moneda: string; // Currency (USD, TRY, ARS, etc.)
  costoServicio: number; // Service cost
  cicloPago: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaVencimiento: Date; // Expiration date
}

/**
 * Union type: Notifications can be either venta or servicio
 * Use type guards (esNotificacionVenta, esNotificacionServicio) to narrow
 */
export type Notificacion = NotificacionVenta | NotificacionServicio;

/**
 * Type guard: Check if notification is for a venta
 * @example
 * if (esNotificacionVenta(notif)) {
 *   console.log(notif.clienteNombre); // TypeScript knows this property exists
 * }
 */
export function esNotificacionVenta(n: Notificacion): n is NotificacionVenta {
  return n.entidad === 'venta';
}

/**
 * Type guard: Check if notification is for a servicio
 * @example
 * if (esNotificacionServicio(notif)) {
 *   console.log(notif.metodoPagoNombre); // TypeScript knows this property exists
 * }
 */
export function esNotificacionServicio(n: Notificacion): n is NotificacionServicio {
  return n.entidad === 'servicio';
}

/**
 * Helper: Filter notifications by entity type
 * @example
 * const ventasNotifs = notificaciones.filter(notificacionesVenta);
 */
export const notificacionesVenta = (n: Notificacion): n is NotificacionVenta =>
  esNotificacionVenta(n);

/**
 * Helper: Filter notifications by entity type
 * @example
 * const serviciosNotifs = notificaciones.filter(notificacionesServicio);
 */
export const notificacionesServicio = (n: Notificacion): n is NotificacionServicio =>
  esNotificacionServicio(n);
