# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), sales, categories, payment methods, and automatic notifications. Integrated with **Firebase** (Authentication + Firestore + Analytics).

**Note**: Legacy Subscriptions and Service Payments modules were removed in January 2026 (commit db25141). Replaced by **Ventas** module and **Servicios Detalle** system.

## 🔥 CRITICAL RULES (Always Follow)

1. **Tables with >10 items** → MUST use `useServerPagination` hook (never `getAll()`)
2. **Metrics/counts** → Use `getCount()` (free on Spark, not `getAll().length`)
3. **Secondary data hooks** → Module-level `Map` cache (never `useRef`) + `enabled: !isLoading`
4. **Financial totals** → Use `sumInUSD()` + `formatAggregateInUSD()` (multi-currency)
5. **Category counters** → Never update manually; managed atomically by `serviciosStore`
6. **Venta payments** → Stored in `pagosVenta` collection (not embedded in venta doc)
7. **MetodoPago** → Use `asociadoA: 'usuario' | 'servicio'` to segregate
8. **Font** → NEVER use `font-mono`. Always use Inter (default)
9. **Stores** → NEVER use deprecated `clientesStore`/`revendedoresStore`; use `usuariosStore`
10. **Counter function** → Use `adjustServiciosActivos()` (not deprecated `adjustVentasActivas()`)

**Full pagination guide**: `docs/PAGINATION_AND_CACHE_PATTERN.md`
**Currency conversion guide**: `docs/plans/2026-02-12-currency-conversion-design.md`

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui + Radix UI | Latest |
| State | Zustand | 5.0.10 |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 |
| Backend | Firebase (Auth + Firestore + Analytics) | 12.8.0 |
| Charts | Recharts | 3.7.0 |
| Date | date-fns | 4.1.0 |
| Testing | Vitest | 4.0.18 |

---

## Project Structure

```
src/
├── app/(dashboard)/     # Routes: dashboard, servicios, usuarios, ventas, categorias, metodos-pago
├── components/          # By feature: layout, dashboard, servicios, ventas, usuarios, categorias, metodos-pago, shared, ui
├── hooks/               # useServerPagination, use-ventas-por-usuarios, use-ventas-usuario, use-pagos-venta, useVentasMetrics
├── lib/
│   ├── firebase/        # auth.ts, config.ts, firestore.ts (CRUD), pagination.ts
│   ├── services/        # metricsService.ts, pagosVentaService.ts, currencyService.ts
│   └── utils/           # calculations.ts, whatsapp.ts, analytics.ts, devLogger.ts
├── store/               # 9 Zustand stores (authStore, usuariosStore, serviciosStore, ventasStore, categoriasStore, metodosPagoStore, activityLogStore, configStore, templatesStore)
└── types/               # auth, categorias, clientes, common, dashboard, metodos-pago, servicios, ventas, whatsapp
```

---

## Firebase

### Collections (`src/lib/firebase/firestore.ts`)
```typescript
COLLECTIONS = {
  USUARIOS, SERVICIOS, CATEGORIAS, METODOS_PAGO,
  ACTIVITY_LOG, CONFIG, GASTOS, TEMPLATES,
  PAGOS_SERVICIO, VENTAS, PAGOS_VENTA
}
```

### Key Functions
| Task | Function | Cost |
|------|----------|------|
| Get paginated | `getPaginated<T>(collection, options)` | pageSize+1 reads |
| Count docs | `getCount(collection, filters)` | **0 reads (free)** |
| Get all | `getAll<T>(collection)` | N reads |
| Query | `queryDocuments<T>(collection, filters)` | N reads |
| Get one | `getById<T>(collection, id)` | 1 read |
| Create | `create(collection, data)` | 1 write |
| Update | `update(collection, id, data)` | 1 write |
| Delete | `remove(collection, id)` | 1 write |
| Increment | `adjustServiciosActivos(id, delta)` | 1 write |

All CRUD functions auto-convert Firestore Timestamps to Dates. `create()`/`update()` strip `undefined` fields.

