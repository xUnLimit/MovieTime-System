'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RevenueByCategory() {
  return (
    <Card className="py-3 gap-0">
      <CardHeader className="p-0 px-4 pb-2">
        <CardTitle className="text-base">Ingresos por Categoría</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-1 h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Distribución de ingresos</p>
      </CardContent>
    </Card>
  );
}
