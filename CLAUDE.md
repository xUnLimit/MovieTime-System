# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), sales, categories, payment methods, and automatic notifications. The system is integrated with **Firebase** (Authentication + Firestore + Analytics) for data persistence and tracking.

**Note**: The legacy Subscriptions (Suscripciones) and Service Payments (Pagos de Servicios) modules were removed in January 2026 (commit db25141). They have been replaced by the **Ventas** (Sales) module and the **Servicios Detalle** payment/renewal system.

## 🔥 CRITICAL OPTIMIZATION PATTERNS (Read First)

### Server-Side Pagination Pattern — MANDATORY for all table modules

**IMPORTANT**: Any module with a table listing documents MUST use server-side pagination with cursors to minimize Firebase reads.

**Quick Decision Tree:**
```
Does your module have a table with >10 items?
├─ YES → Use useServerPagination hook (see section below)
│   ├─ Need counts for metrics? → Use getCount() in store (free on Spark)
│   ├─ Need related data per row? → Create hook with module-level cache + enabled param
│   └─ Field read often but changes rarely? → Denormalize + use increment()
└─ NO → Can use getAll() but still consider pagination for future scaling
```

**Impact:** Usuarios module went from 50-100+ reads per session to **16 reads (first visit) → 0 reads (cached 5 min)** = **84% reduction**

**Reference Implementation:** Usuarios module (`/usuarios` page)
- Study files: `useServerPagination.ts`, `use-ventas-por-usuarios.ts`, `pagination.ts`, `usuariosStore.ts`
- Complete guide: `docs/PAGINATION_AND_CACHE_PATTERN.md`

**Key Rules:**
1. ✅ Use `useServerPagination` for table data (not `getAll`)
2. ✅ Use `getCount()` for metrics (not `getAll().length`)
3. ✅ Module-level `Map` for cache (not `useRef`)
4. ✅ `enabled: !isLoading` on secondary hooks
5. ✅ Denormalize frequently-read fields + `increment()`

See "Server-Side Pagination Pattern" section for full details.

---

## Project Structure (Updated Feb 2026)

```
MovieTime System/
├── proxy.ts                   # Next.js 16 Edge Runtime proxy (root level)
├── vitest.config.ts          # Test configuration
├── next.config.ts            # Next.js configuration (with FIREBASE_WEBAPP_CONFIG support)
├── components.json           # shadcn/ui configuration
├── eslint.config.mjs         # ESLint configuration
├── firebase.json             # Firebase project config (Firestore rules + indexes)
├── firestore.rules           # Firestore security rules (role-based access)
├── firestore.indexes.json    # Composite indexes for optimized queries
├── .firebaserc               # Firebase project alias
├── .env.local                # Firebase credentials (not in repo)
├── .env.local.example        # Example environment variables
├── scripts/                   # Migration & utility scripts
│   └── migrate-metodopago-denormalization.ts  # MetodoPago denormalization migration
├── docs/                      # Documentation (24 files)
│   ├── PAGINATION_AND_CACHE_PATTERN.md  # Server-side pagination guide
│   ├── LOG_DEDUPLICATION.md             # Development logging system
│   ├── PERFORMANCE_OPTIMIZATIONS.md     # React optimization patterns
│   ├── USUARIOS_MIGRATION.md            # Unified collection migration
│   ├── DEVELOPER_GUIDE.md              # General development guide
│   ├── IMPLEMENTATION_STATUS.md         # Feature completion status
│   ├── IMPLEMENTATION_SUMMARY.md        # Architecture summary
│   ├── QUICK_START.md                   # Getting started guide
│   ├── FIREBASE_SETUP.md               # Firebase configuration
│   ├── FIREBASE_READS_MONITORING.md     # Firebase reads monitoring guide
│   ├── OPTIMIZATIONS_SUMMARY.md         # All optimizations overview
│   ├── FORMULARIO_CREAR_USUARIO.md      # User form implementation
│   ├── ARCHITECTURE.md                  # System architecture overview
│   ├── C4_DIAGRAMS.md                   # C4 architecture diagrams
│   ├── ACTION_PLAN.md                   # Development action plan
│   ├── EVALUATION_SUMMARY.md            # Architecture evaluation
│   ├── DENORMALIZATION_ANALYSIS_PROCESS.md  # Denormalization strategy
│   ├── SERVICIOS_OPTIMIZATION.md        # Servicios module optimization
│   ├── SERVICIOS_DETALLE_OPTIMIZATION.md # Servicios Detalle optimization
│   ├── METODOS_PAGO_OPTIMIZATION.md     # Métodos de Pago optimization
│   ├── NUEVA_VENTA_FORM_OPTIMIZATION.md # Venta form optimization
│   ├── DESARROLLO_LOG_DEDUPLICATION_SUMMARY.md # Log dedup dev summary
│   ├── DETALLE_PAGES_OPTIMIZATION.md    # Detail pages optimization
│   └── README_DOCUMENTATION.md          # README docs
├── public/                    # Static assets
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
└── src/
    ├── app/                  # Next.js App Router
    ├── components/           # React components by feature
    │   ├── layout/          # Sidebar, Header, NotificationBell, ThemeProvider, ThemeToggle, UserMenu
    │   ├── dashboard/       # Dashboard metrics & charts (5 files)
    │   ├── servicios/       # Services components (14 files, includes ServicioDetailMetrics)
    │   ├── ventas/          # Sales components (5 files: VentasForm, VentasEditForm, VentasTable, VentasMetrics, VentaPagosTable)
    │   ├── usuarios/        # Clients & Resellers components (6 files)
    │   ├── categorias/      # Categories components (7 files)
    │   ├── metodos-pago/    # Payment methods components (6 files)
    │   ├── notificaciones/  # Notifications components (4 files)
    │   ├── editor-mensajes/ # WhatsApp template editor (4 files)
    │   ├── log-actividad/   # Activity log components (2 files)
    │   ├── shared/          # Shared components (9 files, includes MetricCard, ModuleErrorBoundary)
    │   └── ui/              # shadcn/ui components (21 files)
    ├── config/               # Configuration files
    │   ├── constants.ts      # App constants
    │   ├── env.ts           # Environment config
    │   └── site.ts          # Site metadata
    ├── hooks/                # Custom React hooks (6 hooks)
    │   ├── use-sidebar.ts           # Sidebar toggle state hook
    │   ├── useVentasMetrics.ts      # Ventas metrics calculation hook
    │   ├── useServerPagination.ts   # Server-side pagination with cursors
    │   ├── use-ventas-por-usuarios.ts # Secondary query with module-level cache
    │   ├── use-ventas-usuario.ts    # Single user's ventas + renovaciones (module-level cache)
    │   └── use-pagos-venta.ts       # Pagos de una venta específica
    ├── lib/                  # Utilities and helpers
    │   ├── firebase/        # Firebase integration
    │   │   ├── auth.ts     # Authentication functions
    │   │   ├── config.ts   # Firebase initialization (Auth + Firestore + Analytics)
    │   │   ├── firestore.ts # Generic CRUD + COLLECTIONS + queryDocuments (with auto timestamp conversion)
    │   │   └── pagination.ts # Pagination utilities
    │   ├── services/        # Business logic layer
    │   │   ├── metricsService.ts     # Metrics calculations
    │   │   └── pagosVentaService.ts  # Pagos de venta CRUD (create initial, renewal, query)
    │   ├── utils/           # Utility functions
    │   │   ├── calculations.ts # Business logic
    │   │   ├── whatsapp.ts    # WhatsApp utilities
    │   │   ├── analytics.ts   # Firebase Analytics wrappers (track ventas, usuarios, errors)
    │   │   ├── devLogger.ts   # Dev-only logging with deduplication (React Strict Mode safe)
    │   │   ├── cn.ts          # Class utilities
    │   │   └── index.ts       # Exports
    │   └── constants/       # Application constants (includes CYCLE_MONTHS)
    ├── store/                # Zustand stores (Firebase-integrated, 10 stores)
    ├── test/                 # Test utilities
    │   ├── setup.ts         # Test setup
    │   └── utils.ts         # Test helpers
    └── types/                # TypeScript types (separated by domain)
        ├── index.ts         # Barrel export
        ├── auth.ts          # Authentication types
        ├── categorias.ts    # Category types (Categoria + Plan interfaces)
        ├── clientes.ts      # Usuario type (unified cliente + revendedor)
        ├── common.ts        # Shared types (ActivityLog, Configuracion, Gasto, TemplateMensaje)
        ├── dashboard.ts     # Dashboard types
        ├── metodos-pago.ts  # Payment method types (MetodoPago + asociadoA)
        ├── notificaciones.ts # Notification types
        ├── servicios.ts     # Servicio + PagoServicio types
        ├── ventas.ts        # VentaDoc + PagoVenta + VentaPago (deprecated) types
        └── whatsapp.ts      # WhatsApp types
```

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server on localhost:3000
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Run Vitest tests
npm run test:ui      # Run Vitest with UI
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Firebase Deployment
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy composite indexes
firebase deploy                           # Deploy everything

