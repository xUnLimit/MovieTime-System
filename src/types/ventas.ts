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
  monto: number;                      // Monto final (después de descuento)
  precio?: number;                    // Precio original antes de descuento
  descuento?: number;                 // Porcentaje de descuento (0-100)
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
 * Documento de venta en la colección ventas
 *
 * ARQUITECTURA: Single Source of Truth
 * - Este documento NO almacena datos de pago (precio, descuento, fechas, etc.)
 * - Esos datos viven en la colección `pagosVenta`
 * - Para obtener datos actuales, usar `getVentaConUltimoPago()` de ventaSyncService
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
  estado?: 'activo' | 'inactivo';
  perfilNumero?: number | null;
  perfilNombre?: string;
  codigo?: string;
  notas?: string;

  // ⚠️ CAMPOS DEPRECADOS - Mantener por compatibilidad con datos existentes
  // Usar getVentaConUltimoPago() para obtener valores actuales desde pagosVenta
  /** @deprecated Leer desde PagoVenta más reciente */
  metodoPagoId?: string;
  /** @deprecated Leer desde PagoVenta más reciente */
  metodoPagoNombre?: string;
  /** @deprecated Leer desde PagoVenta más reciente */
  moneda?: string;
  /** @deprecated Leer desde PagoVenta más reciente */
  fechaInicio?: Date;
  /** @deprecated Leer desde PagoVenta más reciente */
  fechaFin?: Date;
  /** @deprecated Leer desde PagoVenta más reciente */
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  /** @deprecated Leer desde PagoVenta más reciente */
  precio?: number;
  /** @deprecated Leer desde PagoVenta más reciente */
  descuento?: number;
  /** @deprecated Leer desde PagoVenta más reciente */
  precioFinal?: number;
  /** @deprecated No usado */
  totalVenta?: number;
  /** @deprecated Los pagos ahora se guardan en la colección pagosVenta */
  pagos?: VentaPago[];

  createdAt?: Date;
  updatedAt?: Date;
  itemId?: string;
  ventaId?: string;
}
