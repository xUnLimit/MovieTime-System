import { Notificacion } from '@/types';

export const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: '1',
    tipo: 'suscripcion_vencimiento',
    prioridad: 'critica',
    suscripcionId: '3',
    clienteId: '3',
    clienteNombre: 'Angeline Quintero',
    titulo: 'Suscripción vencida',
    mensaje: 'La suscripción de Crunchyroll para Angeline Quintero lleva 105 días vencida',
    diasRetraso: 105,
    estado: '100_dias',
    leida: false,
    fechaEvento: new Date('2025-10-15'),
    createdAt: new Date('2026-01-28')
  },
  {
    id: '2',
    tipo: 'suscripcion_vencimiento',
    prioridad: 'alta',
    suscripcionId: '4',
    clienteId: '4',
    clienteNombre: 'Carlos Jiménez',
    titulo: 'Suscripción próxima a vencer',
    mensaje: 'La suscripción de Disney Plus para Carlos Jiménez vence en 11 días',
    diasRetraso: 11,
    estado: '11_dias',
    leida: false,
    fechaEvento: new Date('2026-02-10'),
    createdAt: new Date('2026-01-28')
  },
  {
    id: '3',
    tipo: 'pago_servicio',
    prioridad: 'media',
    titulo: 'Renovación de servicio próxima',
    mensaje: 'El servicio Netflix - Premium se renovará en 13 días',
    estado: '11_dias',
    leida: true,
    fechaEvento: new Date('2026-02-10'),
    createdAt: new Date('2026-01-27')
  }
];