### Config (`.env.local`)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# Or use: FIREBASE_WEBAPP_CONFIG='{"apiKey":"...",...}'
```

---

## State Management (Zustand)

All stores: 5-min cache TTL, error states, optimistic deletes with rollback.

**Store pattern:**
```typescript
fetchItems: async (force = false) => {
  if (!force && lastFetch && Date.now() - lastFetch < 300000) return logCacheHit(COLLECTIONS.X);
  set({ isLoading: true, error: null });
  try {
    const items = await getAll<T>(COLLECTIONS.X);
    set({ items, isLoading: false, lastFetch: Date.now() });
  } catch (e) { set({ error: e.message, isLoading: false }); }
}
```

**Stores:**
- `authStore` — Firebase auth + localStorage
- `usuariosStore` — Unified clients+resellers. Selectors: `getClientes()`, `getRevendedores()`. Has `fetchCounts()`.
- `serviciosStore` — Manages category counters atomically. Has `fetchCounts()`, `updatePerfilOcupado()`.
- `ventasStore` — Creates `PagoVenta` on create. Has `fetchCounts()`.
- `categoriasStore` — Denormalized counters (totalServicios, serviciosActivos, perfilesDisponiblesTotal).
- `metodosPagoStore` — `fetchMetodosPagoUsuarios()`, `fetchMetodosPagoServicios()`, `toggleActivo()`.
- `activityLogStore`, `configStore`, `templatesStore` (localStorage)

---

## Type System (`src/types/`)

- **`Usuario`** (`clientes.ts`) — `tipo: 'cliente' | 'revendedor'`, `serviciosActivos` (denormalized), `moneda`
- **`Servicio`** (`servicios.ts`) — `metodoPagoNombre`, `moneda`, `gastosTotal` (denormalized)
- **`VentaDoc`** (`ventas.ts`) — `categoriaNombre`, `servicioContrasena` (denormalized). `pagos` field @deprecated.
- **`PagoVenta`** (`ventas.ts`) — Separate `pagosVenta` collection. Has `ventaId`, `clienteId`, `clienteNombre`, `metodoPago`, `moneda`.
- **`Categoria`** (`categorias.ts`) — `totalServicios`, `serviciosActivos`, `perfilesDisponiblesTotal` counters. Has `planes: Plan[]`.
- **`MetodoPago`** (`metodos-pago.ts`) — `asociadoA: 'usuario' | 'servicio'`.

**Payment Cycles**: `mensual` (1m), `trimestral` (3m), `semestral` (6m), `anual` (12m)

---

## Multi-Currency System

Individual rows → original currency. Aggregated totals → USD.

```typescript
// Totals: use sumInUSD + formatAggregateInUSD
const total = await sumInUSD(pagos.map(p => ({ monto: p.monto, moneda: p.moneda })));
<MetricCard value={formatAggregateInUSD(total)} />

// Rows: keep original currency
<td>{getCurrencySymbol(pago.moneda)} {pago.monto.toFixed(2)}</td>
```

Exchange rates from `open.er-api.com` (free, no API key). Cached in Firestore `config/exchange_rates` for 24h.

---

## Module Details

### Servicios
- `tipo`: `cuenta_completa` | `perfiles`
- Denormalized: `metodoPagoNombre`, `moneda`, `gastosTotal`
- Payment history in `pagosServicio` collection (created automatically on service creation)
- Detail page: `/servicios/detalle/[id]`
- On delete: dispatches `window.dispatchEvent(new Event('servicio-deleted'))`

### Ventas
- Collection: `ventas`. Payments: `pagosVenta` (separate collection)
- Create flow: venta doc + initial `PagoVenta` record created together
- On delete: `updatePerfilOcupado(servicioId, false)` + `adjustServiciosActivos(clienteId, -1)`
- On delete: dispatches `window.dispatchEvent(new Event('venta-deleted'))`
- Hooks: `use-pagos-venta.ts`, `use-ventas-usuario.ts`

### Usuarios
- Single `usuarios` collection with `tipo: 'cliente' | 'revendedor'`
- Denormalized: `serviciosActivos` (via `adjustServiciosActivos()`), `moneda`, `metodoPagoNombre`

### Categorias
- Counters managed atomically by `serviciosStore` (not manually)
- `gastosTotal` NOT denormalized — calculated from `pagosServicio`

### Metodos de Pago
- `asociadoA: 'usuario' | 'servicio'` — always use filtered fetch methods

### Authentication
- Firebase Auth. Email with `admin@` = admin role.
- Route protection: client-side in `(dashboard)/layout.tsx`, server-side placeholder in `proxy.ts`

---

## Data Flow

1. Mount → `fetchItems()` checks 5-min cache → Firebase if stale
2. Local filtering via `useMemo` (no extra reads)
3. CRUD → store method → Firebase + local state + toast
4. Mutations → atomic `increment()` for denormalized counters
5. Cross-module events via `window.dispatchEvent()`

---

## UI Conventions

**Status colors**: Activa=green, Suspendida=yellow, Inactiva=gray, Vencida=red

**Expiration warnings**: <1d=red-600, <3d=red-500, <7d=yellow-500, 100+d=green

**Icons (lucide-react)**: Edit=`Pencil`, Delete=`Trash2`, WhatsApp=`MessageCircle` (green-600), Add=`Plus`, Back=`ArrowLeft`

**Metrics grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` (6 cards: add `xl:grid-cols-6`)

**Font**: Inter only. NEVER `font-mono`.

---

## Common Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest

firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy
```

---

## Known Issues

1. `/configuracion` — sidebar link exists but route is 404
2. Dashboard — placeholder/static data, not connected to Firebase
3. `VentaDoc.pagos` — @deprecated embedded array; use `pagosVenta` collection

---

## Documentation Index

| Topic | File |
|-------|------|
| Pagination & cache | `docs/PAGINATION_AND_CACHE_PATTERN.md` |
| Currency conversion | `docs/plans/2026-02-12-currency-conversion-design.md` |
| Firebase setup | `docs/FIREBASE_SETUP.md` |
| Firebase reads monitoring | `docs/FIREBASE_READS_MONITORING.md` |
| React optimizations | `docs/PERFORMANCE_OPTIMIZATIONS.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Denormalization | `docs/DENORMALIZATION_ANALYSIS_PROCESS.md` |

---

**Last Updated:** February 2026 | **Version:** 2.3.0
