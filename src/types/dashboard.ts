// ===========================
// DASHBOARD METRICS TYPES
// ===========================

export interface DashboardMetrics {
  gastosTotal: number;
  ingresosTotal: number;
  gananciasTotal: number;
  gastoMensualEsperado: number;
  ingresoMensualEsperado: number;
  clientesActivos: number;
  revendedoresActivos: number;
  serviciosActivos: number;
  suscripcionesActivas: number;
}

export interface MetricaPorCategoria {
  categoriaId: string;
  categoriaNombre: string;
  ingresos: number;
  gastos: number;
  ganancias: number;
  rentabilidad: number;
}

export interface PronosticoMensual {
  mes: string;
  ingresos: number;
  gastos: number;
  ganancias: number;
}
