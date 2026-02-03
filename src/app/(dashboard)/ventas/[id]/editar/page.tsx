'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VentasEditForm, VentaEditData } from '@/components/ventas/VentasEditForm';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { COLLECTIONS, getById, timestampToDate } from '@/lib/firebase/firestore';

function EditarVentaPageContent() {
  const params = useParams();
  const id = params.id as string;
  const [venta, setVenta] = useState<VentaEditData | null>(null);

  useEffect(() => {
    const loadVenta = async () => {
      try {
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (!doc) {
          setVenta(null);
          return;
        }
        setVenta({
          id: doc.id as string,
          clienteId: (doc.clienteId as string) || '',
          clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
          metodoPagoId: (doc.metodoPagoId as string) || '',
          metodoPagoNombre: (doc.metodoPagoNombre as string) || 'Sin método',
          moneda: (doc.moneda as string) || 'USD',
          categoriaId: (doc.categoriaId as string) || '',
          servicioId: (doc.servicioId as string) || '',
          servicioNombre: (doc.servicioNombre as string) || 'Servicio',
          servicioCorreo: (doc.servicioCorreo as string) || '',
          perfilNumero: (doc.perfilNumero as number | null | undefined) ?? null,
          perfilNombre: (doc.perfilNombre as string) || '',
          cicloPago: (doc.cicloPago as VentaEditData['cicloPago']) ?? undefined,
          fechaInicio: timestampToDate(doc.fechaInicio),
          fechaFin: timestampToDate(doc.fechaFin),
          codigo: (doc.codigo as string) || '',
          estado: (doc.estado as 'activo' | 'inactivo') || 'activo',
          precio: (doc.precio as number) ?? 0,
          descuento: (doc.descuento as number) ?? 0,
          precioFinal: (doc.precioFinal as number) ?? (doc.precio as number) ?? 0,
          notas: (doc.notas as string) || '',
        });
      } catch (error) {
        console.error('Error cargando venta:', error);
        setVenta(null);
      }
    };

    if (id) {
      loadVenta();
    }
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/ventas">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Editar Venta</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/ventas" className="hover:text-foreground transition-colors">
              Ventas
            </Link>{' '}
            / <span className="text-foreground">Editar</span>
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        {venta ? (
          <VentasEditForm venta={venta} />
        ) : (
          <p className="text-sm text-muted-foreground">No se encontró la venta solicitada.</p>
        )}
      </div>
    </div>
  );
}

export default function EditarVentaPage() {
  return (
    <ModuleErrorBoundary moduleName="Editar Venta">
      <EditarVentaPageContent />
    </ModuleErrorBoundary>
  );
}
