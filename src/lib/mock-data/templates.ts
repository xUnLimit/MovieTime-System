import { TemplateMensaje } from '@/types';

export const MOCK_TEMPLATES: TemplateMensaje[] = [
  {
    id: '1',
    nombre: 'Notificación Regular',
    tipo: 'notificacion_regular',
    contenido: '{saludo} {cliente},\n\nTe recordamos que tu servicio de {categoria} vence el {vencimiento}.\n\nDatos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}\n\nMonto: ${monto}\n\n¡Gracias por tu preferencia!',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{correo}', '{contrasena}', '{vencimiento}', '{monto}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '2',
    nombre: 'Notificación Día de Pago',
    tipo: 'dia_pago',
    contenido: '{saludo} {cliente},\n\n¡Hoy es el día de renovación de tu servicio de {categoria}!\n\nPor favor realiza el pago de ${monto} para mantener tu servicio activo.\n\nDatos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{monto}', '{correo}', '{contrasena}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '3',
    nombre: 'Nueva Suscripción',
    tipo: 'suscripcion',
    contenido: '{saludo} {cliente},\n\n¡Gracias por tu compra!\n\nServicio: {categoria}\nMonto pagado: ${monto}\nVence: {vencimiento}\n\nTus datos de acceso:\nCorreo: {correo}\nContraseña: {contrasena}\n\n¡Disfruta tu servicio!',
    placeholders: ['{saludo}', '{cliente}', '{categoria}', '{monto}', '{vencimiento}', '{correo}', '{contrasena}'],
    activo: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];
