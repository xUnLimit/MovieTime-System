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
  montoSinConsumir: number;
  // Campos específicos por tipo (opcionales):
  serviciosActivos?: number;        // Solo para clientes
  suscripcionesTotales?: number;    // Solo para revendedores
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

// Aliases para compatibilidad (deprecated - usar Usuario)
/** @deprecated Usar Usuario con tipo='cliente' */
export type Cliente = Usuario & { tipo: 'cliente' };

/** @deprecated Usar Usuario con tipo='revendedor' */
export type Revendedor = Usuario & { tipo: 'revendedor' };

// Form Types
export interface UsuarioFormData {
  nombre: string;
  apellido: string;
  tipo: 'cliente' | 'revendedor';
  telefono: string;
  email?: string;
  metodoPagoId: string;
}

/** @deprecated Usar UsuarioFormData */
export interface ClienteFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
}

/** @deprecated Usar UsuarioFormData */
export interface RevendedorFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
}
