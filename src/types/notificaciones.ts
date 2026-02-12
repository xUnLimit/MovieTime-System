// ===========================
// NOTIFICACION TYPES
// ===========================

export type TipoNotificacion = 'sistema';
export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'critica';

/**
 * @deprecated No longer used in v2.1. Use diasRestantes field instead.
 */
export type EstadoNotificacion = '100_dias' | '11_dias' | '8_dias' | '7_dias' | '3_dias' | '2_dias' | '1_dia' | 'vencido';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;          // "Venta vence en 15 días" | "Servicio vence en 2 días" | "Venta vencida (2 días)"
  mensaje: string;         // "Juan Pérez - Netflix"
  leida: boolean;          // Toggle por click en ícono
  resaltada: boolean;      // ✅ NUEVO v2.1: Marcada manualmente para seguimiento prioritario

  // Referencias (mutuamente exclusivas)
  ventaId?: string;        // Si es notificación de venta
  servicioId?: string;     // Si es notificación de servicio

  // Metadata
  diasRestantes: number;   // Número exacto de días restantes (puede ser negativo)
  fechaEvento: Date;       // Fecha de vencimiento de la venta/servicio

  // Campos legacy (mantener para compatibilidad con datos existentes)
  /**
   * @deprecated Use ventaId/servicioId instead
   */
  estado?: EstadoNotificacion;
  /**
   * @deprecated No longer used
   */
  clienteNombre?: string;
  /**
   * @deprecated Use diasRestantes instead
   */
  diasRetraso?: number;

  // Audit
  createdAt: Date;
  updatedAt?: Date;        // Se actualiza CADA DÍA durante la sincronización
}
