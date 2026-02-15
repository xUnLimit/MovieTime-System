'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';

function MesRowSkeleton() {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 relative">
      <div className="absolute top-2 right-2">
        <Skeleton className="h-5 w-20 rounded" />
      </div>
      <Skeleton className="h-5 w-24 mb-1.5" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
import { usePronosticoFinanciero, type MesPronostico } from '@/hooks/use-pronostico-financiero';

function formatUSD(value: number): string {
  return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function MesRow({ mes }: { mes: MesPronostico }) {
  const isPositive = mes.ganancias >= 0;

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 relative">
      {/* Ganancia badge — top right */}
      <div className="absolute top-2 right-2">
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            isPositive
              ? 'text-green-500 bg-green-500/10'
              : 'text-red-500 bg-red-500/10'
          }`}
        >
          {isPositive ? 'Ganancia' : 'Pérdida'}: {formatUSD(mes.ganancias)}
        </span>
      </div>

      {/* Month label */}
      <p className="text-sm font-medium mb-1.5 pr-24">{mes.mes}</p>

      {/* Income / Expenses */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-sm font-medium text-green-500">~{formatUSD(mes.ingresos)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="text-sm font-medium text-red-500">~{formatUSD(mes.gastos)}</span>
        </div>
      </div>
    </div>
  );
}

export function PronosticoFinanciero() {
  const { meses, isLoading } = usePronosticoFinanciero();

  const todasPositivas = meses.length > 0 && meses.every((m) => m.ganancias >= 0);

  return (
    <Card className="flex flex-col py-3 gap-0 h-full overflow-hidden">
      <CardHeader className="p-0 px-4 pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
          <CardTitle className="text-base">Pronóstico Financiero</CardTitle>
        </div>
        <CardDescription className="text-sm mt-0.5">
          Proyecciones de ingresos y gastos para los próximos 4 meses.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pt-0 pb-0 flex-1 space-y-2 overflow-y-auto min-h-0">
        {isLoading ? (
          <>
            <MesRowSkeleton />
            <MesRowSkeleton />
            <MesRowSkeleton />
            <MesRowSkeleton />
          </>
        ) : meses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay datos suficientes para proyectar.
          </p>
        ) : (
          meses.map((mes) => <MesRow key={mes.mesKey} mes={mes} />)
        )}
      </CardContent>

      <CardFooter className="px-4 pt-3 pb-1 mt-auto">
        <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 w-full min-h-[52px]">
          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          {isLoading ? (
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {todasPositivas
                ? 'Basado en renovaciones y pagos recurrentes, se proyecta una ganancia en los próximos 4 meses.'
                : 'Proyección basada en renovaciones y pagos recurrentes del mes actual.'}
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
