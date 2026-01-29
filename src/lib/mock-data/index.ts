import { DashboardMetrics } from '@/types';

// Re-export all mock data from separate entity files
export * from './categorias';
export * from './metodos-pago';
export * from './clientes';
export * from './revendedores';
export * from './servicios';
export * from './suscripciones';
export * from './notificaciones';
export * from './templates';
export * from './activity-log';
export * from './config';

// Import for helper functions
import { MOCK_CATEGORIAS } from './categorias';
import { MOCK_CLIENTES } from './clientes';
import { MOCK_REVENDEDORES } from './revendedores';
import { MOCK_SERVICIOS } from './servicios';
import { MOCK_SUSCRIPCIONES } from './suscripciones';

// ===========================
// HELPER FUNCTIONS
// ===========================

export function calculateDashboardMetrics(): DashboardMetrics {
  const gastosTotal = MOCK_SERVICIOS.reduce((sum, s) => sum + s.costoTotal, 0);
  const ingresosTotal = MOCK_SUSCRIPCIONES.filter(v => v.estado === 'activa').reduce((sum, v) => sum + v.monto, 0);
  const gananciasTotal = ingresosTotal - gastosTotal;

  const clientesActivos = MOCK_CLIENTES.filter(c => c.active).length;
  const revendedoresActivos = MOCK_REVENDEDORES.filter(r => r.active).length;
  const serviciosActivos = MOCK_SERVICIOS.filter(s => s.activo).length;
  const suscripcionesActivas = MOCK_SUSCRIPCIONES.filter(v => v.estado === 'activa').length;

  return {
    gastosTotal,
    ingresosTotal,
    gananciasTotal,
    gastoMensualEsperado: gastosTotal,
    ingresoMensualEsperado: ingresosTotal * 1.2,
    clientesActivos,
    revendedoresActivos,
    serviciosActivos,
    suscripcionesActivas
  };
}

export function getMetricasPorCategoria() {
  const metricas = MOCK_CATEGORIAS.map(categoria => {
    const servicios = MOCK_SERVICIOS.filter(s => s.categoriaId === categoria.id);
    const suscripciones = MOCK_SUSCRIPCIONES.filter(v => v.categoriaId === categoria.id && v.estado === 'activa');

    const gastos = servicios.reduce((sum, s) => sum + s.costoTotal, 0);
    const ingresos = suscripciones.reduce((sum, v) => sum + v.monto, 0);
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
