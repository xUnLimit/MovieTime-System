/**
 * @deprecated Use PagoVenta en su lugar. Este tipo existe para compatibilidad con código legacy.
 */
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

/**
 * Documento de pago de venta en la colección pagosVenta
 */
export interface PagoVenta {
  id: string;
  ventaId: string;                    // Referencia a la venta
  clienteId: string;                  // Denormalizado para queries
  clienteNombre: string;              // Denormalizado
  fecha: Date;                        // Fecha en que se realizó el pago
  monto: number;
  metodoPagoId?: string;              // Referencia al método de pago
  metodoPago: string;                 // Nombre del método de pago (denormalizado)
  moneda?: string;                    // Denormalizado de MetodoPago
  notas?: string;
  isPagoInicial: boolean;             // true para el primer pago
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio?: Date;                 // Fecha de inicio del periodo cubierto por este pago
  fechaVencimiento?: Date;            // Fecha de vencimiento del periodo cubierto por este pago
  createdAt: Date;
}

/**
 * Documento de venta en la colección ventas (sin array de pagos embebido)
 */
export interface VentaDoc {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo?: string;
  servicioContrasena?: string;        // Denormalizado (opcional para mostrar en detalles)
  categoriaId: string;
  categoriaNombre?: string;           // Denormalizado
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
  /** @deprecated Los pagos ahora se guardan en la colección pagosVenta */
  pagos?: VentaPago[];                // Mantener para compatibilidad pero no usar
  createdAt?: Date;
  updatedAt?: Date;
  itemId?: string;
  ventaId?: string;
}
