# Notificaciones v2.1 - Implementation Summary

**Date:** February 12, 2026
**Status:** ✅ Implementation Complete (Ready for Testing)
**Optimization Impact:** 85% reduction in Firebase queries, 50% reduction in reads

---

## Overview

The new Notifications system v2.1 replaces the previous implementation with a fundamentally optimized architecture:

- **Single query per entity** (not 2): Eliminates duplicate queries for "próximas" and "vencidas"
- **Denormalized fields**: All data needed for table display is stored in the notification document
- **No joins at display time**: Table components query only the `notificaciones` collection
- **Type-safe unions**: Discriminated union types with type guards for compile-time safety

---

## Performance Metrics

### Before (v2.1 Original)
| Operation | Queries | Reads |
|-----------|---------|-------|
| Sync (10 ventas + 5 servicios) | 4 | 30 |
| Display table (15 items) | 16 | 30 |
| **Total per session** | **20** | **60** |

### After (v2.1 Corrected)
| Operation | Queries | Reads |
|-----------|---------|-------|
| Sync (10 ventas + 5 servicios) | 2 | 15 |
| Display table (15 items) | 1 | 15 |
| **Total per session** | **3** | **30** |

**Improvement:** 85% fewer queries, 50% fewer reads

---

## Architecture

### Type System (Discriminated Union)

```typescript
// Two separate notification types for type safety
type Notificacion = NotificacionVenta | NotificacionServicio;

interface NotificacionVenta {
  entidad: 'venta';  // Discriminator
  ventaId: string;
  clienteId: string;
  clienteNombre: string;
  servicioNombre: string;
  categoriaNombre: string;
  perfilNombre?: string;
  estado: 'activo' | 'inactivo';
  cicloPago: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio: Date;
  fechaFin: Date;
  // ... common fields (prioridad, diasRestantes, etc.)
}

interface NotificacionServicio {
  entidad: 'servicio';  // Discriminator
  servicioId: string;
  categoriaId: string;
  servicioNombre: string;
  categoriaNombre: string;
  tipo: 'cuenta_completa' | 'perfiles';
  metodoPagoNombre: string;
  moneda: string;
  costoServicio: number;
  cicloPago: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaVencimiento: Date;
  // ... common fields (prioridad, diasRestantes, etc.)
}

// Type guards for safe narrowing
function esNotificacionVenta(n: Notificacion): n is NotificacionVenta
function esNotificacionServicio(n: Notificacion): n is NotificacionServicio
```

### Denormalization Strategy

All fields necessary for table display are denormalized in the notification document:

**Venta Notifications** include:
- Cliente name, service name, category name, profile name
- Venta state and payment cycle info
- Start and end dates (denormalized from last PagoVenta)

**Servicio Notifications** include:
- Service name, category name, type
- Payment method name, currency, cost
- Cycle and expiration date

This eliminates the need for additional queries when displaying tables.

### Synchronization (Daily)

```typescript
// Single optimized query per entity
// fechaFin <= (today + 7 days) includes both próximas AND vencidas
const ventasProximas = await queryDocuments(COLLECTIONS.VENTAS, [
  { field: 'estado', operator: '==', value: 'activo' },
  { field: 'fechaFin', operator: '<=', value: fechaLimite }  // Includes vencidas
]);

// Process each venta
for (const venta of ventasProximas) {
  // Create/update notification with all denormalized fields
  // No additional queries needed
}
```

**Optimization:** Only 2 queries (1 for ventas, 1 for servicios) instead of 4

---

## Files Created/Modified

### New Files

1. **Type Definitions**
   - `src/types/notificaciones.ts` - Discriminated union types with type guards

2. **Services**
   - `src/lib/services/notificationSyncService.ts` - Daily sync with optimized queries
   - `scripts/migrate-venta-fechas.ts` - Data migration for existing ventas

3. **Store**
   - `src/store/notificacionesStore.ts` - Zustand store with CRUD and helpers

4. **Components**
   - `src/components/notificaciones/NotificationBell.tsx` - Bell icon with dropdown
   - `src/components/notificaciones/VentasProximasTableV2.tsx` - Venta table (no extra queries)
   - `src/components/notificaciones/ServiciosProximosTableV2.tsx` - Servicio table (no extra queries)
   - `src/components/notificaciones/AccionesVentaDialog.tsx` - Actions modal

5. **Routes**
   - `src/app/(dashboard)/notificaciones-test/page.tsx` - Test page (parallel route)

### Modified Files

