import { MetodoPago } from '@/types';

export const MOCK_METODOS_PAGO: MetodoPago[] = [
  {
    id: '1',
    nombre: 'Yappy - Allan',
    tipo: 'yappy',
    pais: 'Panama',
    titular: 'Allan René Ordoñez Rodríguez',
    tipoCuenta: 'telefono',
    identificador: '67694145',
    activo: true,
    asociadoUsuarios: 45,
    asociadoServicios: 12,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '2',
    nombre: 'Banco Nacional - Ahorro',
    tipo: 'banco',
    banco: 'Banco Nacional',
    pais: 'Panama',
    titular: 'Allan René Ordoñez Rodríguez',
    tipoCuenta: 'ahorro',
    identificador: '4001946874',
    activo: true,
    asociadoUsuarios: 20,
    asociadoServicios: 5,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '3',
    nombre: 'Binance',
    tipo: 'binance',
    pais: 'Global',
    titular: 'Allan René Ordoñez Rodríguez',
    tipoCuenta: 'wallet',
    identificador: 'allan@crypto.com',
    activo: true,
    asociadoUsuarios: 8,
    asociadoServicios: 3,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '4',
    nombre: 'Efectivo',
    tipo: 'efectivo',
    pais: 'Panama',
    titular: 'N/A',
    identificador: 'N/A',
    activo: true,
    asociadoUsuarios: 5,
    asociadoServicios: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  }
];
