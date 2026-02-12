# Sistema de Notificaciones Persistentes - Diseño Completo

**Fecha:** 2026-02-12
**Versión:** 1.0
**Estado:** Diseño Aprobado

---

## 📋 Resumen Ejecutivo

Implementación de un sistema de notificaciones persistentes para ventas y servicios próximos a vencer, con:
- Bell icon en header con badge dinámico (rojo/amarillo/gris)
- Dropdown con resumen de notificaciones
- Sincronización automática al cargar el dashboard
- Auto-actualización de notificaciones según umbrales (7, 3, 1 día, vencido)
- Toggle leída/no leída (persistente)
- Auto-eliminación al renovar venta/servicio

---

## 🎯 Objetivos

### Funcionales
1. Mostrar notificaciones de ventas/servicios próximos a vencer en el header
2. Badge con color dinámico según prioridad más alta
3. Dropdown con resumen y acceso rápido a `/notificaciones`
4. Notificaciones persisten en Firebase (colección `notificaciones`)
5. Auto-actualización de prioridad conforme se acerca el vencimiento
6. Usuario puede marcar como leída/no leída
7. Notificaciones se eliminan al renovar

### No Funcionales
1. Sincronización en <2 segundos al cargar dashboard
2. Máximo 1 notificación por venta/servicio (auto-actualización)
3. Polling cada 5 minutos para detectar nuevos vencimientos
4. Compatible con sistema de caché (5 min TTL)

---

## 🏗️ Arquitectura del Sistema

### Componentes Nuevos

```
src/
├── components/
│   └── layout/
│       └── NotificationBell.tsx          # Bell icon con dropdown
├── lib/
│   └── services/
│       └── notificationSyncService.ts    # Lógica de sincronización
└── hooks/
    └── use-notification-sync.ts          # Hook para sincronizar en dashboard
```

### Componentes Modificados

```
src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx                    # Agregar NotificationBell + sincronización
│       └── notificaciones/
│           └── page.tsx                  # ✅ MANTENER tablas actuales (VentasProximasTable + ServiciosProximosTable)
├── components/
│   ├── layout/
│   │   └── Header.tsx                   # Incluir NotificationBell
│   └── notificaciones/
│       ├── VentasProximasTable.tsx      # ✅ Agregar acción "Cortar" para vencidas + auto-eliminar notif al renovar/cortar
│       └── ServiciosProximosTable.tsx   # ✅ Agregar acción "Cortar" para vencidos + auto-eliminar notif al renovar/cortar
└── store/
    └── notificacionesStore.ts           # Nuevas acciones: sync, toggle, deleteByEntity
```

**Nota:** La página `/notificaciones` **NO tendrá timeline**. Se mantiene el diseño actual con dos tablas separadas.

---

## 📊 Modelo de Datos

### Estructura de Notificación (Firebase)

```typescript
interface Notificacion {
  id: string;
  tipo: 'sistema';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  titulo: string;          // "Venta vence en 3 días" | "Servicio vencido"
  mensaje: string;         // "Juan Pérez - Netflix"
  leida: boolean;

  // ✅ NUEVO: Acción sugerida (opcional)
  accionSugerida?: 'renovar' | 'cortar';  // Para vencidas: sugerir renovar o cortar

  // Referencias (mutuamente exclusivas)
  ventaId?: string;        // Si es notificación de venta
  servicioId?: string;     // Si es notificación de servicio

  // Metadata
  estado: '7_dias' | '3_dias' | '1_dia' | 'vencido';
  diasRestantes: number;   // -1, 0, 1, 3, 7
  fechaEvento: Date;       // Fecha de vencimiento de la venta/servicio

  // Audit
  createdAt: Date;
  updatedAt?: Date;
}
```

### Mapeo de Prioridad y Acción Sugerida

| Días Restantes | Estado    | Prioridad | Acción Sugerida | Color Badge |
|----------------|-----------|-----------|-----------------|-------------|
| 7              | `7_dias`  | media     | `renovar`       | 🟡 Amarillo |
| 3              | `3_dias`  | alta      | `renovar`       | 🟠 Naranja  |
| 1              | `1_dia`   | critica   | `renovar`       | 🔴 Rojo     |
| 0 o negativo   | `vencido` | critica   | `cortar`        | 🔴 Rojo     |

**Nota:** Cuando `diasRestantes < 0` (vencida), `accionSugerida` se establece en `'cortar'` para indicar que se debe considerar cancelar el servicio/venta por falta de pago.

