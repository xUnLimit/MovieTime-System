// ===========================
// METODO PAGO TYPES
// ===========================

export type TipoMetodoPago = 'banco' | 'yappy' | 'paypal' | 'binance' | 'efectivo';
export type TipoCuenta = 'ahorro' | 'corriente' | 'wallet' | 'telefono';

export interface MetodoPago {
  id: string;
  nombre: string;
  tipo: TipoMetodoPago;
  banco?: string;
  pais: string;
  titular: string;
  tipoCuenta?: TipoCuenta;
  identificador: string;
  activo: boolean;
  asociadoUsuarios: number;
  asociadoServicios: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
