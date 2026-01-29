import { Revendedor } from '@/types';

export const MOCK_REVENDEDORES: Revendedor[] = [
  {
    id: '1',
    nombre: 'Pedro Distribuciones',
    telefono: '+50769876543',
    email: 'pedro@distribuciones.com',
    metodoPagoId: '2',
    metodoPagoNombre: 'Banco Nacional - Ahorro',
    comisionPorcentaje: 15,
    suscripcionesTotales: 25,
    montoTotal: 350.00,
    active: true,
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '2',
    nombre: 'Streaming Solutions',
    telefono: '+50768741259',
    email: 'contact@streamingsolutions.com',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    comisionPorcentaje: 20,
    suscripcionesTotales: 40,
    montoTotal: 580.00,
    active: true,
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  }
];
