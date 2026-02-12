'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Servicio } from '@/types';

/**
 * AccionesServicioDialog Component - v2.1
 *
 * Modal con dos flujos:
 * 1. Servicio NO resaltado: Opciones "Cortar" o "Resaltar"
 * 2. Servicio YA resaltado: Confirmación directa para cortar
 */

interface AccionesServicioDialogProps {
  servicio: Servicio | null;
  diasRestantes: number;
  estaResaltada: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCortar: () => Promise<void>;
  onResaltar: () => Promise<void>;
}

export function AccionesServicioDialog({
  servicio,
  diasRestantes,
  estaResaltada,
  open,
  onOpenChange,
  onCortar,
  onResaltar,
}: AccionesServicioDialogProps) {
  const [accion, setAccion] = useState<'cortar' | 'resaltar'>('cortar');
  const [isLoading, setIsLoading] = useState(false);

  if (!servicio) return null;

  // ==========================================
  // FLUJO 1: Servicio NO Resaltado
  // ==========================================

  if (!estaResaltada) {
    const handleConfirmar = async () => {
      setIsLoading(true);
      try {
        if (accion === 'cortar') {
          await onCortar();
        } else {
          await onResaltar();
        }
        onOpenChange(false);
      } catch (error) {
        console.error('Error en acción:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acciones - Servicio</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Información del servicio */}
            <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
              <p>
                <span className="font-medium">Servicio:</span>{' '}
                {servicio.nombre}
              </p>
              <p>
                <span className="font-medium">Categoría:</span>{' '}
                {servicio.categoria || 'Sin categoría'}
              </p>
              <p>
                <span className="font-medium">Estado:</span>{' '}
                {diasRestantes < 0
                  ? `${Math.abs(diasRestantes)} días vencido`
                  : diasRestantes === 0
                    ? 'Vence hoy'
                    : diasRestantes === 1
                      ? 'Vence mañana'
                      : `${diasRestantes} días restantes`}
              </p>
            </div>

            {/* Opciones */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-3">
                ¿Qué acción deseas realizar?
              </p>

              <RadioGroup
                value={accion}
                onValueChange={(v) => setAccion(v as 'cortar' | 'resaltar')}
              >
                {/* Opción: Cortar */}
                <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="cortar" id="cortar" className="mt-1" />
                  <Label
                    htmlFor="cortar"
                    className="cursor-pointer flex-1 space-y-1"
                  >
                    <p className="font-medium">Cortar servicio ahora</p>
                    <p className="text-xs text-muted-foreground">
                      Desactivar servicio + eliminar notificación
                    </p>
                  </Label>
                </div>

                {/* Opción: Resaltar */}
                <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem
                    value="resaltar"
                    id="resaltar"
                    className="mt-1"
                  />
                  <Label
                    htmlFor="resaltar"
                    className="cursor-pointer flex-1 space-y-1"
                  >
                    <p className="font-medium">Resaltar para seguimiento</p>
                    <p className="text-xs text-muted-foreground">
                      Marca en naranja (campana 🟠)
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ==========================================
  // FLUJO 2: Servicio YA Resaltado
  // ==========================================

  const handleCortar = async () => {
    setIsLoading(true);
    try {
      await onCortar();
      onOpenChange(false);
    } catch (error) {
      console.error('Error cortando servicio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cortar Servicio</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Información del servicio */}
          <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
            <p>
              <span className="font-medium">Servicio:</span>{' '}
              {servicio.nombre}
            </p>
            <p>
              <span className="font-medium">Categoría:</span>{' '}
              {servicio.categoria || 'Sin categoría'}
            </p>
            <p>
              <span className="font-medium">Estado:</span> ⚠️{' '}
              {diasRestantes < 0
                ? `${Math.abs(diasRestantes)} días vencido`
                : diasRestantes === 0
                  ? 'Vence hoy'
                  : diasRestantes === 1
                    ? 'Vence mañana'
                    : `${diasRestantes} días restantes`}
            </p>
          </div>

          {/* Advertencia de acciones */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">⚠️ Esto hará:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Estado → Inactivo</li>
              <li>• Eliminar notificación</li>
            </ul>
            <p className="text-sm font-medium mt-3">
              ¿Confirmar corte del servicio?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCortar}
            disabled={isLoading}
          >
            {isLoading ? 'Cortando...' : 'Cortar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