1. **Types**
   - `src/types/ventas.ts` - Removed `@deprecated` from `fechaInicio`, `fechaFin`, `cicloPago`
   - `src/types/index.ts` - Added export for notificaciones types

2. **Stores**
   - `src/store/ventasStore.ts` - Updated `createVenta()` to populate denormalized date fields

3. **Layout**
   - `src/components/layout/Header.tsx` - Integrated NotificationBell
   - `src/app/(dashboard)/layout.tsx` - Added notification sync on mount

4. **Firebase**
   - `firestore.indexes.json` - Added 3 composite indexes for notifications
   - `firestore.rules` - Added security rules for notificaciones collection

---

## Implementation Details

### 1. VentaDoc Denormalization

Previously, `fechaInicio`, `fechaFin`, `cicloPago` were marked `@deprecated` and only existed in `PagoVenta`.

Now they are **required fields** in `VentaDoc`:
- Populated when creating a venta
- Kept synchronized with the most recent `PagoVenta`
- Used by notification sync service (avoids N additional queries)

**Migration:** `scripts/migrate-venta-fechas.ts` updates existing ventas to populate these fields from their last payment.

### 2. Notification Store

**State Management:**
- `notificaciones: (Notificacion & { id: string })[]`
- `isLoading`, `error`, `lastFetch` (5-minute cache)
- Count metrics: `totalNotificaciones`, `ventasProximas`, `serviciosProximos`

**Actions:**
- `fetchNotificaciones(force?)` - Load from Firestore with cache
- `toggleLeida(id, leida)` - Mark as read/unread
- `toggleResaltada(id, resaltada)` - Mark as important/starred
- `deleteNotificacionesPorVenta(ventaId)` - Clean up on venta delete
- `deleteNotificacionesPorServicio(servicioId)` - Clean up on servicio delete

**Helpers:**
- `getVentasNotificaciones()` - Type-safe filtered list
- `getServiciosNotificaciones()` - Type-safe filtered list
- `getNotificacionesResaltadas()` - Starred notifications

### 3. NotificationBell Component

**Features:**
- Badge shows unread count with dynamic color hierarchy
  - 🔴 Red: If any "critica" priority
  - 🟠 Orange: If any resaltadas (starred)
  - 🟡 Yellow: If any "alta"/"media"
  - ⚫ Gray: Only "baja" or empty
- Dropdown shows top 5 unread notifications
- "Ver todas" link to `/notificaciones-test`

**Type-Safe:** Uses `esNotificacionVenta()` and `esNotificacionServicio()` type guards

### 4. Table Components (V2)

**VentasProximasTableV2:**
- Displays venta notifications with complete info (NO extra queries)
- Type-safe filtering with `esNotificacionVenta` guard
- Sort by: resaltadas first, then priority, then days remaining
- Actions: Mark as read/unread, toggle starred, open actions dialog

**ServiciosProximosTableV2:**
- Displays servicio notifications with complete info (NO extra queries)
- Type-safe filtering with `esNotificacionServicio` guard
- Shows service name, category, type, payment method, cost, cycle, expiration

### 5. Test Page

**URL:** `/notificaciones-test`

**Features:**
- Metric cards showing totals and sync status
- Manual sync trigger (bypasses cache)
- Tabs for Ventas/Servicios tables
- Development info card showing query counts
- Actions dialog for venta notifications

**Purpose:** Test the new implementation without breaking existing `/notificaciones` page

---

## Firebase Configuration

### Composite Indexes

```json
{
  "collectionGroup": "notificaciones",
  "fields": [
    { "fieldPath": "entidad", "order": "ASCENDING" },
    { "fieldPath": "ventaId", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "notificaciones",
  "fields": [
    { "fieldPath": "entidad", "order": "ASCENDING" },
    { "fieldPath": "servicioId", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "notificaciones",
  "fields": [
    { "fieldPath": "prioridad", "order": "DESCENDING" },
    { "fieldPath": "diasRestantes", "order": "ASCENDING" }
  ]
}
```

### Security Rules

```
match /notificaciones/{docId} {
  allow read, write: if isAuthenticated();
}
```

### Deploy Commands

```bash
firebase deploy --only firestore:indexes,firestore:rules
```

---

## Data Migration

### Step 1: Run Migration Script

```bash
npx ts-node scripts/migrate-venta-fechas.ts
```

This updates all existing ventas to populate:
- `fechaInicio` (from most recent PagoVenta)
- `fechaFin` (from most recent PagoVenta)
- `cicloPago` (from most recent PagoVenta)

**Safe to run multiple times** (idempotent - skips already migrated documents)

