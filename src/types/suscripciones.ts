// ===========================
// SUSCRIPCION TYPES
// ===========================

export type CicloPago = 'mensual' | 'trimestral' | 'anual';
export type EstadoSuscripcion = 'activa' | 'suspendida' | 'inactiva' | 'vencida';
export type TipoSuscripcion = 'cliente' | 'revendedor';

export interface Suscripcion {
  id: string;
  clienteId?: string;
  clienteNombre?: string;
  revendedorId?: string;
  revendedorNombre?: string;
  tipo: TipoSuscripcion;

  servicioId: string;
  servicioNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  correo: string;
  contrasena: string;

  monto: number;
  moneda: 'USD' | 'PAB';
  metodoPagoId: string;
  metodoPagoNombre?: string;

  cicloPago: CicloPago;
  fechaInicio: Date;
  fechaVencimiento: Date;
  renovaciones: number;

  consumoPorcentaje: number;
  montoRestante: number;

  estado: EstadoSuscripcion;
  notificado: boolean;
  diasRetraso?: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Form Types
export interface SuscripcionFormData {
  tipo: TipoSuscripcion;
  clienteId?: string;
  revendedorId?: string;
  servicioId: string;
  monto: number;
  moneda: 'USD' | 'PAB';
  metodoPagoId: string;
  cicloPago: CicloPago;
  fechaInicio: Date;
}
