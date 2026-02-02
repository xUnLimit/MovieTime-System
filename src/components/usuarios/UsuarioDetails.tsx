'use client';

import { Cliente, Revendedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { User, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UsuarioDetailsProps {
  usuario: Cliente | Revendedor;
  tipoUsuario: 'cliente' | 'revendedor';
}

export function UsuarioDetails({ usuario, tipoUsuario }: UsuarioDetailsProps) {
  const isRevendedor = tipoUsuario === 'revendedor';

  const handleWhatsApp = () => {
    const phone = usuario.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="space-y-6">

        {/* Layout de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Columna izquierda: Avatar y perfil */}
          <Card className="p-8">
            <div className="flex flex-col items-center space-y-6">
              {/* Avatar */}
              <div className="w-40 h-40 rounded-full bg-sidebar flex items-center justify-center">
                <User className="w-20 h-20 text-sidebar-foreground" />
              </div>

              {/* Nombre y tipo */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  {usuario.nombre} {usuario.apellido}
                </h2>
                <Badge
                  variant="outline"
                  className="text-sm"
                >
                  {isRevendedor ? 'Revendedor' : 'Cliente'}
                </Badge>
              </div>

              {/* Botón de WhatsApp */}
              <Button
                onClick={handleWhatsApp}
                className="w-full bg-green-700 hover:bg-green-800 text-white"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contactar por WhatsApp
              </Button>
            </div>
          </Card>

          {/* Columna derecha: Información */}
          <div className="space-y-6">
            {/* Información de Contacto */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold leading-none mb-3">Información de Contacto</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                  <p className="text-sm font-medium">{usuario.telefono}</p>
                </div>
                {usuario.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium">{usuario.email}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Información Adicional */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold leading-none mb-3">Información Adicional</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Método de Pago</p>
                  <p className="text-sm font-medium">{usuario.metodoPagoNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cliente desde</p>
                  <p className="text-sm font-medium">
                    {format(new Date(usuario.createdAt), "d 'de' MMMM 'del' yyyy, h:mm a", {
                      locale: es,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última actualización</p>
                  <p className="text-sm font-medium">
                    {format(new Date(usuario.updatedAt), "d 'de' MMMM 'del' yyyy, h:mm a", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                <p className="text-sm text-muted-foreground italic">No hay notas.</p>
              </div>
            </Card>
          </div>
        </div>

      {/* Servicios Asociados */}
      <Card className="p-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-none">Servicios Asociados</h3>
          <p className="text-sm text-muted-foreground leading-none">
            Lista de servicios y perfiles que este usuario tiene o ha tenido.
          </p>
        </div>
        <div className="mt-4 text-center py-8 text-muted-foreground">
          <p>No hay servicios asociados a este usuario.</p>
        </div>
      </Card>
    </div>
  );
}
