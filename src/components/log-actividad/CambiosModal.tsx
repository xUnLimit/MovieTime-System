'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CambioLog } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

interface CambiosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadNombre: string;
  cambios: CambioLog[];
}

export function CambiosModal({ open, onOpenChange, entidadNombre, cambios }: CambiosModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambios en {entidadNombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {cambios.map((cambio, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {cambio.campo}
                </Badge>
              </div>

              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                {/* Valor Anterior */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Antes</p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {formatValue(cambio.anterior, cambio.tipo)}
                    </p>
                  </div>
                </div>

                {/* Flecha */}
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                {/* Valor Nuevo */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Después</p>
                  <div className="bg-green-500/10 border border-green-500/20 rounded px-3 py-2">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {formatValue(cambio.nuevo, cambio.tipo)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Formatea valores según su tipo
 */
function formatValue(value: any, tipo?: CambioLog['tipo']): string {
  if (value === null || value === undefined) return '(vacío)';

  switch (tipo) {
    case 'date':
      if (value instanceof Date) {
        return format(value, 'dd/MM/yyyy', { locale: es });
      }
      return String(value);

    case 'money':
      return `$${Number(value).toFixed(2)}`;

    case 'boolean':
      return value ? 'Activo' : 'Inactivo';

    case 'number':
      return String(value);

    case 'string':
    default:
      return String(value);
  }
}
