import { Cliente } from '@/types';

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: '1',
    nombre: 'Israel Williams',
    telefono: '+50768674123',
    email: 'israel@example.com',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    montoSinConsumir: 3.21,
    serviciosActivos: 1,
    active: true,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '2',
    nombre: 'Jonathan Mendoza',
    telefono: '+50765432198',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    montoSinConsumir: 4.63,
    serviciosActivos: 1,
    active: true,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '3',
    nombre: 'Angeline Quintero',
    telefono: '+50767891234',
    email: 'angeline@example.com',
    metodoPagoId: '2',
    metodoPagoNombre: 'Banco Nacional - Ahorro',
    montoSinConsumir: 2.50,
    serviciosActivos: 1,
    active: true,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '4',
    nombre: 'Carlos Jiménez',
    telefono: '+50761234567',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    montoSinConsumir: 0,
    serviciosActivos: 2,
    active: true,
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '5',
    nombre: 'María López',
    telefono: '+50765987456',
    email: 'maria@example.com',
    metodoPagoId: '3',
    metodoPagoNombre: 'Binance',
    montoSinConsumir: 5.00,
    serviciosActivos: 0,
    active: true,
    createdAt: new Date('2025-02-01'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  }
];