---

## 🔄 Flujo de Sincronización

### 1. Al Cargar el Dashboard

```typescript
// En src/app/(dashboard)/layout.tsx

useEffect(() => {
  // Sincronización inicial
  sincronizarNotificaciones();

  // Polling cada 5 minutos
  const interval = setInterval(() => {
    sincronizarNotificaciones();
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

### 2. Lógica de Sincronización

```typescript
// src/lib/services/notificationSyncService.ts

export async function sincronizarNotificaciones(): Promise<void> {
  console.log('[NotificationSync] Sincronizando notificaciones...');

  // 1. Query ventas próximas (siguiente 7 días)
  const fechaLimite = addDays(new Date(), 7);
  const ventasProximas = await queryDocuments<VentaDoc>(
    COLLECTIONS.VENTAS,
    [
      { field: 'estado', operator: '==', value: 'activo' },
      { field: 'fechaFin', operator: '<=', value: fechaLimite }
    ]
  );

  // 2. Query ventas vencidas (fechaFin < hoy)
  const ventasVencidas = await queryDocuments<VentaDoc>(
    COLLECTIONS.VENTAS,
    [
      { field: 'estado', operator: '==', value: 'activo' },
      { field: 'fechaFin', operator: '<', value: new Date() }
    ]
  );

  const todasLasVentas = [...ventasProximas, ...ventasVencidas];

  // 3. Procesar cada venta
  for (const venta of todasLasVentas) {
    await procesarVenta(venta);
  }

  // 4. Mismo proceso para servicios
  const serviciosProximos = await queryDocuments<Servicio>(
    COLLECTIONS.SERVICIOS,
    [
      { field: 'activo', operator: '==', value: true },
      { field: 'fechaVencimiento', operator: '<=', value: fechaLimite }
    ]
  );

  const serviciosVencidos = await queryDocuments<Servicio>(
    COLLECTIONS.SERVICIOS,
    [
      { field: 'activo', operator: '==', value: true },
      { field: 'fechaVencimiento', operator: '<', value: new Date() }
    ]
  );

  const todosLosServicios = [...serviciosProximos, ...serviciosVencidos];

  for (const servicio of todosLosServicios) {
    await procesarServicio(servicio);
  }

  console.log('[NotificationSync] Sincronización completada');
}

async function procesarVenta(venta: VentaDoc): Promise<void> {
  const diasRestantes = differenceInDays(new Date(venta.fechaFin), new Date());

  // Determinar estado según umbral
  let nuevoEstado: EstadoNotificacion | null = null;
  let accionSugerida: 'renovar' | 'cortar' = 'renovar';

  if (diasRestantes < 0) {
    nuevoEstado = 'vencido';
    accionSugerida = 'cortar';  // ✅ Sugerir cortar venta vencida
  } else if (diasRestantes === 1) {
    nuevoEstado = '1_dia';
  } else if (diasRestantes === 3) {
    nuevoEstado = '3_dias';
  } else if (diasRestantes === 7) {
    nuevoEstado = '7_dias';
  }

  // Días intermedios (2, 4, 5, 6) no hacen nada
  if (!nuevoEstado) return;

  // Buscar notificación existente para esta venta
  const notifExistente = await queryDocuments<Notificacion>(
    COLLECTIONS.NOTIFICACIONES,
    [{ field: 'ventaId', operator: '==', value: venta.id }]
  );

  if (notifExistente.length > 0) {
    // Actualizar si el estado cambió
    const notif = notifExistente[0];

    if (notif.estado !== nuevoEstado) {
      await update(COLLECTIONS.NOTIFICACIONES, notif.id, {
        estado: nuevoEstado,
        prioridad: calcularPrioridad(diasRestantes),
        diasRestantes,
        titulo: generarTitulo(diasRestantes, 'venta'),
        accionSugerida,  // ✅ Actualizar acción sugerida
        leida: false, // Marcar como no leída al actualizar
        updatedAt: new Date()
      });

      console.log(`[NotificationSync] Notificación actualizada: ${venta.id} -> ${nuevoEstado} (acción: ${accionSugerida})`);
    }
  } else {
    // Crear nueva notificación
    await create(COLLECTIONS.NOTIFICACIONES, {
      tipo: 'sistema',
      prioridad: calcularPrioridad(diasRestantes),
      titulo: generarTitulo(diasRestantes, 'venta'),
      mensaje: `${venta.clienteNombre} - ${venta.servicioNombre}`,
      ventaId: venta.id,
      estado: nuevoEstado,
      diasRestantes,
      accionSugerida,  // ✅ Incluir acción sugerida
      fechaEvento: venta.fechaFin,
      leida: false
    });

    console.log(`[NotificationSync] Notificación creada: ${venta.id} -> ${nuevoEstado} (acción: ${accionSugerida})`);
  }
}

