export interface VentaPago {
  id?: string;
  fecha?: Date | null;
  descripcion: string;
  precio: number;
  descuento: number;
  total: number;
  metodoPagoId?: string | null;
  metodoPagoNombre?: string;
  moneda?: string;
  isPagoInicial?: boolean;
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual' | null;
  fechaInicio?: Date | null;
  fechaVencimiento?: Date | null;
  notas?: string;
}

export interface VentaDoc {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo?: string;
  categoriaId: string;
  metodoPagoId?: string;
  metodoPagoNombre: string;
  moneda: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado?: 'activo' | 'inactivo';
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  perfilNumero?: number | null;
  perfilNombre?: string;
  codigo?: string;
  notas?: string;
  precio: number;
  descuento: number;
  precioFinal: number;
  totalVenta?: number;
  pagos?: VentaPago[];
  createdAt?: Date;
  updatedAt?: Date;
  itemId?: string;
  ventaId?: string;
}
