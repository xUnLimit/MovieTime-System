'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ServicioForm } from '@/components/servicios/ServicioForm';
import { useServiciosStore } from '@/store/serviciosStore';
import { Servicio } from '@/types';

export default function EditarServicioPage() {
  const params = useParams();
  const { servicios, fetchServicios } = useServiciosStore();
  const [servicio, setServicio] = useState<Servicio | undefined>();

  useEffect(() => {
    fetchServicios();
  }, [fetchServicios]);

  useEffect(() => {
    const servicioEncontrado = servicios.find(s => s.id === params.id);
    setServicio(servicioEncontrado);
  }, [servicios, params.id]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Editar Servicio</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <Link href="/servicios" className="hover:text-foreground transition-colors">Servicios</Link> / <span className="text-foreground">Editar</span>
        </p>
      </div>

      {servicio && (
        <Card className="p-6">
          <ServicioForm servicio={servicio} />
        </Card>
      )}
    </div>
  );
}
