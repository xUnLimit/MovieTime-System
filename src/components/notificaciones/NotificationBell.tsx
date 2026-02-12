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
import { Bell, AlertCircle, ShoppingCart, CreditCard } from 'lucide-react';
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

  // Get unread notifications
  const unreadNotifications = notificaciones.filter((n) => !n.leida);

  // Count by type
  const ventasPorVencer = unreadNotifications.filter(esNotificacionVenta).length;
  const serviciosPorPagar = unreadNotifications.filter(esNotificacionServicio).length;

  const badgeColor = getBadgeColor(unreadNotifications);
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

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-base">Resumen de Notificaciones</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tienes {unreadNotifications.length} alerta(s) pendiente(s).
          </p>
        </div>

        {/* Summary */}
        {unreadNotifications.length > 0 ? (
          <div className="py-2">
            {/* Ventas por vencer */}
            {ventasPorVencer > 0 && (
              <button
                onClick={() => {
                  window.location.href = '/notificaciones-test';
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium">Ventas por vencer</span>
                </div>
                <span className="text-lg font-bold">{ventasPorVencer}</span>
              </button>
            )}

            {/* Servicios por pagar */}
            {serviciosPorPagar > 0 && (
              <button
                onClick={() => {
                  window.location.href = '/notificaciones-test';
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium">Servicios por pagar</span>
                </div>
                <span className="text-lg font-bold">{serviciosPorPagar}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No hay notificaciones pendientes
          </div>
        )}

        {/* Footer - Ver todas */}
        {unreadNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-3">
              <Button
                onClick={() => {
                  window.location.href = '/notificaciones-test';
                  setIsOpen(false);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="sm"
              >
                Ver todas las notificaciones →
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
