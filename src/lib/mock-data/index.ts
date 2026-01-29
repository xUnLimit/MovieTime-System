import {
  Cliente,
  Revendedor,
  Servicio,
  Venta,
  Categoria,
  MetodoPago,
  Gasto,
  Notificacion,
  TemplateMensaje,
  ActivityLog,
  Configuracion,
  DashboardMetrics
} from '@/types';

// ===========================
// CATEGORIAS MOCK DATA
// ===========================

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
    nombre: 'Max',
    tipo: 'revendedor',
    iconUrl: '/icons/max.svg',
    color: '#0033FF',
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: '1'
  }
];

// ===========================
// METODOS PAGO MOCK DATA
// ===========================

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

// ===========================
// CLIENTES MOCK DATA
// ===========================

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

// ===========================
// REVENDEDORES MOCK DATA
// ===========================

export const MOCK_REVENDEDORES: Revendedor[] = [
  {
    id: '1',
    nombre: 'Pedro Distribuciones',
    telefono: '+50769876543',
    email: 'pedro@distribuciones.com',
    metodoPagoId: '2',
    metodoPagoNombre: 'Banco Nacional - Ahorro',
    comisionPorcentaje: 15,
    ventasTotales: 25,
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
    ventasTotales: 40,
    montoTotal: 580.00,
    active: true,
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  }
];

// ===========================
// SERVICIOS MOCK DATA
// ===========================

