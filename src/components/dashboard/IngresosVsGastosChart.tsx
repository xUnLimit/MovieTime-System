'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function IngresosVsGastosChart() {
  return (
    <Card className="py-3 gap-0">
      <CardHeader className="p-0 px-4 pb-2">
        <CardTitle className="text-base">Ingresos vs Gastos</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-1 h-[320px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Gráfico de ingresos y gastos</p>
      </CardContent>
    </Card>
  );
}