### Step 2: Deploy Indexes & Rules

```bash
firebase deploy --only firestore:indexes,firestore:rules
```

---

## Testing Checklist

### Functionality
- [ ] NotificationBell shows correct badge color (hierarchy: critica > resaltada > alta/media > baja)
- [ ] Bell dropdown shows top 5 unread notifications
- [ ] "Ver todas" link navigates to `/notificaciones-test`
- [ ] Notification marked as read when clicking bell icon
- [ ] Notification marked as starred when clicking star icon
- [ ] Venta actions dialog shows options when resaltada=false
- [ ] Venta actions dialog shows direct action buttons when resaltada=true

### Performance
- [ ] Load `/notificaciones-test` - should have ≤ 1 Firebase query
- [ ] No additional queries when showing tables (verify in Network tab)
- [ ] Notification bell renders without extra queries
- [ ] Bell dropdown shows without additional queries

### Data
- [ ] All notifications have correct denormalized fields
- [ ] Venta notifications include: clienteNombre, servicioNombre, categoriaNombre, fechaFin
- [ ] Servicio notifications include: servicioNombre, categoriaNombre, metodoPagoNombre
- [ ] Notifications updated daily (localStorage cache verified)
- [ ] Old notifications cleaned up when venta/servicio deleted

### Migration
- [ ] All existing ventas have fechaInicio, fechaFin, cicloPago populated
- [ ] Values match most recent PagoVenta for each venta
- [ ] No data loss or corruption

---

## Important Notes

### Critical Blocker Resolution

The original plan v2.1 had a critical blocker: `fechaFin` was marked `@deprecated` in `VentaDoc` but the sync service depended on it.

**Solution Implemented:**
- Denormalized `fechaFin`, `fechaInicio`, `cicloPago` as required fields in `VentaDoc`
- These fields are populated when creating/renewing a venta
- Migration script updates existing data
- This approach is **faster** (no extra queries) than querying `pagosVenta` during sync

### Zero Downtime Migration

The implementation uses a **parallel route** approach:
- Old `/notificaciones` page continues working
- New `/notificaciones-test` allows testing without breaking anything
- Once verified, can migrate to production

### Cached Synchronization

Daily sync uses localStorage cache:
- Sync runs only once per calendar day
- `sincronizarNotificacionesForzado()` bypasses cache for manual refresh
- Prevents multiple syncs on app reload or navigation

---

## Next Steps (Post-Implementation)

### Immediate
1. [ ] Run migration script in development
2. [ ] Test on `/notificaciones-test` page
3. [ ] Verify Firebase read counts in dev tools

### Phase 2 (Integration)
1. [ ] Decide on URL: keep `/notificaciones-test` or merge into `/notificaciones`
2. [ ] Add to Sidebar navigation
3. [ ] Remove or deprecate old notification system

### Phase 3 (Enhancement)
1. [ ] Add real-time updates (Firestore listeners)
2. [ ] Email notifications integration
3. [ ] WhatsApp message integration
4. [ ] Advanced filtering and search

### Phase 4 (Production)
1. [ ] Add error tracking and monitoring
2. [ ] Performance profiling in production
3. [ ] User feedback collection
4. [ ] Scaling considerations

---

## Key Learnings

### Denormalization vs. Queries

**Rule of thumb:**
- If a field is **read frequently** but **changes rarely** → denormalize
- If a field is **read once** or **changes frequently** → keep normalized

In this case:
- `fechaFin` is read daily during sync and on every page load → denormalize ✅
- `clienteNombre` is read every time notification displays → denormalize ✅
- But we still need to query for updates (can't cache forever)

### Query Optimization Patterns

1. **Combine queries:** Use single query with inclusive date range instead of two separate queries
2. **Denormalize:** Store frequently-read fields directly
3. **Type safety:** Discriminated unions prevent bugs at compile time
4. **Cache strategically:** Daily sync cache prevents excessive queries

### Firestore Best Practices

- Use composite indexes for compound queries
- Denormalize denormalized fields (contradictory but true for frequently-read data)
- Document immutable fields (activity logs, notifications)
- Always provide type safety with TypeScript unions

---

## Related Documentation

- [Pagination and Cache Pattern](PAGINATION_AND_CACHE_PATTERN.md)
- [Firebase Reads Monitoring](FIREBASE_READS_MONITORING.md)
- [Denormalization Analysis](DENORMALIZATION_ANALYSIS_PROCESS.md)

---

**Status:** ✅ Ready for Testing
**Last Updated:** February 12, 2026
