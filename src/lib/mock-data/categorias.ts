import { Categoria } from '@/types';

export const MOCK_CATEGORIAS: Categoria[] = [
  {
    id: '1',
    nombre: 'Netflix',
    tipo: 'ambos',
    iconUrl: '/icons/netflix.svg',
    color: '#E50914',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '2',
    nombre: 'Disney Plus',
    tipo: 'cliente',
    iconUrl: '/icons/disney.svg',
    color: '#0063E5',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '3',
    nombre: 'Spotify',
    tipo: 'ambos',
    iconUrl: '/icons/spotify.svg',
    color: '#1DB954',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '4',
    nombre: 'Crunchyroll',
    tipo: 'cliente',
    iconUrl: '/icons/crunchyroll.svg',
    color: '#F47521',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '5',
    nombre: 'YouTube Premium',
    tipo: 'ambos',
    iconUrl: '/icons/youtube.svg',
    color: '#FF0000',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '6',
    nombre: 'Prime Video',
    tipo: 'cliente',
    iconUrl: '/icons/prime.svg',
    color: '#00A8E1',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  },
  {
    id: '7',
    nombre: 'HBO Max',
    tipo: 'cliente',
    iconUrl: '/icons/hbo.svg',
    color: '#9B4DCA',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  }
];