export const MOCK_SERVICIOS: Servicio[] = [
  {
    id: '1',
    categoriaId: '3',
    categoriaNombre: 'Spotify',
    nombre: 'Spotify - Familiar',
    tipo: 'familiar',
    correo: 'SpotifySrvCliente10@gmail.com',
    contrasena: 'Password123!',
    perfilesDisponibles: 6,
    perfilesOcupados: 5,
    costoPorPerfil: 4.00,
    costoTotal: 24.00,
    activo: true,
    renovacionAutomatica: true,
    fechaRenovacion: new Date('2026-02-15'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '2',
    categoriaId: '1',
    categoriaNombre: 'Netflix',
    nombre: 'Netflix - Premium',
    tipo: 'familiar',
    correo: 'netflix.premium01@gmail.com',
    contrasena: 'NetPass456!',
    perfilesDisponibles: 4,
    perfilesOcupados: 3,
    costoPorPerfil: 5.00,
    costoTotal: 20.00,
    activo: true,
    renovacionAutomatica: true,
    fechaRenovacion: new Date('2026-02-10'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '3',
    categoriaId: '4',
    categoriaNombre: 'Crunchyroll',
    nombre: 'Crunchyroll - Mega Fan',
    tipo: 'individual',
    correo: 'crunchyroll.fan@gmail.com',
    contrasena: 'AnimePass789!',
    perfilesDisponibles: 1,
    perfilesOcupados: 1,
    costoPorPerfil: 8.00,
    costoTotal: 8.00,
    activo: true,
    renovacionAutomatica: false,
    fechaRenovacion: new Date('2026-03-01'),
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '4',
    categoriaId: '2',
    categoriaNombre: 'Disney Plus',
    nombre: 'Disney Plus - Familiar',
    tipo: 'familiar',
    correo: 'disney.family@gmail.com',
    contrasena: 'Disney2024!',
    perfilesDisponibles: 7,
    perfilesOcupados: 4,
    costoPorPerfil: 3.50,
    costoTotal: 14.00,
    activo: true,
    renovacionAutomatica: true,
    fechaRenovacion: new Date('2026-02-20'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '5',
    categoriaId: '5',
    categoriaNombre: 'YouTube Premium',
    nombre: 'YouTube Premium - Familiar',
    tipo: 'familiar',
    correo: 'youtube.premium@gmail.com',
    contrasena: 'YtPass123!',
    perfilesDisponibles: 5,
    perfilesOcupados: 2,
    costoPorPerfil: 4.50,
    costoTotal: 22.50,
    activo: true,
    renovacionAutomatica: true,
    fechaRenovacion: new Date('2026-02-25'),
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  }
];

// ===========================
// VENTAS MOCK DATA
// ===========================

export const MOCK_VENTAS: Venta[] = [
  {
    id: '1',
    clienteId: '1',
    clienteNombre: 'Israel Williams',
    tipo: 'cliente',
    servicioId: '1',
    servicioNombre: 'Spotify - Familiar',
    categoriaId: '3',
    categoriaNombre: 'Spotify',
    correo: 'SpotifySrvCliente10@gmail.com',
    contrasena: 'Password123!',
    monto: 4.00,
    moneda: 'USD',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    cicloPago: 'mensual',
    fechaInicio: new Date('2026-01-22'),
    fechaVencimiento: new Date('2026-02-22'),
    renovaciones: 0,
    consumoPorcentaje: 20,
    montoRestante: 3.20,
    estado: 'activa',
    notificado: false,
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '2',
    clienteId: '2',
    clienteNombre: 'Jonathan Mendoza',
    tipo: 'cliente',
    servicioId: '2',
    servicioNombre: 'Netflix - Premium',
    categoriaId: '1',
    categoriaNombre: 'Netflix',
    correo: 'netflix.premium01@gmail.com',
    contrasena: 'NetPass456!',
    monto: 5.00,
    moneda: 'USD',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    cicloPago: 'mensual',
    fechaInicio: new Date('2026-01-15'),
    fechaVencimiento: new Date('2026-02-15'),
    renovaciones: 1,
    consumoPorcentaje: 45,
    montoRestante: 2.75,
    estado: 'activa',
    notificado: false,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '3',
    clienteId: '3',
    clienteNombre: 'Angeline Quintero',
    tipo: 'cliente',
    servicioId: '3',
    servicioNombre: 'Crunchyroll - Mega Fan',
    categoriaId: '4',
    categoriaNombre: 'Crunchyroll',
    correo: 'crunchyroll.fan@gmail.com',
    contrasena: 'AnimePass789!',
    monto: 8.00,
    moneda: 'USD',
    metodoPagoId: '2',
    metodoPagoNombre: 'Banco Nacional - Ahorro',
    cicloPago: 'mensual',
    fechaInicio: new Date('2025-09-15'),
    fechaVencimiento: new Date('2025-10-15'),
    renovaciones: 4,
    consumoPorcentaje: 100,
    montoRestante: 0,
    estado: 'vencida',
    notificado: true,
    diasRetraso: 105,
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '4',
    clienteId: '4',
    clienteNombre: 'Carlos Jiménez',
    tipo: 'cliente',
    servicioId: '4',
    servicioNombre: 'Disney Plus - Familiar',
    categoriaId: '2',
    categoriaNombre: 'Disney Plus',
    correo: 'disney.family@gmail.com',
    contrasena: 'Disney2024!',
    monto: 3.50,
    moneda: 'USD',
    metodoPagoId: '1',
    metodoPagoNombre: 'Yappy - Allan',
    cicloPago: 'mensual',
    fechaInicio: new Date('2026-01-10'),
    fechaVencimiento: new Date('2026-02-10'),
    renovaciones: 0,
    consumoPorcentaje: 60,
    montoRestante: 1.40,
    estado: 'activa',
    notificado: false,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  },
  {
    id: '5',
    revendedorId: '1',
    revendedorNombre: 'Pedro Distribuciones',
    tipo: 'revendedor',
    servicioId: '5',
    servicioNombre: 'YouTube Premium - Familiar',
    categoriaId: '5',
    categoriaNombre: 'YouTube Premium',
    correo: 'youtube.premium@gmail.com',
    contrasena: 'YtPass123!',
    monto: 4.50,
    moneda: 'USD',
    metodoPagoId: '2',
    metodoPagoNombre: 'Banco Nacional - Ahorro',
    cicloPago: 'mensual',
    fechaInicio: new Date('2026-01-20'),
    fechaVencimiento: new Date('2026-02-20'),
    renovaciones: 0,
    consumoPorcentaje: 25,
    montoRestante: 3.375,
    estado: 'activa',
    notificado: false,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-28'),
    createdBy: '1'
  }
];

// ===========================
// NOTIFICACIONES MOCK DATA
// ===========================

export const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: '1',
    tipo: 'venta_vencimiento',
    prioridad: 'critica',
    ventaId: '3',
    clienteId: '3',
    clienteNombre: 'Angeline Quintero',
    titulo: 'Venta vencida',
    mensaje: 'La venta de Crunchyroll para Angeline Quintero lleva 105 días vencida',
    diasRetraso: 105,
    estado: '100_dias',
    leida: false,
    fechaEvento: new Date('2025-10-15'),
    createdAt: new Date('2026-01-28')
  },
  {
    id: '2',
    tipo: 'venta_vencimiento',
    prioridad: 'alta',
    ventaId: '4',
    clienteId: '4',
    clienteNombre: 'Carlos Jiménez',
    titulo: 'Venta próxima a vencer',
    mensaje: 'La venta de Disney Plus para Carlos Jiménez vence en 11 días',
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

// ===========================
// TEMPLATES MENSAJES MOCK DATA
// ===========================

export const MOCK_TEMPLATES: TemplateMensaje[] = [
  {
    id: '1',
    nombre: 'Notificación Regular',
    tipo: 'notificacion_regular',
    contenido: '{saludo} {cliente},\n\nTe recordamos que tu servicio de {categoria} vence el {vencimiento}.\n\nDatos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}\n\nMonto: ${monto}\n\n¡Gracias por tu preferencia!',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{correo}', '{contrasena}', '{vencimiento}', '{monto}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '2',
    nombre: 'Notificación Día de Pago',
    tipo: 'dia_pago',
    contenido: '{saludo} {cliente},\n\n¡Hoy es el día de renovación de tu servicio de {categoria}!\n\nPor favor realiza el pago de ${monto} para mantener tu servicio activo.\n\nDatos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{monto}', '{correo}', '{contrasena}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '3',
    nombre: 'Nueva Venta',
    tipo: 'venta',
    contenido: '{saludo} {cliente},\n\n¡Gracias por tu compra!\n\nServicio: {categoria}\nMonto pagado: ${monto}\nVence: {vencimiento}\n\nTus datos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}\n\n¡Disfruta tu servicio!',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{monto}', '{vencimiento}', '{correo}', '{contrasena}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];

// ===========================
// CONFIGURACION MOCK DATA
// ===========================

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

// ===========================
// ACTIVITY LOG MOCK DATA
// ===========================

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: '1',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'creacion',
    entidad: 'venta',
    entidadId: '1',
    entidadNombre: 'Spotify - Israel Williams',
    detalles: 'Venta creada por $4.00 USD',
    timestamp: new Date('2026-01-22T10:30:00')
  },
  {
    id: '2',
    usuarioId: '1',
    usuarioEmail: 'admin@movietime.com',
    accion: 'renovacion',
    entidad: 'venta',
    entidadId: '2',
    entidadNombre: 'Netflix - Jonathan Mendoza',
    detalles: 'Venta renovada - Renovación #1',
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

// ===========================
// HELPER FUNCTIONS
// ===========================

export function calculateDashboardMetrics(): DashboardMetrics {
  const gastosTotal = MOCK_SERVICIOS.reduce((sum, s) => sum + s.costoTotal, 0);
  const ingresosTotal = MOCK_VENTAS.filter(v => v.estado === 'activa').reduce((sum, v) => sum + v.monto, 0);
  const gananciasTotal = ingresosTotal - gastosTotal;

  const clientesActivos = MOCK_CLIENTES.filter(c => c.active).length;
  const revendedoresActivos = MOCK_REVENDEDORES.filter(r => r.active).length;
  const serviciosActivos = MOCK_SERVICIOS.filter(s => s.activo).length;
  const ventasActivas = MOCK_VENTAS.filter(v => v.estado === 'activa').length;

  return {
    gastosTotal,
    ingresosTotal,
    gananciasTotal,
    gastoMensualEsperado: gastosTotal,
    ingresoMensualEsperado: ingresosTotal * 1.2,
    clientesActivos,
    revendedoresActivos,
    serviciosActivos,
    ventasActivas
  };
}

export function getMetricasPorCategoria() {
  const metricas = MOCK_CATEGORIAS.map(categoria => {
    const servicios = MOCK_SERVICIOS.filter(s => s.categoriaId === categoria.id);
    const ventas = MOCK_VENTAS.filter(v => v.categoriaId === categoria.id && v.estado === 'activa');

    const gastos = servicios.reduce((sum, s) => sum + s.costoTotal, 0);
    const ingresos = ventas.reduce((sum, v) => sum + v.monto, 0);
    const ganancias = ingresos - gastos;
    const rentabilidad = gastos > 0 ? (ganancias / gastos) * 100 : 0;

    return {
      categoriaId: categoria.id,
      categoriaNombre: categoria.nombre,
      ingresos,
      gastos,
      ganancias,
      rentabilidad
    };
  });

  return metricas.filter(m => m.ingresos > 0 || m.gastos > 0);
}
