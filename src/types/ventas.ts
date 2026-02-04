export interface VentaDoc {
  id: string;
  clienteNombre: string;
  metodoPagoNombre: string;
  moneda: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado?: 'activo' | 'inactivo';
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  categoriaId: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo: string;
  perfilNumero?: number | null;
  precio: number;
  descuento: number;
  precioFinal: number;
  totalVenta?: number;
}
