/**
 * NotificationBell Component
 *
 * Features:
 * - Bell icon with dynamic badge color (orange > red > yellow hierarchy)
 * - Dropdown showing recent notifications summary
 * - "Ver todas" link to notification center
 * - Real-time updates from notificacionesStore
 *
 * Badge Color Hierarchy:
 * 1. Red (🔴): Any "critica" priority notifications
 * 2. Orange (🟠): Any resaltadas (highlighted) notifications
 * 3. Yellow (🟡): Any "alta" or "media" priority notifications
 * 4. Gray (⚫): Only "baja" priority or empty
 */

'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import type { Notificacion } from '@/types/notificaciones';
import { esNotificacionVenta, esNotificacionServicio } from '@/types/notificaciones';

type BadgeColor = 'default' | 'destructive' | 'secondary' | 'outline';

/**
 * Get badge color based on notification priority hierarchy
 * Priority: critica (red) > resaltada (orange) > alta/media (yellow) > baja (gray)
 */
function getBadgeColor(notificaciones: (Notificacion & { id: string })[]): BadgeColor {
  // Check for any critica
  if (notificaciones.some((n) => n.prioridad === 'critica')) {
    return 'destructive'; // Red
  }

  // Check for any resaltadas
  if (notificaciones.some((n) => n.resaltada)) {
    return 'secondary'; // Orange
  }

  // Check for any alta or media
  if (notificaciones.some((n) => n.prioridad === 'alta' || n.prioridad === 'media')) {
    return 'outline'; // Yellow
  }

  // Default: gray
  return 'default';
}

/**
 * Get badge label based on notification count and types
 */
function getBadgeLabel(notificaciones: (Notificacion & { id: string })[]): string {
  if (notificaciones.length === 0) return '';
  if (notificaciones.length > 99) return '99+';
  return notificaciones.length.toString();
}

/**
 * Format notification title for dropdown display
 */
function formatNotificationTitle(notif: Notificacion & { id: string }): string {
  if (esNotificacionVenta(notif)) {
    return `${notif.clienteNombre} - ${notif.servicioNombre}`;
  }

  if (esNotificacionServicio(notif)) {
    return `${notif.servicioNombre} (${notif.categoriaNombre})`;
  }

  // Fallback (shouldn't reach here with union type)
  return 'Notificación';
}

/**
 * Get color class based on priority
 */
function getPrioridadColor(prioridad: string): string {
  switch (prioridad) {
    case 'critica':
      return 'text-red-600';
    case 'alta':
      return 'text-orange-600';
    case 'media':
      return 'text-yellow-600';
    case 'baja':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function NotificationBell() {
  const { notificaciones, fetchNotificaciones } = useNotificacionesStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    setMounted(true);
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  // Get unread notifications (most recent first)
  const unreadNotifications = notificaciones
    .filter((n) => !n.leida)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5); // Show top 5

  const badgeColor = getBadgeColor(notificaciones);
  const badgeLabel = getBadgeLabel(unreadNotifications);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Notificaciones"
        >
          <Bell className="h-5 w-5" />

          {/* Badge showing notification count */}
          {badgeLabel && (
            <Badge
              variant={badgeColor}
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {badgeLabel}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          <span className="text-xs text-gray-500">
            {unreadNotifications.length} nuevas
          </span>
        </div>

        {/* Notifications list */}
        {unreadNotifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {unreadNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 border-b text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                  notif.resaltada ? 'bg-yellow-50' : ''
                }`}
              >
                {/* Title with priority icon */}
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${getPrioridadColor(notif.prioridad)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {formatNotificationTitle(notif)}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {notif.titulo}
                    </p>
                  </div>
                  {notif.resaltada && (
                    <span className="text-lg flex-shrink-0">⭐</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No hay notificaciones nuevas
          </div>
        )}

        {/* Footer */}
        {notificaciones.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="px-4 py-3">
              <a
                href="/notificaciones-test"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones →
              </a>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
