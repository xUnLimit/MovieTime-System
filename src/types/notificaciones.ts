// ===========================
// NOTIFICACION TYPES
// ===========================

export type TipoNotificacion = 'sistema';
export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoNotificacion = '100_dias' | '11_dias' | '8_dias' | '7_dias' | '3_dias' | '2_dias' | '1_dia' | 'vencido';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  estado: EstadoNotificacion;
  clienteNombre?: string;
  diasRetraso?: number;
  fechaEvento?: Date;
  createdAt: Date;
}
