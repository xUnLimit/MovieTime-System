import { WhatsAppData } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtiene el saludo apropiado según la hora del día
 */
export function getSaludo(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Reemplaza los placeholders en un template con datos reales
 */
export function replacePlaceholders(
  template: string,
  data: WhatsAppData
): string {
  const placeholders: Record<string, string> = {
    '{saludo}': getSaludo(),
    '{cliente}': data.cliente,
    '{categoria}': data.categoria,
    '{correo}': data.correo,
    '{contrasena}': data.contrasena,
    '{vencimiento}': data.vencimiento,
    '{monto}': data.monto
  };

  // Si hay días de retraso, agregar al mensaje
  if (data.diasRetraso !== undefined) {
    placeholders['{diasRetraso}'] = data.diasRetraso.toString();
  }

  let message = template;

  Object.entries(placeholders).forEach(([key, value]) => {
    message = message.replace(new RegExp(key, 'g'), value);
  });

  return message;
}

/**
 * Genera un link de WhatsApp con mensaje preformateado
 */
export function generateWhatsAppLink(
  phoneNumber: string,
  message: string
): string {
  // Limpiar número de teléfono (solo dígitos y +)
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

  // Codificar mensaje para URL
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Abre WhatsApp en una nueva ventana
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const link = generateWhatsAppLink(phoneNumber, message);
  window.open(link, '_blank', 'noopener,noreferrer');
}

/**
 * Formatea una fecha para mostrar en mensajes de WhatsApp
 */
export function formatearFechaWhatsApp(fecha: Date): string {
  return format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Genera un mensaje de WhatsApp completo para una venta
 */
export function generarMensajeVenta(
  template: string,
  venta: {
    clienteNombre: string;
    categoriaNombre: string;
    correo: string;
    contrasena: string;
    fechaVencimiento: Date;
    monto: number;
    diasRetraso?: number;
  }
): string {
  const data: WhatsAppData = {
    cliente: venta.clienteNombre,
    categoria: venta.categoriaNombre,
    correo: venta.correo,
    contrasena: venta.contrasena,
    vencimiento: formatearFechaWhatsApp(venta.fechaVencimiento),
    monto: venta.monto.toFixed(2),
    diasRetraso: venta.diasRetraso
  };

  return replacePlaceholders(template, data);
}
