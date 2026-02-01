'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ServicioForm } from '@/components/servicios/ServicioForm';

export default function CrearServicioPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Servicio</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <Link href="/servicios" className="hover:text-foreground transition-colors">Servicios</Link> / <span className="text-foreground">Crear</span>
        </p>
      </div>

      <Card className="p-6">
        <ServicioForm />
      </Card>
    </div>
  );
}
