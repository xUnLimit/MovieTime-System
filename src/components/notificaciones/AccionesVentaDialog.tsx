/**
 * AccionesVentaDialog Component
 *
 * Modal showing actions for a specific venta notification
 *
 * Behavior:
 * - If venta is NOT resaltada: Show action options (renovar, cortar, resaltar)
 * - If venta IS resaltada: Show confirmation modal for the action
 */

'use client';

import { useState } from 'react';
import { AlertCircle, RefreshCw, Scissors, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { useVentasStore } from '@/store/ventasStore';
import type { NotificacionVenta } from '@/types/notificaciones';
import { toast } from 'sonner';

interface AccionesVentaDialogProps {
  notificacion: (NotificacionVenta & { id: string }) | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActionType = 'renovar' | 'cortar' | 'resaltar' | null;

export function AccionesVentaDialog({
  notificacion,
  isOpen,
  onOpenChange,
}: AccionesVentaDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { toggleResaltada, deleteNotificacionesPorVenta } = useNotificacionesStore();
  const { deleteVenta } = useVentasStore();

  if (!notificacion) return null;

  /**
   * Handle action selection
   * If venta is resaltada, go directly to confirmation
   * Otherwise, ask user which action they want
   */
  const handleSelectAction = (action: ActionType) => {
    if (notificacion.resaltada) {
      // Direct to confirmation
      setSelectedAction(action);
      setIsConfirming(true);
    } else {
      // Show options
      setSelectedAction(action);
    }
  };

  /**
   * Execute the selected action
   */
  const handleConfirmAction = async () => {
    try {
      switch (selectedAction) {
        case 'renovar':
          toast.info('Redirigiendo a formulario de renovación...');
          // In real implementation, would redirect to renewal form
          // window.location.href = `/ventas/${notificacion.ventaId}/renovar`;
          break;

        case 'cortar':
          toast.loading('Cortando servicio...');
          // Delete the venta
          await deleteVenta(
            notificacion.ventaId,
            notificacion.servicioId,
            undefined,
            true
          );
          // Delete associated notifications
          await deleteNotificacionesPorVenta(notificacion.ventaId);
          toast.success('Servicio cortado exitosamente');
          break;

        case 'resaltar':
          await toggleResaltada(notificacion.id, !notificacion.resaltada);
          toast.success(
            notificacion.resaltada
              ? 'Notificación desmarcada'
              : 'Notificación marcada como importante'
          );
          break;

        default:
          break;
      }

      // Close dialogs
      setSelectedAction(null);
      setIsConfirming(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Error al ejecutar la acción');
    }
  };

  // If resaltada, show options directly in confirmation dialog
  if (notificacion.resaltada) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Venta Importante
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Cliente:</strong> {notificacion.clienteNombre}
                </p>
                <p>
                  <strong>Servicio:</strong> {notificacion.servicioNombre}
                </p>
                <p>
                  <strong>Categoría:</strong> {notificacion.categoriaNombre}
                </p>
                <p>
                  <strong>Vencimiento:</strong>{' '}
                  {notificacion.fechaFin.toLocaleDateString()}
                </p>
                <p className="pt-2 text-gray-600">
                  Esta venta está marcada como importante. ¿Qué deseas hacer?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full justify-start gap-2"
              onClick={() => handleSelectAction('renovar')}
            >
              <RefreshCw className="h-4 w-4" />
              Renovar Servicio
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => handleSelectAction('cortar')}
            >
              <Scissors className="h-4 w-4" />
              Cortar Servicio
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleSelectAction('resaltar')}
            >
              <Star className="h-4 w-4" />
              Desmarcar como Importante
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // If NOT resaltada, show action confirmation
  return (
    <>
      {/* Main options dialog */}
      <Dialog open={isOpen && !isConfirming} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acciones para Venta</DialogTitle>
            <DialogDescription>
              Selecciona qué acción deseas realizar para esta venta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Venta info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{notificacion.clienteNombre}</p>
                  <p className="text-sm text-gray-600">
                    {notificacion.servicioNombre}
                  </p>
                </div>
                <Badge variant="outline">{notificacion.estado}</Badge>
              </div>
              <p className="text-xs text-gray-500">
                Vence: {notificacion.fechaFin.toLocaleDateString()} (
                {notificacion.diasRestantes >= 0
                  ? `${notificacion.diasRestantes} días`
                  : `${Math.abs(notificacion.diasRestantes)} días vencida`}
                )
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button
                variant="default"
                className="w-full justify-start gap-2"
                onClick={() => handleSelectAction('renovar')}
              >
                <RefreshCw className="h-4 w-4" />
                Renovar Servicio
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={() => handleSelectAction('cortar')}
              >
                <Scissors className="h-4 w-4" />
                Cortar Servicio
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => handleSelectAction('resaltar')}
              >
                <Star className="h-4 w-4" />
                Marcar como Importante
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction === 'renovar'
                ? '¿Renovar Servicio?'
                : selectedAction === 'cortar'
                  ? '¿Cortar Servicio?'
                  : '¿Marcar como Importante?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction === 'renovar' && (
                <>
                  ¿Deseas renovar el servicio de <strong>{notificacion.clienteNombre}</strong>?
                  <div className="mt-2 text-sm">
                    Se redirigirá al formulario de renovación.
                  </div>
                </>
              )}
              {selectedAction === 'cortar' && (
                <>
                  ¿Deseas cortar el servicio de <strong>{notificacion.clienteNombre}</strong>?
                  <div className="mt-2 text-sm text-red-600">
                    Esta acción no se puede deshacer.
                  </div>
                </>
              )}
              {selectedAction === 'resaltar' && (
                <>
                  ¿Deseas marcar esta venta como importante?
                  <div className="mt-2 text-sm">
                    Se destacará en la lista de notificaciones.
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={selectedAction === 'cortar' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