# Firebase Authentication
# Configure test credentials in Firebase Console
# Default: admin@movietime.com / any 6+ character password
```

## Architecture Overview

### Firebase Integration

The app uses **Firebase** for authentication, data persistence, and analytics:

**Firestore Collections** (defined in `src/lib/firebase/firestore.ts`):
```typescript
export const COLLECTIONS = {
  USUARIOS: 'usuarios',           // Unified users (clientes + revendedores)
  SERVICIOS: 'servicios',
  CATEGORIAS: 'categorias',
  NOTIFICACIONES: 'notificaciones',
  METODOS_PAGO: 'metodosPago',
  ACTIVITY_LOG: 'activityLog',
  CONFIG: 'config',
  GASTOS: 'gastos',
  TEMPLATES: 'templates',
  PAGOS_SERVICIO: 'pagosServicio', // Payment history per service
  VENTAS: 'ventas',               // Sales records
  PAGOS_VENTA: 'pagosVenta',      // Payment history per venta (separate collection)
} as const;
```

**Firebase Configuration** (`.env.local` or `FIREBASE_WEBAPP_CONFIG` JSON env):
```bash
# Option A: Individual env vars
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Option B: Single JSON env var (for deployment platforms like Firebase Hosting)
FIREBASE_WEBAPP_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...",...}'
```

**Firebase Functions** (`src/lib/firebase/firestore.ts`):
- `getAll<T>(collection)` - Fetch all documents (auto-converts Timestamps to Dates)
- `getById<T>(collection, id)` - Fetch single document (auto-converts Timestamps to Dates)
- `queryDocuments<T>(collection, filters)` - Query with `where` filters (auto-converts Timestamps to Dates)
- `getCount(collection, filters)` - Count documents (does NOT cost doc-reads on Spark plan)
- `create<T>(collection, data)` - Create document (auto-adds `createdAt`/`updatedAt`)
- `update<T>(collection, id, data)` - Update document (auto-updates `updatedAt`)
- `remove(collection, id)` - Delete document
- `adjustServiciosActivos(clienteId, delta)` - Atomically increment/decrement `serviciosActivos` field
- `adjustVentasActivas()` - **@deprecated** alias for `adjustServiciosActivos`
- `timestampToDate(timestamp)` - Convert Firestore Timestamp → Date (rarely needed now)
- `dateToTimestamp(date)` - Convert Date → Firestore Timestamp
- `convertTimestamps(data)` - Recursively convert Timestamps (auto-used in all queries)
- `logCacheHit(collection)` - Dev-only: log when cache avoids a Firestore read

**Firebase Pagination** (`src/lib/firebase/pagination.ts`):
- `getPaginated<T>(collection, options)` - Fetch paginated docs with cursor (costs `pageSize + 1` reads)

**Firebase Auth** (`src/lib/firebase/auth.ts`):
- `signInUser()`, `signOutUser()`, `onAuthChange()`

**Firebase Analytics** (`src/lib/utils/analytics.ts`):
- `trackVentaCreada(data)` - Track sale creation
- `trackUsuarioCreado(tipo)` - Track user creation
- `trackServicioCreado(data)` - Track service creation
- `trackBusqueda(modulo, termino)` - Track searches
- `trackEliminacion(entidad)` - Track deletions
- `trackError(errorType, errorMessage)` - Track app errors
- Analytics is initialized only on client-side in production

### Firebase Security Rules

Security rules are defined in `firestore.rules` with role-based access:
- **Helper functions**: `isAuthenticated()`, `isAdmin()`, `isOwner()`, `isOperador()`, `hasRequiredFields()`
- **Admin via Custom Claims**: `request.auth.token.admin == true` (set via Firebase Admin SDK)
- **Read access**: All authenticated users can read all collections
- **Write access**: Admins have full write access; operadores can create ventas and notifications, update own profile
- **Activity Log**: Write-only audit trail (no updates or deletes allowed)
- **Legacy collections** (`clientes`, `revendedores`, `suscripciones`): Read-only, writes blocked

### Firestore Composite Indexes

Indexes are defined in `firestore.indexes.json` for optimized queries:
- `ventas`: clienteId+estado+fechaFin, servicioId+estado, estado+fechaFin, clienteId+createdAt
- `usuarios`: tipo+createdAt, tipo+ventasActivas
- `servicios`: categoriaId+createdAt, tipo+fechaVencimiento
- `notificaciones`: prioridad+fechaCreacion, leida+fechaCreacion
- `pagosServicio`: servicioId+fechaPago
- `activityLog`: usuario+fecha

### State Management with Zustand

The app uses **Zustand** stores (not Redux) with **Firebase integration**:

- All stores are in `src/store/` directory
- Each store uses Firebase Firestore for data persistence
- Stores handle loading states, error states, and caching (5-minute TTL)
- Only `authStore` and `templatesStore` persist to localStorage
- All CRUD operations are async and update Firestore
- All stores include `fetchCounts()` for metrics using `getCount()` (free queries)
- All delete operations use optimistic updates with rollback on error

**Critical Store Pattern:**
```typescript
// Always use this pattern in stores
fetchItems: async (force = false) => {
  if (!force && lastFetch && Date.now() - lastFetch < 300000) {
    logCacheHit(COLLECTIONS.ITEMS);
    return;
  }
  set({ isLoading: true, error: null });
  try {
    const items = await getAll<Item>(COLLECTIONS.ITEMS);
    set({ items, isLoading: false, error: null, lastFetch: Date.now() });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}
```

### Store Directory (10 active stores)

All stores in `src/store/` are Firebase-integrated with **error states**, **caching**, and **optimistic updates**:

1. **authStore.ts** - Firebase authentication + localStorage persistence
2. **usuariosStore.ts** - Manages both clients and resellers in unified `usuarios` collection. Has `fetchCounts()` for metrics (totalClientes, totalRevendedores, totalNuevosHoy, totalUsuariosActivos). `getClientes()` / `getRevendedores()` selectors. ✅ Error state + optimistic deletes with rollback.
3. **serviciosStore.ts** - Services management. Creates initial `PagoServicio` record on service creation. Manages category counters atomically with `increment()` (totalServicios, serviciosActivos, perfilesDisponiblesTotal, gastosTotal). Has `fetchCounts()` for metrics + `updatePerfilOcupado()`. Denormalizes `metodoPagoNombre` and `moneda` from MetodoPago. ✅ Error state + optimistic deletes.
4. **ventasStore.ts** - Sales management with caching (5-minute timeout), error states, and optimistic updates. Creates `PagoVenta` records in separate collection on venta creation. Handles profile occupancy + `serviciosActivos` counter updates on delete. Has `fetchCounts()`.
5. **categoriasStore.ts** - Categories with denormalized counters (initialized at 0 on creation). Has `fetchCounts()` for metrics (totalCategorias, categoriasClientes, categoriasRevendedores). ✅ Error state + optimistic deletes.
6. **metodosPagoStore.ts** - Payment methods with `asociadoA` segregation. Has `fetchMetodosPagoUsuarios()`, `fetchMetodosPagoServicios()`, `toggleActivo()`, `fetchCounts()` for metrics. ✅ Error state.
7. **notificacionesStore.ts** - Notifications (Firebase) ✅ Error state.
8. **activityLogStore.ts** - Activity logs (Firebase) ✅ Error state.
9. **configStore.ts** - Configuration settings (Firebase) ✅ Error state.
10. **templatesStore.ts** - Message templates (localStorage persistence) ✅ Error state.

### Type System

Types are **organized by domain** in `src/types/` directory:
- `auth.ts` - User, authentication, role-based access
- `categorias.ts` - `Categoria` interface with denormalized counters (`totalServicios`, `serviciosActivos`, `perfilesDisponiblesTotal`), `Plan` interface (name, price, cycle, type), optional fields (`tipoCategoria`, `planes`, `iconUrl`, `color`)
- `clientes.ts` - Unified `Usuario` type with `tipo: 'cliente' | 'revendedor'`. Fields: `serviciosActivos` (denormalized count of active ventas, updated via `increment()`), `montoSinConsumir`, `moneda` (denormalized from MetodoPago). Type guards `esCliente()` / `esRevendedor()`. Legacy `suscripcionesTotales` field for revendedores.
- `common.ts` - Shared types (ActivityLog, Configuracion, Gasto, TemplateMensaje)
- `dashboard.ts` - Dashboard metrics (contains legacy `suscripcionesActivas` field)
- `metodos-pago.ts` - `MetodoPago` with `asociadoA: 'usuario' | 'servicio'` field for segregation. Types: `TipoMetodoPago`, `TipoCuenta`, `AsociadoA`. Service-specific fields: `email`, `contrasena`, `numeroTarjeta`, `fechaExpiracion`.
- `notificaciones.ts` - Notifications
- `servicios.ts` - `Servicio` interface (with `gastosTotal` accumulated sum, denormalized `metodoPagoNombre` + `moneda`) + `PagoServicio` interface (payment history per service, with denormalized `metodoPagoNombre` + `moneda`) + `ServicioFormData`
- `ventas.ts` - `VentaDoc` (sale document, with denormalized `categoriaNombre`, `servicioContrasena`), `PagoVenta` (payment in separate `pagosVenta` collection, with denormalized `clienteId`, `clienteNombre`, `metodoPagoId`, `metodoPago`, `moneda`), `VentaPago` (@deprecated, legacy embedded payment format)
- `whatsapp.ts` - `WhatsAppData` interface
- `index.ts` - Barrel export (imports work from `@/types`)

Key concepts:

- **Payment Cycles**: `mensual` (1 month), `trimestral` (3 months), `semestral` (6 months), `anual` (12 months)
- **Notification Days**: [100, 11, 8, 7, 3, 2, 1] - notifications sent at these intervals before expiration
- **User Roles**: `admin` (full access), `operador` (limited access)

### Calculation Utilities

All business logic calculations are in `src/lib/utils/calculations.ts`:

- `calcularFechaVencimiento()` - Computes expiration date from start date + cycle
- `calcularConsumo()` - Returns 0-100% consumption based on elapsed time
- `calcularMontoRestante()` - Amount remaining based on consumption
- `calcularEstadoSuscripcion()` - Determines if subscription is `activa` or `vencida`
- `formatearMoneda()` - Formats numbers as USD currency

### WhatsApp Integration

WhatsApp utilities in `src/lib/utils/whatsapp.ts`:

- `getSaludo()` - Returns time-based greeting (Buenos dias/tardes/noches)
- `replacePlaceholders(template, data)` - Replaces template variables using `WhatsAppData`
- `generateWhatsAppLink(phone, message)` - Creates `wa.me` links with pre-filled messages
- `openWhatsApp(phone, message)` - Opens WhatsApp in a new window
- `formatearFechaWhatsApp(fecha)` - Formats a Date as "d de MMMM de yyyy" in Spanish
- `generarMensajeVenta(template, venta)` - Generates a complete WhatsApp message for a sale using a template

**Available Placeholders**: `{saludo}`, `{cliente}`, `{servicio}`, `{perfil_nombre}`, `{categoria}`, `{correo}`, `{contrasena}`, `{vencimiento}`, `{monto}`, `{codigo}`, `{items}`, `{diasRetraso}`

Templates are managed in `templatesStore` and persisted to localStorage.

### Development Logging (devLogger)

`src/lib/utils/devLogger.ts` provides dev-only logging with automatic deduplication for React Strict Mode:

- `logCacheHit(collection, details?)` - Orange badge: `[Cache] Hit (collection)`
- `logFirestoreOp(operation, collection, details, duration)` - Colored badge by operation type (getAll=green, query=green, paginated=blue, count=purple)
- `logVentasCacheHit(clientCount, ageSeconds)` - Green badge for ventas cache hits
- Debounce window: 500ms (captures React Strict Mode double-fires)
- See `docs/LOG_DEDUPLICATION.md` for details

### Pagos de Venta Service

`src/lib/services/pagosVentaService.ts` encapsulates venta payment operations:

- `crearPagoInicial(ventaId, clienteId, clienteNombre, monto, ...)` - Creates initial payment record in `pagosVenta` collection
- `crearPagoRenovacion(ventaId, clienteId, clienteNombre, monto, ...)` - Creates renewal payment record
- `obtenerPagosDeVenta(ventaId)` - Get all payments for a specific venta
- `contarRenovacionesDeVenta(ventaId)` - Count non-initial payments
- `obtenerPagosDeVariasVentas(ventaIds)` - Batch query with automatic chunking (Firestore `in` max 10)

## Module Architecture

### Route Organization

```
src/app/
├── (auth)/          # Auth layout with centered form
│   └── login/
├── (dashboard)/     # Main app layout with sidebar + header
│   ├── dashboard/   # Home dashboard (placeholder UI)
│   ├── servicios/   # Streaming service management
│   │   ├── crear/   # Create service
│   │   ├── [id]/
│   │   │   ├── page.tsx      # Service overview
│   │   │   └── editar/       # Edit service
│   │   └── detalle/[id]/     # Service detail with payment history & renewals
│   ├── usuarios/    # Clients & Resellers (tabs)
│   │   ├── crear/   # Create user
│   │   ├── [id]/    # User detail (shows their ventas)
│   │   └── editar/[id]/  # Edit user
│   ├── ventas/      # Sales management
│   │   ├── crear/   # Create sale (multi-item form)
│   │   ├── [id]/    # Sale detail with payment history (pagosVenta collection)
│   │   └── [id]/editar/  # Edit sale
│   ├── notificaciones/
│   ├── editor-mensajes/  # WhatsApp template editor
│   ├── log-actividad/
│   ├── categorias/
│   │   ├── crear/   # Create category
│   │   ├── [id]/    # Category detail
│   │   └── [id]/editar/  # Edit category
│   └── metodos-pago/
│       ├── crear/   # Create payment method
│       ├── [id]/    # Payment method detail
│       └── [id]/editar/  # Edit payment method
```

**REMOVED ROUTES** (commit db25141):
- `/suscripciones` - Subscriptions module completely removed
- `/pagos-servicios` - Service payments module removed (replaced by Servicios Detalle + Ventas)

**KNOWN ISSUES**:
- `/configuracion` - Link exists in sidebar but route doesn't exist (will cause 404)

### Sidebar Navigation Structure

The sidebar (`src/components/layout/Sidebar.tsx`) organizes routes into sections:
- **GESTION**: Usuarios, Servicios, Ventas
- **ADMINISTRACION**: Notificaciones, Categorias, Metodos de Pago
- **OTROS**: Editor de Mensajes, Log de Actividad
- **Footer**: Tema toggle, Colapsar, Configuracion (broken), Cerrar Sesion

Keyboard shortcut `Ctrl/Cmd + B` toggles the sidebar collapse.

### Component Patterns

Every module follows this structure:

1. **Page** (`page.tsx`): Main component with filtering logic and state
2. **Metrics** (`*Metrics.tsx`): Cards displaying key stats (some modules)
3. **Filters** (`*Filters.tsx`): Search + dropdowns for filtering
4. **Table** (`*Table.tsx`): Data table with actions
5. **Dialog** (`*Dialog.tsx`): Form for create/edit with React Hook Form + Zod
6. **Form** (`*Form.tsx`): Standalone form pages (create/edit routes)

**Shared Components** (`src/components/shared/`):
- `PaginationFooter` - Reusable pagination UI with page navigation
- `MetricCard` - Reusable metric card component
- `DataTable` - Generic data table wrapper
- `ConfirmDialog` - Confirmation dialog
- `EmptyState` - Empty state placeholder
- `LoadingSpinner` - Loading indicator
- `ErrorBoundary` - React error boundary
- `ModuleErrorBoundary` - Module-level error boundary
- `DashboardErrorFallback` - Dashboard error fallback UI
- `PagoDialog` - Payment dialog (shared between servicios and ventas)

**Dashboard Components** (Restored UI, placeholder data):
- `DashboardMetrics.tsx` - 4 metric cards (placeholder values)
- `IngresosVsGastosChart.tsx` - Income vs expenses chart
- `RevenueByCategory.tsx` - Revenue by category chart
- `CrecimientoUsuarios.tsx` - User growth chart
- `RecentActivity.tsx` - Recent activity timeline
- `UrgentNotifications.tsx` - Urgent notifications list

### Form Handling

All forms use:
- **React Hook Form** for form state
- **Zod** for validation schemas
- **shadcn/ui Dialog** for modals
- **Sonner** for toast notifications

**Standard Form Pattern:**
```typescript
const schema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  // ... other fields
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema)
});

