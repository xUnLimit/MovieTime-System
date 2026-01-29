import { ActivityLog } from '@/types';

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: '1',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'creacion',
    entidad: 'suscripcion',
    entidadId: '1',
    entidadNombre: 'Spotify - Israel Williams',
    detalles: 'Suscripción creada por $4.00 USD',
    timestamp: new Date('2026-01-22T10:30:00')
  },
  {
    id: '2',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'renovacion',
    entidad: 'suscripcion',
    entidadId: '2',
    entidadNombre: 'Netflix - Jonathan Mendoza',
    detalles: 'Suscripción renovada - Renovación #1',
    timestamp: new Date('2026-01-15T14:15:00')
  },
  {
    id: '3',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'creacion',
    entidad: 'cliente',
    entidadId: '5',
    entidadNombre: 'María López',
    detalles: 'Nuevo cliente registrado',
    timestamp: new Date('2025-02-01T09:00:00')
  },
  {
    id: '4',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'actualizacion',
    entidad: 'servicio',
    entidadId: '1',
    entidadNombre: 'Spotify - Familiar',
    detalles: 'Perfil ocupado actualizado: 5/6',
    timestamp: new Date('2026-01-22T10:31:00')
  }
];
