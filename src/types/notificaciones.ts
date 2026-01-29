// ===========================
// NOTIFICACION TYPES
// ===========================

export type TipoNotificacion = 'suscripcion_vencimiento' | 'pago_servicio' | 'sistema';
export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoNotificacion = '100_dias' | '11_dias' | '8_dias' | '7_dias' | '3_dias' | '2_dias' | '1_dia' | 'vencido';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  suscripcionId?: string;
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
