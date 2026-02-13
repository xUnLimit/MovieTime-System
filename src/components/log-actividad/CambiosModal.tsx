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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Cambios Realizados en <span className="text-purple-500">{entidadNombre}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {cambios.length} {cambios.length === 1 ? 'campo modificado' : 'campos modificados'}
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {cambios.map((cambio, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 hover:border-purple-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs font-medium bg-purple-500/10 text-purple-600 border-purple-500/30">
                  {cambio.campo}
                </Badge>
              </div>

              <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center">
                {/* Valor Anterior */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Antes</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3 min-h-[48px] flex items-center">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 break-all">
                      {formatValue(cambio.anterior, cambio.tipo)}
                    </p>
                  </div>
                </div>

                {/* Flecha */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-purple-500" strokeWidth={2.5} />
                </div>

                {/* Valor Nuevo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Después</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-md px-4 py-3 min-h-[48px] flex items-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 break-all">
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
function formatValue(value: unknown, tipo?: CambioLog['tipo']): string {
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
