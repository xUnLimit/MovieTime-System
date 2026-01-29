import { Configuracion } from '@/types';

export const MOCK_CONFIGURACION: Configuracion = {
  id: 'global',
  tasasCambio: {
    USD_PAB: 1.0,
    USD_EUR: 0.92,
    USD_NGN: 1580.0,
    ultimaActualizacion: new Date('2026-01-28')
  },
  notificaciones: {
    diasAntes: [100, 11, 8, 7, 3, 2, 1],
    horaEnvio: 8
  },
  whatsapp: {
    prefijoTelefono: '+507'
  },
  updatedAt: new Date('2026-01-28')
};