const onSubmit = async (data: FormData) => {
  try {
    await createItem(data); // Calls Firebase
    toast.success('Created successfully');
    onOpenChange(false);
  } catch (error) {
    toast.error('Error creating item');
  }
};
```

## Critical Implementation Details

### Services (Servicios)

- **Tipos**: `cuenta_completa` (full account) or `perfiles` (shared profiles)
- Track `perfilesOcupados` vs `perfilesDisponibles`
- Show progress bar for occupancy percentage
- Managed in Firebase `servicios` collection
- **Denormalized fields**: `metodoPagoNombre`, `moneda` (from MetodoPago), `gastosTotal` (accumulated sum of all payments)
- **Category counter management**: On create/delete/toggle, `serviciosStore` atomically updates the parent category's counters (`totalServicios`, `serviciosActivos`, `perfilesDisponiblesTotal`) using `increment()`
- **Payment history**: Each service has records in `pagosServicio` collection. On creation, `serviciosStore.createServicio()` automatically creates the initial `PagoServicio` record.
- **Servicios Detalle page** (`/servicios/detalle/[id]`): Full detail view showing service info, payment/renovation history, and profile occupancy per venta.
- **`ServicioDetailMetrics`**: Metric cards for service detail pages
- **Category views**: The servicios list page includes a tab/view showing services grouped by category, with `ServiciosCategoriaFilters`, `ServiciosCategoriaMetrics`, `ServiciosCategoriaTable`, and `ServiciosCategoriaTableDetalle` components.
- **Cross-module notifications**: On delete, dispatches `window.dispatchEvent(new Event('servicio-deleted'))` for other pages to react.

### Ventas (Sales)

The Ventas module manages the sale of service profiles to users. It is the primary way clients acquire access to streaming services.

- **Dedicated store**: `ventasStore` with caching (5-min TTL), error states, optimistic updates, and `fetchCounts()`.
- **Collection**: `COLLECTIONS.VENTAS` (`'ventas'`)
- **Payments collection**: `COLLECTIONS.PAGOS_VENTA` (`'pagosVenta'`) — payments stored in a **separate collection** (not embedded arrays). Each payment has a `ventaId` reference.
- **VentaDoc structure** (defined in `src/types/ventas.ts`):
  - `clienteId`, `clienteNombre`, `servicioId`, `servicioNombre`, `servicioCorreo`, `servicioContrasena`
  - `categoriaId`, `categoriaNombre` (denormalized), `metodoPagoId`, `metodoPagoNombre`, `moneda`
  - `fechaInicio`, `fechaFin`, `cicloPago`
  - `estado`: `'activo' | 'inactivo'`
  - `precio`, `descuento`, `precioFinal`, `totalVenta`
  - `perfilNumero`, `perfilNombre`, `codigo`, `notas`
  - `pagos` (@deprecated, legacy embedded array — use `pagosVenta` collection instead)
- **PagoVenta structure** (separate collection `pagosVenta`):
  - `ventaId`, `clienteId`, `clienteNombre` (denormalized)
  - `fecha`, `monto`, `metodoPagoId`, `metodoPago`, `moneda` (denormalized)
  - `isPagoInicial`, `cicloPago`, `fechaInicio`, `fechaVencimiento`, `notas`
- **Create flow**: `ventasStore.createVenta()` creates the venta doc (without pagos array) + creates the initial `PagoVenta` record in separate collection.
- **Create form** (`VentasForm.tsx`): Multi-item form. The user selects a client, payment method, and dates, then adds service items. Supports discount and WhatsApp message generation.
- **Detail page** (`/ventas/[id]`): Shows venta info, payment history (via `usePagosVenta` hook querying `pagosVenta` collection), and actions (edit, renew, delete).
- **`VentaPagosTable`**: Displays payment history for a venta.
- **Hooks**:
  - `use-pagos-venta.ts` — Loads pagos for a specific venta from `pagosVenta` collection
  - `use-ventas-usuario.ts` — Loads all ventas + renovaciones for a single user (module-level cache, 5-min TTL)
- **Profile occupancy**: When a venta is deleted, `updatePerfilOcupado(servicioId, false)` is called automatically.
- **`serviciosActivos` counter**: On delete, `adjustServiciosActivos(clienteId, -1)` decrements the user's counter.
- **Cross-module notifications**: On delete, dispatches `window.dispatchEvent(new Event('venta-deleted'))`.
- **Metrics** (`VentasMetrics.tsx`): Cards for Ventas Totales, Ingreso Total, Ingreso Mensual Esperado, Monto Sin Consumir, Ventas Activas, Ventas Inactivas.
- **Table** (`VentasTable.tsx`): Filterable by estado (todas/activas/inactivas). Columns include consumption percentage and remaining amount calculated client-side.

### Categorias (Categories)

- **Denormalized counters**: Each category document maintains counters updated atomically by `serviciosStore`:
  - `totalServicios` - Total services in this category
  - `serviciosActivos` - Active services count
  - `perfilesDisponiblesTotal` - Sum of available (unoccupied) profiles across active services
  - **Note**: `gastosTotal` is NOT denormalized; it's calculated in real-time from `pagosServicio` collection
- **Plans**: Categories can have `planes: Plan[]` — each plan has `nombre`, `precio`, `cicloPago`, `tipoPlan`
- **Types**: `tipoCategoria: 'plataforma_streaming' | 'otros'`
- **Store**: `categoriasStore` with `fetchCounts()` for metrics

### Metodos de Pago (Payment Methods)

- **`asociadoA` field**: `'usuario' | 'servicio'` — segregates payment methods between users and services
- **Store**: `metodosPagoStore` with `fetchMetodosPagoUsuarios()`, `fetchMetodosPagoServicios()` (filtered queries), `toggleActivo()`, `fetchCounts()`
- **Service-specific fields**: `email`, `contrasena`, `numeroTarjeta`, `fechaExpiracion` (for payment methods used by services)
- **Denormalization**: When a service or venta uses a payment method, `metodoPagoNombre` and `moneda` are denormalized into the document

### Usuarios (Clients & Resellers)

- **Unified collection**: All users (clients and resellers) live in a single `usuarios` Firestore collection, distinguished by `tipo: 'cliente' | 'revendedor'`.
- **Single store**: `usuariosStore` manages both types. Has `getClientes()` / `getRevendedores()` selectors and `fetchCounts()` for metrics.
- **Denormalized fields**: `serviciosActivos` (count of active ventas, updated atomically via `adjustServiciosActivos()`), `moneda` (from MetodoPago), `metodoPagoNombre` (from MetodoPago)
- **Unified type**: `Usuario` with `tipo` discriminator. Type guards `esCliente()` / `esRevendedor()`.
- **Pages**: Single `/usuarios` page with tabs (Todos / Clientes / Revendedores). Detail page at `/usuarios/[id]` and edit page at `/usuarios/editar/[id]`.
- **UsuarioDetails component**: Displays a user's profile info and their associated ventas (via `useVentasUsuario` hook with module-level cache). Supports deleting ventas and sending WhatsApp messages directly.
- **Tables**: `ClientesTable`, `RevendedoresTable`, `TodosUsuariosTable`

### Notifications

- Generated automatically based on expiration dates
- Priority increases as expiration approaches (100 days = baja, 1 day = critica)
- `estado` field maps to notification thresholds: '100_dias', '11_dias', '8_dias', '7_dias', '3_dias', '2_dias', '1_dia', 'vencido'
- Stored in Firebase `notificaciones` collection

### Authentication

**Firebase Authentication** (`authStore`):
- Uses Firebase Auth for user login/logout
- Email with `admin@` = admin role, others = operador
- State persisted to localStorage for hydration
- Token management handled by Firebase SDK

**Route Protection (Dual Layer):**
1. **Client-Side (Primary):** `src/app/(dashboard)/layout.tsx`
   - Checks `isAuthenticated` from authStore with Zustand hydration
   - Redirects to `/login` if not authenticated
   - Shows loading spinner while hydrating state from localStorage

2. **Server-Side (Proxy):** `proxy.ts` (project root)
   - Next.js 16 Edge Runtime proxy
   - Exports `function proxy()` (Next.js 16 convention)
   - Currently allows all navigation (auth is client-side)
   - Placeholder for future JWT/cookie validation in production

## Data Flow

1. **On mount**: Pages call `fetchItems()` from store, which checks 5-min cache before hitting Firebase
2. **Firebase fetch**: Store calls Firebase functions with auto timestamp conversion
3. **Local filtering**: Use `useMemo` to filter store data locally (no server calls)
4. **CRUD operations**: Call store methods, which update Firebase + local state + show toast
5. **Denormalized counters**: On mutations, stores atomically update related documents' counters using `increment()`
6. **Cross-module notifications**: Stores dispatch `window.dispatchEvent()` for other pages to react to deletions
7. **Persistence**: All changes saved to Firebase (except auth & templates use localStorage)

**Error Handling Pattern:**
```typescript
try {
  await deleteItem(id); // Firebase operation
  toast.success('Deleted successfully');
} catch (error) {
  console.error('Error deleting item:', error);
  toast.error('Error deleting item');
}
```

## Typography and Fonts

**CRITICAL: Always use the system font (Inter)**

- The project uses **Inter** font (Google Font) configured in `src/app/layout.tsx`
- **NEVER use `font-mono` class** - All text must use the default Inter font
- Font size is set to 80% globally in `src/app/globals.css`
- Available weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Font Usage Rules:**
```typescript
// CORRECT - Use default Inter font
<span className="font-medium">{text}</span>
<span className="text-sm">{identifier}</span>

