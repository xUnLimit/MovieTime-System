// ===========================
// NOTIFICACION TYPES
// ===========================

export type TipoNotificacion = 'sistema';
export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'critica';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: Date;
}