async function procesarServicio(servicio: Servicio): Promise<void> {
  // Misma lógica que procesarVenta pero con servicioId
  // ...
}

function calcularPrioridad(diasRestantes: number): PrioridadNotificacion {
  if (diasRestantes <= 0) return 'critica';
  if (diasRestantes === 1) return 'critica';
  if (diasRestantes === 3) return 'alta';
  if (diasRestantes === 7) return 'media';
  return 'baja';
}

function generarTitulo(diasRestantes: number, tipo: 'venta' | 'servicio'): string {
  const entidad = tipo === 'venta' ? 'Venta' : 'Servicio';

  if (diasRestantes < 0) return `${entidad} vencida`;
  if (diasRestantes === 0) return `${entidad} vence hoy`;
  if (diasRestantes === 1) return `${entidad} vence mañana`;
  return `${entidad} vence en ${diasRestantes} días`;
}
```

---

## 🔔 Componente: NotificationBell

### Ubicación
`src/components/layout/NotificationBell.tsx`

### Responsabilidades
- Mostrar bell icon con badge
- Color dinámico según prioridad más alta
- Dropdown con resumen de notificaciones
- Botón "Ver todas las notificaciones"
- Estado vacío: "Todo al día"

### Implementación

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificacionesStore } from '@/store/notificacionesStore';

export function NotificationBell() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    notificaciones,
    unreadCount,
    fetchNotificaciones
  } = useNotificacionesStore();

  // Cargar notificaciones al montar
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // Determinar color del badge según prioridad más alta
  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);
  const hayCriticas = notificacionesNoLeidas.some(n => n.prioridad === 'critica');

  const badgeColor = hayCriticas ? 'bg-red-500' : 'bg-yellow-500';

  // Contar por tipo
  const ventasCount = notificacionesNoLeidas.filter(n => n.ventaId).length;
  const serviciosCount = notificacionesNoLeidas.filter(n => n.servicioId).length;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full ${badgeColor}
                         text-white text-xs flex items-center justify-center font-semibold`}
            >
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {unreadCount === 0 ? (
          <EmptyNotifications />
        ) : (
          <NotificationsPreview
            unreadCount={unreadCount}
            ventasCount={ventasCount}
            serviciosCount={serviciosCount}
            onViewAll={() => {
              setDropdownOpen(false);
              router.push('/notificaciones');
            }}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyNotifications() {
  return (
    <div className="p-8 text-center">
      <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">Todo al día</h3>
      <p className="text-sm text-muted-foreground">
        No tienes notificaciones pendientes.
      </p>
    </div>
  );
}

interface NotificationsPreviewProps {
  unreadCount: number;
  ventasCount: number;
  serviciosCount: number;
  onViewAll: () => void;
}

function NotificationsPreview({
  unreadCount,
  ventasCount,
  serviciosCount,
  onViewAll
}: NotificationsPreviewProps) {
  return (
    <>
      <div className="p-4 border-b">
        <h3 className="font-semibold">Resumen de Notificaciones</h3>
        <p className="text-sm text-muted-foreground">
          Tienes {unreadCount} alerta(s) pendiente(s).
        </p>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>📊 Ventas por vencer</span>
          <Badge variant="outline">{ventasCount}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>💳 Servicios por pagar</span>
          <Badge variant="outline">{serviciosCount}</Badge>
        </div>
      </div>

      <div className="p-3 border-t">
        <Button className="w-full" onClick={onViewAll}>
          Ver todas las notificaciones →
        </Button>
      </div>
    </>
  );
}
```

---

## 🗄️ Store: notificacionesStore (Extendido)

### Nuevas Acciones

```typescript
// src/store/notificacionesStore.ts

interface NotificacionesState {
  // ... campos existentes ...

  // Nuevas acciones
  toggleLeida: (id: string) => Promise<void>;
  deleteNotificacionesPorEntidad: (ventaId?: string, servicioId?: string) => Promise<void>;
}

export const useNotificacionesStore = create<NotificacionesState>()(
  devtools((set, get) => ({
    // ... estado existente ...

    // Toggle leída/no leída
    toggleLeida: async (id: string) => {
      try {
        const notificacion = get().notificaciones.find(n => n.id === id);
        if (!notificacion) return;

        const nuevoEstado = !notificacion.leida;

        await update(COLLECTIONS.NOTIFICACIONES, id, { leida: nuevoEstado });

        set(state => ({
          notificaciones: state.notificaciones.map(n =>
            n.id === id ? { ...n, leida: nuevoEstado } : n
          ),
          unreadCount: nuevoEstado
            ? state.unreadCount - 1
            : state.unreadCount + 1
        }));
      } catch (error) {
        console.error('Error toggling notificacion:', error);
        throw error;
      }
    },

    // Eliminar todas las notificaciones de una venta/servicio
    deleteNotificacionesPorEntidad: async (ventaId?: string, servicioId?: string) => {
      try {
        const filters = [];
        if (ventaId) filters.push({ field: 'ventaId', operator: '==', value: ventaId });
        if (servicioId) filters.push({ field: 'servicioId', operator: '==', value: servicioId });

        const notificaciones = await queryDocuments<Notificacion>(
          COLLECTIONS.NOTIFICACIONES,
          filters
        );

        // Eliminar todas las notificaciones encontradas
        const batch = writeBatch(db);
        notificaciones.forEach(n => {
          batch.delete(firestoreDoc(db, COLLECTIONS.NOTIFICACIONES, n.id));
        });
        await batch.commit();

        // Actualizar estado local
        set(state => ({
          notificaciones: state.notificaciones.filter(
            n => n.ventaId !== ventaId && n.servicioId !== servicioId
          ),
          unreadCount: state.notificaciones.filter(
            n => !n.leida && n.ventaId !== ventaId && n.servicioId !== servicioId
          ).length
        }));

        console.log(`[NotificacionesStore] Notificaciones eliminadas para entidad: ${ventaId || servicioId}`);
      } catch (error) {
        console.error('Error deleting notificaciones:', error);
        throw error;
      }
    }
  }))
);
```

---

## 🔄 Integración con Renovación

### VentasProximasTable (Modificación)

```typescript
// src/components/notificaciones/VentasProximasTable.tsx

const handleConfirmRenovar = async (formData: Record<string, unknown>) => {
  if (!selectedVenta) return;

  try {
    // ... lógica de renovación existente ...

    await updateVenta(selectedVenta.id, {
      fechaInicio: formData.fechaInicio as Date,
      fechaFin: formData.fechaVencimiento as Date,
      // ...
    });

    // ✅ NUEVO: Eliminar notificaciones de esta venta
    const { deleteNotificacionesPorEntidad } = useNotificacionesStore.getState();
    await deleteNotificacionesPorEntidad(selectedVenta.id, undefined);

    toast.success('Venta renovada exitosamente');

    // ... resto del código ...
  } catch (error) {
    console.error('Error renovando venta:', error);
    toast.error('Error al renovar la venta');
  }
};
```

### ServiciosProximosTable (Modificación)

```typescript
// src/components/notificaciones/ServiciosProximosTable.tsx

const handleConfirmRenovar = async (formData: Record<string, unknown>) => {
  if (!selectedServicio) return;

  try {
    // ... lógica de renovación existente ...

    await updateServicio(selectedServicio.id, {
      fechaVencimiento: formData.fechaVencimiento as Date,
      // ...
    });

    // ✅ NUEVO: Eliminar notificaciones de este servicio
    const { deleteNotificacionesPorEntidad } = useNotificacionesStore.getState();
    await deleteNotificacionesPorEntidad(undefined, selectedServicio.id);

    toast.success('Servicio renovado exitosamente');

    // ... resto del código ...
  } catch (error) {
    console.error('Error renovando servicio:', error);
    toast.error('Error al renovar el servicio');
  }
};
```

---

## 📱 Integración en Header/Layout

### Header.tsx (Modificación)

```typescript
// src/components/layout/Header.tsx

import { NotificationBell } from './NotificationBell';

export function Header() {
  return (
    <header className="...">
      {/* ... otros elementos del header ... */}

      <div className="flex items-center gap-3">
        {/* Bell Icon */}
        <NotificationBell />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
```

### Dashboard Layout (Modificación)

```typescript
// src/app/(dashboard)/layout.tsx

'use client';

import { useEffect } from 'react';
import { sincronizarNotificaciones } from '@/lib/services/notificationSyncService';
import { useNotificacionesStore } from '@/store/notificacionesStore';

export default function DashboardLayout({ children }) {
  const { fetchNotificaciones } = useNotificacionesStore();

  useEffect(() => {
    // Sincronización inicial
    const sync = async () => {
      await sincronizarNotificaciones();
      await fetchNotificaciones(true); // Force refresh
    };

    sync();

    // Polling cada 5 minutos
    const interval = setInterval(sync, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNotificaciones]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 🔴 Acción "Cortar" en Tablas de Notificaciones

### Concepto

Cuando una venta/servicio está **vencida** (`diasRestantes < 0`), la acción sugerida cambia de "Renovar" a **"Cortar"**. Esto permite al administrador cancelar el servicio por falta de pago.

### Implementación en VentasProximasTable

```typescript
// src/components/notificaciones/VentasProximasTable.tsx

const handleCortar = async (venta: VentaDoc) => {
  if (!confirm(`¿Estás seguro de cortar la venta de ${venta.servicioNombre} para ${venta.clienteNombre}?`)) {
    return;
  }

  try {
    // 1. Cambiar estado de la venta a 'inactivo'
    await updateVenta(venta.id, {
      estado: 'inactivo'
    });

    // 2. Liberar perfil ocupado del servicio
    const { updatePerfilOcupado } = useServiciosStore.getState();
    if (venta.servicioId) {
      await updatePerfilOcupado(venta.servicioId, false);
    }

    // 3. Decrementar contador del cliente
    if (venta.clienteId) {
      await adjustServiciosActivos(venta.clienteId, -1);
    }

    // 4. Eliminar notificaciones de esta venta
    const { deleteNotificacionesPorEntidad } = useNotificacionesStore.getState();
    await deleteNotificacionesPorEntidad(venta.id, undefined);

    toast.success('Venta cortada exitosamente');

    // 5. Recargar tabla
    // ... (reload logic)
  } catch (error) {
    console.error('Error cortando venta:', error);
    toast.error('Error al cortar la venta');
  }
};
```

### Dropdown Actions (Modificado)

```typescript
// En VentasProximasTable - Dropdown actions

<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => handleNotificar(venta, row.diasRestantes)} className="text-green-500">
    <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
    Notificar
  </DropdownMenuItem>

  {/* ✅ Mostrar "Cortar" si está vencida, "Cancelar" si no */}
  {row.diasRestantes < 0 ? (
    <DropdownMenuItem onClick={() => handleCortar(venta)} className="text-red-500">
      <X className="h-4 w-4 mr-2 text-red-500" />
      Cortar Venta
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem onClick={() => handleCancelar(venta)} className="text-red-500">
      <X className="h-4 w-4 mr-2 text-red-500" />
      Cancelar
    </DropdownMenuItem>
  )}

  <DropdownMenuItem onClick={() => handleRenovar(venta)} className="text-purple-500">
    <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
    Renovar
  </DropdownMenuItem>

  {/* ... otros items ... */}
</DropdownMenuContent>
```

### Implementación en ServiciosProximosTable

```typescript
// src/components/notificaciones/ServiciosProximosTable.tsx

const handleCortar = async (servicio: Servicio) => {
  if (!confirm(`¿Estás seguro de cortar el servicio ${servicio.nombre}?`)) {
    return;
  }

  try {
    // 1. Cambiar estado del servicio a inactivo
    await updateServicio(servicio.id, {
      activo: false
    });

    // 2. Eliminar notificaciones de este servicio
    const { deleteNotificacionesPorEntidad } = useNotificacionesStore.getState();
    await deleteNotificacionesPorEntidad(undefined, servicio.id);

    toast.success('Servicio cortado exitosamente');

    // 3. Recargar tabla
    // ... (reload logic)
  } catch (error) {
    console.error('Error cortando servicio:', error);
    toast.error('Error al cortar el servicio');
  }
};
```

### Visual Indicator

Las filas con `accionSugerida: 'cortar'` tendrán un borde rojo para destacar:

```typescript
// En el render de la tabla
<tr
  className={cn(
    'hover:bg-accent/50',
    diasRestantes < 0 && 'border-l-4 border-red-500'  // ✅ Borde rojo para vencidas
  )}
>
  {/* ... celdas ... */}
</tr>
```

---

## 🧪 Testing

### Test Cases

1. **Sincronización Inicial**
   - Al cargar dashboard → Notificaciones se crean/actualizan
   - Badge muestra contador correcto
   - Color rojo si hay críticas, amarillo si no

2. **Auto-actualización**
   - Venta pasa de 7 días → 3 días → Notificación se actualiza
   - Estado cambia de `7_dias` → `3_dias`
   - Badge cambia de amarillo → naranja/rojo

3. **Acción Sugerida "Cortar"**
   - Venta vencida (`diasRestantes < 0`) → `accionSugerida` = `'cortar'`
   - Dropdown muestra "Cortar Venta" en lugar de "Cancelar"
   - Fila tiene borde rojo visual
   - Al cortar → Venta pasa a `inactivo`, perfil liberado, notificación eliminada

4. **Toggle Leída/No Leída**
   - Marcar como leída → Contador disminuye
   - Marcar como no leída → Contador aumenta
   - Estado persiste en Firebase

5. **Eliminación al Renovar**
   - Renovar venta → Todas sus notificaciones se eliminan
   - Renovar servicio → Todas sus notificaciones se eliminan
   - Badge se actualiza inmediatamente

6. **Eliminación al Cortar**
   - Cortar venta vencida → Todas sus notificaciones se eliminan
   - Cortar servicio vencido → Todas sus notificaciones se eliminan
   - Badge se actualiza inmediatamente

7. **Polling**
   - Cada 5 minutos → Sincronización automática
   - Nuevas notificaciones aparecen sin refrescar

---

## 📈 Métricas de Rendimiento

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Tiempo sincronización inicial | <2s | Tiempo desde mount hasta notificaciones cargadas |
| Lecturas Firebase por sync | <20 | Ventas (7 + vencidas) + Servicios (7 + vencidos) |
| Tiempo render dropdown | <100ms | Desde click hasta dropdown visible |
| Memoria (notificaciones store) | <1MB | Tamaño del store con 100 notificaciones |

---

## 🚀 Plan de Implementación

### Fase 1: Backend & Sincronización (2-3 horas)
1. Crear `notificationSyncService.ts`
2. Implementar `sincronizarNotificaciones()`
3. Implementar `procesarVenta()` y `procesarServicio()`
4. Agregar funciones helper (`calcularPrioridad`, `generarTitulo`)

### Fase 2: Store (1 hora)
1. Extender `notificacionesStore` con `toggleLeida()`
2. Agregar `deleteNotificacionesPorEntidad()`
3. Testing manual del store

### Fase 3: UI - NotificationBell (2 horas)
1. Crear `NotificationBell.tsx`
2. Implementar dropdown con resumen
3. Implementar estado vacío
4. Integrar con store

### Fase 4: Integración (1 hora)
1. Agregar `NotificationBell` a `Header.tsx`
2. Agregar sincronización a `layout.tsx`
3. Modificar `VentasProximasTable` (eliminar notifs al renovar)
4. Modificar `ServiciosProximosTable` (eliminar notifs al renovar)

### Fase 5: Testing & Polish (1 hora)
1. Testing end-to-end
2. Verificar rendimiento
3. Ajustes visuales
4. Documentación

**Total Estimado:** 7-8 horas

---

## 🔒 Consideraciones de Seguridad

1. **Firestore Rules:** Asegurar que solo usuarios autenticados puedan leer/escribir notificaciones
2. **Validación:** Validar que `ventaId` o `servicioId` pertenezcan al usuario actual
3. **Rate Limiting:** Evitar spam de sincronización (máximo 1 cada 5 min)

---

## 🎨 Wireframes

### Bell Icon - Sin Notificaciones
```
┌──────────┐
│  [bell]  │  ← Gris, sin badge
└──────────┘
```

### Bell Icon - Con Notificaciones Medias
```
┌──────────┐
│  [bell]  │
│    🟡3   │  ← Badge amarillo
└──────────┘
```

### Bell Icon - Con Notificaciones Críticas
```
┌──────────┐
│  [bell]  │
│    🔴5   │  ← Badge rojo
└──────────┘
```

### Dropdown - Con Notificaciones
```
┌─────────────────────────────────┐
│ Resumen de Notificaciones       │
│ Tienes 13 alerta(s) pendiente(s)│
├─────────────────────────────────┤
│ 📊 Ventas por vencer       [8]  │
│ 💳 Servicios por pagar     [5]  │
├─────────────────────────────────┤
│ [Ver todas las notificaciones →]│
└─────────────────────────────────┘
```

### Dropdown - Sin Notificaciones
```
┌─────────────────────────────────┐
│         [bell icon]             │
│                                 │
│         Todo al día             │
│ No tienes notificaciones        │
│       pendientes.               │
│                                 │
└─────────────────────────────────┘
```

---

## 📝 Notas Finales

- El sistema NO requiere Firebase Cloud Functions (todo client-side)
- Compatible con el sistema de caché existente (5 min TTL)
- Se mantiene la página `/notificaciones` con las tablas actuales
- Notificaciones persistentes complementan el flujo manual existente
- Auto-actualización asegura que siempre se vea la prioridad más reciente

---

## 🔄 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ USUARIO CARGA DASHBOARD                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ sincronizarNotificaciones()                                     │
│ ├─ Query ventas próximas (7 días) + vencidas                   │
│ ├─ Query servicios próximos (7 días) + vencidos                │
│ └─ Para cada venta/servicio:                                    │
│    ├─ Calcular diasRestantes                                    │
│    ├─ Si cae en umbral (7, 3, 1, vencido):                      │
│    │  ├─ Existe notificación?                                   │
│    │  │  ├─ SÍ → Actualizar (estado, prioridad, acciónSugerida) │
│    │  │  └─ NO → Crear nueva                                    │
│    │  └─ accionSugerida = vencido ? 'cortar' : 'renovar'        │
│    └─ Si NO cae en umbral → Ignorar                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ NOTIFICACIONES EN FIREBASE                                      │
│ ├─ Venta 1: estado='3_dias', prioridad='alta', acción='renovar' │
│ ├─ Venta 2: estado='vencido', prioridad='critica', acción='cortar'│
│ └─ Servicio 1: estado='1_dia', prioridad='critica', acción='renovar'│
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ BELL ICON EN HEADER                                             │
│ ├─ Badge: 3 (unreadCount)                                       │
│ ├─ Color: 🔴 ROJO (hay notificaciones críticas)                │
│ └─ Dropdown:                                                    │
│    ├─ Resumen: "Tienes 3 alerta(s) pendiente(s)"               │
│    ├─ Ventas por vencer: 2                                      │
│    ├─ Servicios por pagar: 1                                    │
│    └─ [Ver todas las notificaciones →]                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                   Usuario hace clic
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ /notificaciones PAGE                                            │
│ ├─ VentasProximasTable (mantener diseño actual)                │
│ │  ├─ Venta 1: [Notificar] [Cancelar] [Renovar]                │
│ │  └─ Venta 2 (vencida): [Notificar] [CORTAR] [Renovar] 🔴     │
│ └─ ServiciosProximosTable (mantener diseño actual)             │
│    └─ Servicio 1: [Renovar] [Ver Servicio]                     │
└─────────────────────────────────────────────────────────────────┘
                            │
              ┌──────────────┴──────────────┐
              │                             │
         RENOVAR                        CORTAR
              │                             │
              ▼                             ▼
   ┌──────────────────────┐      ┌──────────────────────┐
   │ Actualizar venta/    │      │ venta.estado =       │
   │ servicio             │      │ 'inactivo'           │
   │                      │      │                      │
   │ Eliminar             │      │ Liberar perfil       │
   │ notificaciones       │      │                      │
   │ relacionadas         │      │ Eliminar             │
   │                      │      │ notificaciones       │
   │ Badge se actualiza   │      │                      │
   │                      │      │ Badge se actualiza   │
   └──────────────────────┘      └──────────────────────┘
```

---

## 📝 Resumen de Cambios Clave vs. Diseño Inicial

1. ✅ **Acción Sugerida:** Campo `accionSugerida` en Notificación (`'renovar'` | `'cortar'`)
2. ✅ **Lógica de Corte:** Función `handleCortar()` en ambas tablas
3. ✅ **Dropdown Dinámico:** Muestra "Cortar" si vencida, "Cancelar" si no
4. ✅ **Indicador Visual:** Borde rojo en filas vencidas
5. ✅ **Sin Timeline:** Se mantienen las dos tablas actuales (VentasProximasTable + ServiciosProximosTable)
6. ✅ **Eliminación al Cortar:** Auto-elimina notificaciones al cortar venta/servicio

---

**Diseño aprobado para implementación.**