// WRONG - Never use font-mono
<span className="font-mono text-sm">{identifier}</span>
```

## UI/UX Conventions

### Color Coding

- **Venta / Subscription Status**:
  - Activa/Activo: green
  - Suspendida: yellow
  - Inactiva/Inactivo: gray
  - Vencida: red

- **Notification Priority**:
  - Baja: blue
  - Media: yellow
  - Alta: orange
  - Critica: red

- **Expiration Warnings**:
  - <1 day: red-600
  - <3 days: red-500
  - <7 days: yellow-500
  - 100+ days: green

### Icons (lucide-react)

- Edit: `Pencil` or `Edit`
- Delete: `Trash2`
- WhatsApp: `MessageCircle` (text-green-600)
- Actions menu: `MoreHorizontal` or `MoreVertical`
- Status: `AlertCircle` / `CheckCircle` / `CheckCircle2` / `XCircle`
- Add: `Plus`
- Search: `Search`
- Filter: `Filter`
- Refresh/Renew: `RefreshCw`
- View detail: `Eye`
- Back: `ArrowLeft`

### Responsive Grid

Standard layout for metrics:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 4 metric cards */}
</div>

{/* Ventas uses 6 cards: */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
  {/* 6 metric cards */}
</div>
```

## Common Pitfalls

