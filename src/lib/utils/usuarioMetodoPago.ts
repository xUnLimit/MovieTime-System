export const PENDING_USER_PAYMENT_ID = 'pendiente';
export const PENDING_USER_PAYMENT_NAME = 'Pendiente';
export const USUARIO_METODO_PAGO_UPDATED_EVENT = 'usuario-metodo-pago-updated';

export function isPendingUserPaymentMethodId(metodoPagoId?: string | null): boolean {
  return !metodoPagoId || metodoPagoId === PENDING_USER_PAYMENT_ID;
}

export function getUsuarioMetodoPagoNombre(
  metodoPagoId?: string | null,
  metodoPagoNombre?: string | null
): string {
  if (!isPendingUserPaymentMethodId(metodoPagoId) && metodoPagoNombre?.trim()) {
    return metodoPagoNombre.trim();
  }

  return PENDING_USER_PAYMENT_NAME;
}
