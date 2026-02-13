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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold">
            Cambios en <span className="text-purple-500">{entidadNombre}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {cambios.map((cambio, idx) => (
            <div
              key={idx}
              className="group relative border-2 border-border rounded-xl p-5 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200"
            >
              {/* Campo Label */}
              <div className="flex items-center justify-between mb-4">
                <Badge
                  variant="outline"
                  className="text-sm font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 px-3 py-1"
                >
                  {cambio.campo}
                </Badge>
              </div>

              {/* Comparación Antes/Después */}
              <div className="grid grid-cols-[1fr,auto,1fr] gap-8 items-stretch">
                {/* Valor Anterior */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Antes</p>
                  </div>
                  <div className="relative bg-gradient-to-br from-red-500/5 to-red-500/10 border-2 border-red-500/30 rounded-lg px-5 py-4 min-h-[60px] flex items-center shadow-sm">
                    <p className="text-base font-semibold text-red-800 dark:text-red-200 break-all leading-relaxed">
                      {formatValue(cambio.anterior, cambio.tipo)}
                    </p>
                  </div>
                </div>

                {/* Flecha con animación */}
                <div className="flex items-center justify-center py-8">
                  <div className="relative">
                    <ArrowRight className="h-7 w-7 text-purple-500 group-hover:text-purple-600 transition-colors" strokeWidth={3} />
                    <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>

                {/* Valor Nuevo */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Después</p>
                  </div>
                  <div className="relative bg-gradient-to-br from-green-500/5 to-green-500/10 border-2 border-green-500/30 rounded-lg px-5 py-4 min-h-[60px] flex items-center shadow-sm">
                    <p className="text-base font-semibold text-green-800 dark:text-green-200 break-all leading-relaxed">
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