1. **Firebase async operations**: Always handle loading states and errors when calling Firebase functions.

2. **Form default values**: Always use `useEffect` to reset form when item changes:
```typescript
useEffect(() => {
  if (item) {
    reset({ ...item });
  } else {
    reset(defaultValues);
  }
}, [item, reset]);
```

3. **WhatsApp placeholders**: Must match exactly: `{cliente}` not `{Cliente}` or `{{cliente}}`

4. **Date handling**: Use `date-fns` functions, not native Date methods. Store dates as Firestore Timestamps or Date objects. Use `timestampToDate()` when reading from Firestore.

5. **Zustand updates**: Always return new objects/arrays, never mutate:
```typescript
// Correct
set((state) => ({ items: [...state.items, newItem] }))

// Wrong
state.items.push(newItem)
```

6. **Firebase errors**: Always wrap Firebase calls in try-catch blocks.

7. **Environment variables**: Ensure `.env.local` exists with Firebase credentials before running the app. Alternatively, set `FIREBASE_WEBAPP_CONFIG` as a JSON string (used for Firebase Hosting deployment).

8. **Removed modules**: Do not reference `/suscripciones` or `/pagos-servicios` routes - they were permanently removed.

9. **Usuarios stores**: The deprecated `clientesStore` and `revendedoresStore` have been removed. Use `usuariosStore` and filter by `tipo` instead.

