'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function ServiciosPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Servicios y Categorías</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Servicios</span>
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">Servicios y categorías</p>
        </div>
      </Card>
    </div>
  );
}
