// ===========================
// USUARIO TYPES (Cliente & Revendedor unificados)
// ===========================

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  tipo: 'cliente' | 'revendedor';
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  moneda?: string;                  // Denormalizado de MetodoPago
  montoSinConsumir: number;
  // Campos específicos por tipo (opcionales):
  serviciosActivos?: number;        // Solo para clientes — denormalizado desde Ventas (count de ventas activas)
  suscripcionesTotales?: number;    // Solo para revendedores (campo legacy)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Type guards para facilitar discriminación
export function esCliente(usuario: Usuario): boolean {
  return usuario.tipo === 'cliente';
}

export function esRevendedor(usuario: Usuario): boolean {
  return usuario.tipo === 'revendedor';
}

// Form Types
export interface UsuarioFormData {
  nombre: string;
  apellido: string;
  tipo: 'cliente' | 'revendedor';
  telefono: string;
  email?: string;
  metodoPagoId: string;
}