10. **Ventas store**: Use `useVentasStore()` hook in components. The store handles caching, error states, and counter updates on mutations.

11. **Profile occupancy**: This is handled automatically by `ventasStore.deleteVenta()` and `serviciosStore.updatePerfilOcupado()`.

12. **Pagination in tables**: Do NOT use `getAll()` for tables with more than 10 items. Use `useServerPagination` hook instead.

13. **Cache for secondary queries**: When creating a hook for related data, ALWAYS use module-level `Map` for cache, NEVER `useRef`. Also ALWAYS use `enabled: !isLoading` parameter.

14. **Count queries**: Use `getCount()` for metrics, NOT `getAll().length`. Count operations are free on Spark plan.

15. **Denormalization strategy**: If a field is read on every page load but changes rarely, denormalize it into the main document and update atomically with `increment()`. Examples: `serviciosActivos` in Usuario, `totalServicios`/`serviciosActivos`/`perfilesDisponiblesTotal` in Categoria. Note: `gastosTotal` for categories is NOT denormalized—it's calculated in real-time from `pagosServicio` collection.

16. **Venta payments**: Payments are stored in the **separate `pagosVenta` collection** (not as embedded arrays in the venta document). The `pagos` field on `VentaDoc` is @deprecated. Use `usePagosVenta(ventaId)` hook or `pagosVentaService` functions.

17. **MetodoPago segregation**: Payment methods have `asociadoA: 'usuario' | 'servicio'`. Use `fetchMetodosPagoUsuarios()` or `fetchMetodosPagoServicios()` to get the correct subset.

18. **Category counters**: Never update category counters manually. They are managed atomically by `serviciosStore` on service create/delete/toggle operations.

19. **`adjustServiciosActivos` (not `adjustVentasActivas`)**: The function was renamed. `adjustVentasActivas` still works as a deprecated alias but new code should use `adjustServiciosActivos`.

## Multi-Currency Conversion System

The MovieTime system supports **multi-currency payments** with automatic conversion to USD for accurate financial reporting. This ensures that totals across different currencies (TRY, ARS, NGN, USD, etc.) are mathematically correct.

### Key Principles

1. **Individual items preserve original currency**: Payment rows, service costs, and venta amounts always display in their original currency
2. **Totals convert to USD**: All aggregated totals (sums across multiple payments/services) convert all amounts to USD and display as "$X.XX USD"
3. **Hybrid caching**: Exchange rates fetched from external API (exchangerate-api.io) and cached in Firebase for 24 hours
4. **Zero data migration**: All existing data remains unchanged; conversion happens at display time

### Architecture

**Three-layer system:**
```
UI Components (VentasMetrics, ServicioDetail, etc.)
      ↓
Conversion Helpers (sumInUSD, convertToUSD, formatAggregateInUSD)
      ↓
Currency Service (API fetch + Firebase cache with 24h TTL)
```

### Core Components

**Currency Service** (`src/lib/services/currencyService.ts`):
- `getExchangeRate(from, to)` - Get exchange rate between currencies
- `convertToUSD(amount, from)` - Convert amount to USD
- `refreshExchangeRates()` - Fetch fresh rates from API
- Caches rates in `config/exchange_rates` Firestore document
- Falls back to stale cache if API fails

**Helper Functions** (`src/lib/utils/calculations.ts`):
- `sumInUSD(items)` - Sum array of mixed-currency amounts, returns USD total
- `convertToUSD(amount, from)` - Convert single amount to USD
- `formatAggregateInUSD(amount)` - Format USD amount as "$1,234.56 USD"

### Usage Patterns

**Example 1: Calculate total from mixed-currency payments**
```typescript
// ✅ CORRECT - Convert to USD before summing
const ingresoTotal = await sumInUSD(
  pagosVentas.map(p => ({ monto: p.monto, moneda: p.moneda }))
);

// ❌ WRONG - Direct sum without conversion
const ingresoTotal = pagosVentas.reduce((sum, p) => sum + p.monto, 0);
```

**Example 2: Display totals with USD label**
```typescript
// ✅ CORRECT - Use formatAggregateInUSD
<MetricCard
  title="Ingreso Total"
  value={formatAggregateInUSD(metrics.ingresoTotal)}
/>

// ❌ WRONG - Use formatearMoneda (assumes single currency)
<MetricCard
  title="Ingreso Total"
  value={formatearMoneda(metrics.ingresoTotal)}
/>
```

**Example 3: Keep individual items in original currency**
```typescript
// ✅ CORRECT - Show original currency per row
<td>{getCurrencySymbol(pago.moneda)} {pago.monto.toFixed(2)}</td>

// Footer shows USD total
<span>{formatAggregateInUSD(totalIngresosUSD)}</span>
```

