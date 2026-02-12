'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificacionesStore } from '@/store/notificacionesStore';

/**
 * NotificationBell Component - v2.1
 *
 * Muestra un ícono de campana en el header con:
 * - Badge dinámico con contador de notificaciones no leídas
 * - Color según jerarquía: 🟠 naranja > 🔴 rojo > 🟡 amarillo
 * - Dropdown con resumen de notificaciones
 * - Botón para ir a /notificaciones
 */
export function NotificationBell() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { notificaciones, fetchNotificaciones } = useNotificacionesStore();

  // Cargar notificaciones al montar
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // ==========================================
  // LÓGICA DE CONTADOR Y COLOR
  // ==========================================

  // Filtrar notificaciones por estado
  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida);
  const notificacionesResaltadas = notificaciones.filter((n) => n.resaltada);

  // ✅ Contador: No leídas normales + TODAS las resaltadas
  // Las resaltadas siempre cuentan (incluso si están "leídas")
  const notificacionesNormalesNoLeidas = notificacionesNoLeidas.filter(
    (n) => !n.resaltada
  );
  const unreadCount =
    notificacionesNormalesNoLeidas.length + notificacionesResaltadas.length;

  // ✅ Color: Jerarquía naranja > rojo > amarillo
  const hayResaltadas = notificacionesResaltadas.length > 0;
  const hayCriticas = notificacionesNoLeidas.some(
    (n) => n.prioridad === 'critica' && !n.resaltada
  );

  const badgeColor = hayResaltadas
    ? 'bg-orange-500' // 🟠 Prioridad máxima
    : hayCriticas
      ? 'bg-red-500' // 🔴 Críticas
      : 'bg-yellow-500'; // 🟡 Media/Alta

  // Contar por tipo
  const notificacionesRelevantes = [
    ...notificacionesNormalesNoLeidas,
    ...notificacionesResaltadas,
  ];
  const ventasCount = notificacionesRelevantes.filter((n) => n.ventaId).length;
  const serviciosCount = notificacionesRelevantes.filter(
    (n) => n.servicioId
  ).length;

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleViewAll = () => {
    setDropdownOpen(false);
    router.push('/notificaciones-test'); // 🆕 Ruta temporal de prueba
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full ${badgeColor}
                         text-white text-xs flex items-center justify-center font-semibold`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {unreadCount === 0 ? (
          <EmptyNotifications />
        ) : (
          <NotificationsPreview
            unreadCount={unreadCount}
            ventasCount={ventasCount}
            serviciosCount={serviciosCount}
            onViewAll={handleViewAll}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ==========================================
// SUB-COMPONENTES
// ==========================================

function EmptyNotifications() {
  return (
    <div className="p-8 text-center">
      <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">Todo al día</h3>
      <p className="text-sm text-muted-foreground">
        No tienes notificaciones pendientes.
      </p>
    </div>
  );
}

interface NotificationsPreviewProps {
  unreadCount: number;
  ventasCount: number;
  serviciosCount: number;
  onViewAll: () => void;
}

function NotificationsPreview({
  unreadCount,
  ventasCount,
  serviciosCount,
  onViewAll,
}: NotificationsPreviewProps) {
  return (
    <>
      <div className="p-4 border-b">
        <h3 className="font-semibold">Resumen de Notificaciones</h3>
        <p className="text-sm text-muted-foreground">
          Tienes {unreadCount} alerta{unreadCount > 1 ? 's' : ''} pendiente
          {unreadCount > 1 ? 's' : ''}.
        </p>
      </div>

      <div className="p-3 space-y-2">
        {ventasCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>📊 Ventas por vencer</span>
            <Badge variant="outline">{ventasCount}</Badge>
          </div>
        )}
        {serviciosCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>💳 Servicios por pagar</span>
            <Badge variant="outline">{serviciosCount}</Badge>
          </div>
        )}
      </div>

      <div className="p-3 border-t">
        <Button className="w-full" onClick={onViewAll}>
          Ver todas las notificaciones →
        </Button>
      </div>
    </>
  );
}