### Implementation Checklist

When adding new financial aggregations:
- [ ] Use `sumInUSD()` for totals across multiple currencies
- [ ] Display totals with `formatAggregateInUSD()`
- [ ] Keep individual items in original currency
- [ ] Handle async conversion with loading states
- [ ] Add error handling with fallback values

### Configuration

**Environment Variable** (`.env.local`):
```bash
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your-api-key-here
```

Get free API key from [exchangerate-api.io](https://www.exchangerate-api.com/) (1,500 requests/month)

**Cache Structure** (Firestore `config/exchange_rates`):
```typescript
{
  rates: {
    'USD_TRY': 35.20,
    'USD_ARS': 850.75,
    'USD_NGN': 1650.50,
    // ... all currencies
  },
  lastUpdated: Timestamp,
  source: 'exchangerate-api.io'
}
```

### Performance

- **API calls**: ~30 per month (with 24h caching)
- **Firebase reads**: +1 per page load (for exchange_rates document)
- **Conversion time**: < 100ms for 100 items
- **Cache TTL**: 24 hours with stale fallback

### Modified Components

All monetary aggregations now use currency conversion:
- `VentasMetrics` - Ingreso Total, Ingreso Mensual Esperado, Monto Sin Consumir
- `ServicioDetail` - Total Gastado (payment history)
- `VentaPagosTable` - Ingreso Total (payment table footer)
- `metricsService.ts` - `calculateVentasMetrics()` (now async)

### Important Notes

1. **All metrics functions are now async**: Components must handle promises and loading states
2. **Original currency preserved**: Individual payment rows, service costs, venta details show original currency
3. **USD for totals only**: Aggregations across multiple records show USD
4. **Graceful degradation**: If API fails, uses stale cache with warning
5. **No breaking changes**: Existing single-currency data works without modification

For detailed implementation guide, see `docs/plans/2026-02-12-currency-conversion-design.md`

---

## Firebase Best Practices

1. **Use COLLECTIONS enum**: Always use `COLLECTIONS.ITEMS` instead of hardcoded strings
2. **Generic CRUD functions**: Use `getAll()`, `getById()`, `queryDocuments()`, `create()`, `update()`, `remove()` from `src/lib/firebase/firestore.ts`
3. **Type safety**: Pass type parameter to generic functions: `getAll<Servicio>(COLLECTIONS.SERVICIOS)`
4. **Error handling**: Firebase operations can fail - always handle errors gracefully. All stores include `error: string | null` state.
5. **Loading states**: Show loading indicators while Firebase operations are in progress
6. **Optimistic updates**: Update local state immediately, then sync with Firebase. All delete operations use optimistic updates with rollback on error.
7. **Undefined fields**: The `create()` and `update()` functions automatically strip `undefined` values before writing to Firestore (via `removeUndefinedFields`)
8. **Automatic timestamp conversion**: All Firebase CRUD functions auto-convert Firestore Timestamps to JavaScript Date objects.
9. **Caching**: All stores include 5-minute cache timeout. Use `fetchItems(true)` to force refresh.
10. **Pagination**: Use server-side pagination with cursors for tables. See "Server-Side Pagination Pattern" section.
11. **Denormalization**: For frequently-read fields that change rarely, denormalize into the main document and update atomically with `increment()`.
12. **Count queries**: Use `getCount()` for metrics — free on Spark plan.
13. **Development Logging**: All Firebase operations and cache hits are logged via `devLogger` system with automatic deduplication.
14. **Composite Indexes**: Ensure required indexes exist in `firestore.indexes.json` for compound queries. Deploy with `firebase deploy --only firestore:indexes`.
15. **Security Rules**: Rules are in `firestore.rules`. Deploy with `firebase deploy --only firestore:rules`.

## Server-Side Pagination Pattern — CRITICAL FOR NEW MODULES

**IMPORTANT**: Any new module with a table listing documents MUST follow this pattern to minimize Firebase reads.

### Quick Reference

| What | Tool | Cost |
|------|------|------|
| Paginated docs | `useServerPagination` + `getPaginated` | `pageSize + 1` reads |
| Count for metrics | `getCount()` in store | 0 doc-reads (free on Spark) |
| Related data per row | Custom hook with module-level cache | <= pageSize reads (cached 5 min) |
| Field read often | Denormalize + `increment()` | 0 extra reads |

### Pattern Components

1. **Pagination Hook** — `useServerPagination` (exists in `src/hooks/`)
   - Fetches exactly `pageSize + 1` docs per page (the +1 detects `hasMore`)
   - Uses cursors to navigate forward/backward without re-querying
   - Auto-resets when filters change (e.g., switching tabs)
   - Returns: `{ data, isLoading, hasMore, hasPrevious, page, next, previous, refresh }`

2. **Count Queries** — `getCount()` in your store
   - Does NOT cost document reads (free on Spark plan)
   - Use for "Total X", "Total Y" metrics

3. **Secondary Data Hook** — Custom hook with module-level cache
   - For data that requires a separate query per row (e.g., "monto sin consumir" from ventas)
   - **Must use module-level `Map` for cache** (not `useRef`, which is destroyed on remount)
   - **Must use `enabled: !isLoading` parameter** to avoid queries with stale IDs during tab switches
   - Cache TTL: 5 minutes
   - Limitation: Firestore `in` operator accepts max 10 values -> `pageSize` must be <= 10

4. **Denormalized Fields** — For fields read often, changed rarely
   - Store directly in the document (e.g., `serviciosActivos` in usuario doc)
   - Update atomically with `increment()` on mutations

### Implementation Checklist

When creating a new module with a table:

- [ ] Use `useServerPagination` for the table data
- [ ] Add `fetchCounts()` to store using `getCount()` for metrics
- [ ] If you need related data per row:
  - [ ] Create a custom hook with **module-level cache Map**
  - [ ] Use `enabled: !isLoading` to avoid stale ID queries
  - [ ] Handle empty results gracefully (default to 0)
- [ ] If a field is read frequently but changes rarely:
  - [ ] Denormalize into the main document
  - [ ] Update with `increment()` in all mutation points
- [ ] Set `pageSize <= 10` if using secondary data hook with `in` query
- [ ] Pass `isLoading` and `onRefresh` to table component

### Complete Example: Usuarios Module

The Usuarios module is the **reference implementation**. Study these files:

| File | Purpose |
|------|---------|
| `src/hooks/useServerPagination.ts` | Generic pagination hook |
| `src/hooks/use-ventas-por-usuarios.ts` | Secondary data with module-level cache |
| `src/lib/firebase/pagination.ts` | `getPaginated()` implementation |
| `src/store/usuariosStore.ts` | Store with `fetchCounts()` |
| `src/app/(dashboard)/usuarios/page.tsx` | Page orchestrator with dynamic filters |
| `src/components/usuarios/ClientesTable.tsx` | Table consuming both hooks |
| `src/components/shared/PaginationFooter.tsx` | Reusable pagination UI |

### Full Documentation

**See:** `docs/PAGINATION_AND_CACHE_PATTERN.md` for complete step-by-step guide.

### Performance Impact

**Before optimization** (Usuarios with 50 docs):
- `getAll()` -> 50 document reads per visit
- No caching -> repeated queries on tab switches
- Total: ~50-100+ reads per session

**After optimization** (Usuarios with 50 docs, pageSize=10):
- Paginated query -> 11 reads (10 + 1 for `hasMore`)
- Secondary query -> 5 reads (only users with ventas)
- Counts -> 0 reads (free)
- Cache -> 0 reads on repeated visits (5 min TTL)
- **Total: 16 reads first visit, 0 reads next 5 minutes** -> **84% reduction**

## shadcn/ui Components

Installed components:
- Dialog, Alert Dialog
- Button, Input, Label, Select, Checkbox, Switch
- Table, Tabs, Badge, Progress, Avatar, Separator
- Dropdown Menu, Popover
- Calendar (react-day-picker)
- Card, Form, Textarea, Skeleton
- Sonner (toast)

Add new components: Check shadcn/ui docs, copy to `src/components/ui/`

## Development Workflow

When adding features:

1. Update type in `src/types/[domain].ts`
2. Add Firestore collection to `COLLECTIONS` enum (if new entity)
3. Create store in `src/store/` with caching, error states, `fetchCounts()`, and optimistic updates
4. Create page in `src/app/(dashboard)/`
5. Create components (Dialog, Table, Filters, Metrics, Form, etc.)
6. Update form schema with Zod
7. Add form fields to UI
8. Update table columns
9. Add filtering logic if needed
10. Add route to Sidebar if it's a top-level module
11. If the new entity has denormalized counters, update related stores to maintain them atomically
12. Add composite indexes to `firestore.indexes.json` if needed
13. Test CRUD operations with Firebase
14. Test error handling and loading states

## Testing

- **Framework**: Vitest 4
- **Test files**: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- **Test utilities**: `src/test/setup.ts`, `src/test/utils.ts`
- **Commands**: `npm test`, `npm run test:ui`, `npm run test:watch`, `npm run test:coverage`
- **Status**: Test directories exist but no test files have been written yet.

## Known Issues & Technical Debt

1. **Configuracion Route**: Link exists in sidebar footer but route doesn't exist — will cause 404
2. **Subscription References**: Some types (`dashboard.ts`, `clientes.ts`) contain subscription-related fields (`suscripcionesTotales`, `suscripcionesActivas`) for historical data compatibility
3. **Dashboard Placeholder Data**: Dashboard UI restored but contains placeholder/static data (not connected to backend logic)
4. **Legacy `pagos` array in VentaDoc**: The `pagos` field on `VentaDoc` is @deprecated. Payments should be queried from the `pagosVenta` collection. Some old venta documents may still have embedded `pagos` arrays.

## Deployment

### Firebase Hosting / App Hosting

The project includes Firebase deployment configuration:
- `firebase.json` - Firebase project config (Firestore rules + indexes, location: `nam5`)
- `.firebaserc` - Firebase project alias
- `firestore.rules` - Security rules with role-based access
- `firestore.indexes.json` - Composite indexes for optimized queries

**Deploy commands:**
```bash
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy composite indexes
firebase deploy                           # Deploy everything
```

**Environment Configuration for Deployment:**
- `FIREBASE_WEBAPP_CONFIG` env var (JSON string) is supported as an alternative to individual `NEXT_PUBLIC_FIREBASE_*` vars
- `next.config.ts` parses `FIREBASE_WEBAPP_CONFIG` and maps it to individual env vars
- `src/lib/firebase/config.ts` uses the same fallback pattern

### Production Considerations

1. **Firebase Configuration**: Ensure production Firebase credentials in environment variables
2. **Firebase Security Rules**: Rules are defined in `firestore.rules` — review before production
3. **Authentication**: Implement proper user management (not just admin@ email check). Set admin Custom Claims via Firebase Admin SDK.
4. **Server-Side Proxy**: Implement JWT/cookie validation in `proxy.ts` for server-side auth
5. **Error Tracking**: Add error monitoring service (Sentry, etc.)
6. **Performance**: Caching is implemented (5-min TTL in all stores)
7. **Backup**: Implement Firestore backup strategy
8. **Analytics**: Firebase Analytics is enabled in production (client-side only)

## Quick Reference Guide

### Firebase Cheat Sheet

| Task | Function | Cost |
|------|----------|------|
| Get all docs | `getAll<T>(collection)` | N reads |
| Get paginated | `getPaginated<T>(collection, options)` | pageSize + 1 reads |
| Count docs | `getCount(collection, filters)` | 0 reads (free on Spark) |
| Query with filters | `queryDocuments<T>(collection, filters)` | Matching docs |
| Get single doc | `getById<T>(collection, id)` | 1 read |
| Create doc | `create(collection, data)` | 1 write |
| Update doc | `update(collection, id, data)` | 1 write |
| Delete doc | `remove(collection, id)` | 1 write |
| Atomic increment | `adjustServiciosActivos(id, delta)` | 1 write |

### Debugging Tips

#### Check Firebase Reads

Open browser console and look for:
- `[Firestore] getAll (collection) -> N docs` (green badge)
- `[Firestore] query (collection where ...) -> N docs` (green badge)
- `[Firestore] paginated (collection) -> N docs` (blue badge)
- `[Firestore] count (collection) -> N` (purple badge)
- `[Cache] Hit (collection) -> sin lectura a Firestore` (orange badge)
- `[VentasCache] HIT` (green badge)

#### Force Refresh Cache

```typescript
// In store:
fetchItems(true); // force = true bypasses cache

// In component:
const { refresh } = useServerPagination(...);
refresh(); // Forces re-fetch of current page
```

### Documentation Shortcuts

| Need | Read |
|------|------|
| Pagination pattern | `docs/PAGINATION_AND_CACHE_PATTERN.md` |
| React optimizations | `docs/PERFORMANCE_OPTIMIZATIONS.md` |
| Firebase setup | `docs/FIREBASE_SETUP.md` |
| Firebase reads monitoring | `docs/FIREBASE_READS_MONITORING.md` |
| System architecture | `docs/ARCHITECTURE.md` |
| C4 diagrams | `docs/C4_DIAGRAMS.md` |
| Denormalization analysis | `docs/DENORMALIZATION_ANALYSIS_PROCESS.md` |
| Servicios optimization | `docs/SERVICIOS_OPTIMIZATION.md` |
| Metodos Pago optimization | `docs/METODOS_PAGO_OPTIMIZATION.md` |
| Project overview | This file (CLAUDE.md) |

### Tech Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui + Radix UI | Latest |
| State Management | Zustand | 5.0.10 |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 |
| Backend | Firebase (Auth + Firestore + Analytics) | 12.8.0 |
| Charts | Recharts | 3.7.0 |
| Date Utils | date-fns | 4.1.0 |
| Toasts | Sonner | 2.0.7 |
| Icons | lucide-react | 0.563.0 |
| Testing | Vitest | 4.0.18 |
| Themes | next-themes | 0.4.6 |

---

**Last Updated:** February 7, 2026
**Version:** 2.2.0
