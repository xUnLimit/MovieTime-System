# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), sales, categories, payment methods, and automatic notifications. The system is integrated with **Firebase** (Authentication + Firestore) for data persistence.

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
├── next.config.ts            # Next.js configuration
├── components.json           # shadcn/ui configuration
├── eslint.config.mjs         # ESLint configuration
├── .env.local                # Firebase credentials (not in repo)
├── .env.local.example        # Example environment variables
├── docs/                      # Documentation (11 files)
│   ├── PAGINATION_AND_CACHE_PATTERN.md  # Server-side pagination guide
│   ├── LOG_DEDUPLICATION.md             # Development logging system (NEW)
│   ├── PERFORMANCE_OPTIMIZATIONS.md     # React optimization patterns
│   ├── USUARIOS_MIGRATION.md            # Unified collection migration
│   ├── DEVELOPER_GUIDE.md               # General development guide
│   ├── IMPLEMENTATION_STATUS.md         # Feature completion status
│   ├── IMPLEMENTATION_SUMMARY.md        # Architecture summary
│   ├── QUICK_START.md                   # Getting started guide
│   ├── FIREBASE_SETUP.md                # Firebase configuration
│   ├── OPTIMIZATIONS_SUMMARY.md         # All optimizations overview
│   └── FORMULARIO_CREAR_USUARIO.md      # User form implementation
├── public/                    # Static assets
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
└── src/
    ├── app/                  # Next.js App Router
    ├── components/           # React components by feature
    │   ├── layout/          # Sidebar, Header, NotificationBell, ThemeProvider, ThemeToggle, UserMenu
    │   ├── dashboard/       # Dashboard metrics & charts
    │   ├── servicios/       # Services components (13 files)
    │   ├── ventas/          # Sales components (6 files) ← NEW
    │   ├── usuarios/        # Clients & Resellers components (6 files)
    │   ├── categorias/      # Categories components (7 files)
    │   ├── metodos-pago/    # Payment methods components (6 files)
    │   ├── notificaciones/  # Notifications components (4 files)
    │   ├── editor-mensajes/ # WhatsApp template editor (4 files)
    │   ├── log-actividad/   # Activity log components (2 files)
    │   ├── shared/          # Shared components (7 files)
    │   └── ui/              # shadcn/ui components (21 files)
    ├── config/               # Configuration files
    │   ├── constants.ts      # App constants
    │   ├── env.ts           # Environment config
    │   └── site.ts          # Site metadata
    ├── hooks/                # Custom React hooks
    │   ├── use-sidebar.ts           # Sidebar toggle state hook
    │   ├── useVentasMetrics.ts      # Ventas metrics calculation hook
    │   ├── useServerPagination.ts   # Server-side pagination with cursors ← NEW
    │   └── use-ventas-por-usuarios.ts # Secondary query with module-level cache ← NEW
    ├── lib/                  # Utilities and helpers
    │   ├── firebase/        # Firebase integration
    │   │   ├── auth.ts     # Authentication functions
    │   │   ├── config.ts   # Firebase initialization
    │   │   ├── firestore.ts # Generic CRUD + COLLECTIONS + queryDocuments (with auto timestamp conversion)
    │   │   └── pagination.ts # Pagination utilities
    │   ├── services/        # Business logic layer
    │   │   ├── metricsService.ts # Metrics calculations
    │   │   └── ventasService.ts  # Ventas business logic
    │   ├── utils/           # Utility functions
    │   │   ├── calculations.ts # Business logic
    │   │   ├── whatsapp.ts    # WhatsApp utilities (expanded)
    │   │   ├── cn.ts          # Class utilities
    │   │   └── index.ts       # Exports
    │   └── constants/       # Application constants (includes CYCLE_MONTHS)
    ├── store/                # Zustand stores (Firebase-integrated)
    ├── test/                 # Test utilities
    │   ├── setup.ts         # Test setup
    │   └── utils.ts         # Test helpers
    └── types/                # TypeScript types (separated by domain)
        ├── index.ts         # Barrel export
        ├── auth.ts          # Authentication types
        ├── categorias.ts    # Category types
        ├── clientes.ts      # Usuario / Cliente / Revendedor types (unified)
        ├── common.ts        # Shared types
        ├── dashboard.ts     # Dashboard types
        ├── metodos-pago.ts  # Payment method types
        ├── notificaciones.ts # Notification types
        ├── servicios.ts     # Service + PagoServicio types
        └── whatsapp.ts      # WhatsApp types (expanded)
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

# Firebase Authentication
# Configure test credentials in Firebase Console
# Default: admin@movietime.com / any 6+ character password
```

## Architecture Overview

### Firebase Integration

The app uses **Firebase** for authentication and data persistence:

**Firestore Collections** (defined in `src/lib/firebase/firestore.ts`):
```typescript
export const COLLECTIONS = {
  USUARIOS: 'usuarios',                  // Unified users collection (clientes + revendedores)
  /** @deprecated Usar USUARIOS con filtro tipo='cliente' */
  CLIENTES: 'clientes',
  /** @deprecated Usar USUARIOS con filtro tipo='revendedor' */
  REVENDEDORES: 'revendedores',
  SERVICIOS: 'servicios',
  CATEGORIAS: 'categorias',
  SUSCRIPCIONES: 'suscripciones',        // Defined but not used in UI (legacy)
  NOTIFICACIONES: 'notificaciones',
  METODOS_PAGO: 'metodosPago',
  ACTIVITY_LOG: 'activityLog',
  CONFIG: 'config',
  GASTOS: 'gastos',
  TEMPLATES: 'templates',
  PAGOS_SERVICIO: 'pagosServicio',       // Payment history per service ← NEW
  VENTAS: 'Ventas',                      // Sales records ← NEW
}
```

**Firebase Configuration** (`.env.local` - not in repo):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Firebase Functions** (`src/lib/firebase/firestore.ts`):
- `getAll<T>(collection)` - Fetch all documents (auto-converts Timestamps to Dates)
- `getById<T>(collection, id)` - Fetch single document (auto-converts Timestamps to Dates)
- `queryDocuments<T>(collection, filters)` - Query with `where` filters (auto-converts Timestamps to Dates)
- `getCount(collection, filters)` - Count documents (does NOT cost doc-reads on Spark plan) ← NEW
- `create<T>(collection, data)` - Create document (auto-adds `createdAt`/`updatedAt`)
- `update<T>(collection, id, data)` - Update document (auto-updates `updatedAt`)
- `remove(collection, id)` - Delete document
- `adjustVentasActivas(clienteId, delta)` - Atomically increment/decrement `ventasActivas` field ← NEW
- `timestampToDate(timestamp)` - Convert Firestore Timestamp → Date (rarely needed now)
- `dateToTimestamp(date)` - Convert Date → Firestore Timestamp
- `convertTimestamps(data)` - Recursively convert Timestamps (auto-used in all queries)

**Firebase Pagination** (`src/lib/firebase/pagination.ts`):
- `getPaginated<T>(collection, options)` - Fetch paginated docs with cursor (costs `pageSize + 1` reads) ← NEW

**Firebase Auth** (`src/lib/firebase/auth.ts`):
- `signInUser()`, `signOutUser()`, `onAuthChange()`

### State Management with Zustand

The app uses **Zustand** stores (not Redux) with **Firebase integration**:

- All stores are in `src/store/` directory
- Each store uses Firebase Firestore for data persistence
- Stores handle loading states during async Firebase operations
- Only `authStore` and `templatesStore` persist to localStorage
- All CRUD operations are async and update Firestore
- **Ventas** module does NOT have a dedicated store; it calls Firestore CRUD functions directly from page/component level

**Critical Store Pattern:**
```typescript
// Always use this pattern in stores
fetchItems: async () => {
  set({ isLoading: true, error: null });
  try {
    const items = await getAll<Item>(COLLECTIONS.ITEMS);
    set({ items, isLoading: false });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}
```

### Store Directory (10 active stores)

All stores in `src/store/` are Firebase-integrated with **error states**, **caching**, and **optimistic updates**:

1. **authStore.ts** - Firebase authentication + localStorage persistence
2. **usuariosStore.ts** - Manages both clients and resellers in a single `usuarios` collection. Supports `fetchUsuarios()`, `fetchClientes()`, `fetchRevendedores()` (the latter two use `queryDocuments` with `tipo` filter). Has `getClientes()` / `getRevendedores()` selectors. ✅ Includes error state and optimistic deletes.
3. **serviciosStore.ts** - Services management. Creates an initial `PagoServicio` record in `COLLECTIONS.PAGOS_SERVICIO` when a service is created. Includes `updatePerfilOcupado()` for profile occupancy tracking. ✅ Includes error state and optimistic deletes.
4. **ventasStore.ts** - **NEW**: Sales management with caching (5-minute timeout), error states, and optimistic updates. Handles profile occupancy updates automatically on delete.
5. **categoriasStore.ts** - Categories (Firebase) ✅ Includes error state and optimistic deletes.
6. **metodosPagoStore.ts** - Payment methods (Firebase) ✅ Includes error state.
7. **notificacionesStore.ts** - Notifications (Firebase) ✅ Includes error state.
8. **activityLogStore.ts** - Activity logs (Firebase) ✅ Includes error state.
9. **configStore.ts** - Configuration settings (Firebase) ✅ Includes error state.
10. **templatesStore.ts** - Message templates (localStorage persistence) ✅ Includes error state.

**Removed/Deprecated:**
- ❌ **clientesStore.ts** - Deprecated wrapper (removed)
- ❌ **revendedoresStore.ts** - Deprecated wrapper (removed)
- ❌ **templatesMensajesStore.ts** - Consolidated into templatesStore

### Type System

Types are **organized by domain** in `src/types/` directory:
- `auth.ts` - User, authentication, role-based access
- `categorias.ts` - Categories
- `clientes.ts` - Unified `Usuario` type with `tipo: 'cliente' | 'revendedor'`. Contains `Cliente` and `Revendedor` as deprecated type aliases. Type guards `esCliente()` / `esRevendedor()` available. Legacy `suscripcionesTotales` field remains on the interface.
- `common.ts` - Shared types (ActivityLog, Configuracion, Gasto, TemplateMensaje)
- `dashboard.ts` - Dashboard metrics (contains legacy `suscripcionesActivas` field)
- `metodos-pago.ts` - Payment methods
- `notificaciones.ts` - Notifications
- `servicios.ts` - `Servicio` interface (with `cicloPago` now including `semestral`) + `PagoServicio` interface (payment history per service) + `ServicioFormData`
- `whatsapp.ts` - `WhatsAppData` interface — expanded with `servicio`, `perfilNombre`, `codigo`, `items` fields
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

- `getSaludo()` - Returns time-based greeting (Buenos días/tardes/noches)
- `replacePlaceholders(template, data)` - Replaces template variables using `WhatsAppData`
- `generateWhatsAppLink(phone, message)` - Creates `wa.me` links with pre-filled messages
- `openWhatsApp(phone, message)` - Opens WhatsApp in a new window ← NEW
- `formatearFechaWhatsApp(fecha)` - Formats a Date as "d de MMMM de yyyy" in Spanish ← NEW
- `generarMensajeVenta(template, venta)` - Generates a complete WhatsApp message for a sale using a template ← NEW

**Available Placeholders**: `{saludo}`, `{cliente}`, `{servicio}`, `{perfil_nombre}`, `{categoria}`, `{correo}`, `{contrasena}`, `{vencimiento}`, `{monto}`, `{codigo}`, `{items}`, `{diasRetraso}`

Templates are managed in `templatesStore` and persisted to localStorage.

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
│   │   └── detalle/[id]/     # Service detail with payment history & renewals ← NEW
│   ├── usuarios/    # Clients & Resellers (tabs)
│   │   ├── crear/   # Create user
│   │   ├── [id]/    # User detail (shows their ventas) ← NEW
│   │   └── editar/[id]/  # Edit user ← NEW
│   ├── ventas/      # Sales management ← NEW MODULE
│   │   ├── crear/   # Create sale (multi-item form)
│   │   ├── [id]/    # Sale detail with payment history
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
- ❌ `/suscripciones` - Subscriptions module completely removed
- ❌ `/pagos-servicios` - Service payments module removed (replaced by Servicios Detalle + Ventas)

**KNOWN ISSUES**:
- ⚠️ `/configuracion` - Link exists in sidebar but route doesn't exist (will cause 404)

### Sidebar Navigation Structure

The sidebar (`src/components/layout/Sidebar.tsx`) organizes routes into sections:
- **GESTIÓN**: Usuarios, Servicios, Ventas
- **ADMINISTRACIÓN**: Notificaciones, Categorías, Métodos de Pago
- **OTROS**: Editor de Mensajes, Log de Actividad
- **Footer**: Tema toggle, Colapsar, Configuración (broken), Cerrar Sesión

Keyboard shortcut `Ctrl/Cmd + B` toggles the sidebar collapse.

### Component Patterns

Every module follows this structure:

1. **Page** (`page.tsx`): Main component with filtering logic and state
2. **Metrics** (`*Metrics.tsx`): Cards displaying key stats (some modules)
3. **Filters** (`*Filters.tsx`): Search + dropdowns for filtering
4. **Table** (`*Table.tsx`): Data table with actions
5. **Dialog** (`*Dialog.tsx`): Form for create/edit with React Hook Form + Zod

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
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
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
- **Payment history**: Each service has records in `pagosServicio` collection. On creation, `serviciosStore.createServicio()` automatically creates the initial `PagoServicio` record.
- **Servicios Detalle page** (`/servicios/detalle/[id]`): Full detail view showing service info, payment/renovation history, and profile occupancy per venta. Contains:
  - `RenovarServicioDialog` - Renew a service (creates new `PagoServicio` record, updates `fechaVencimiento`)
  - `EditarPagoServicioDialog` - Edit an existing payment record in the history
- **Category views**: The servicios list page includes a tab/view showing services grouped by category, with `ServiciosCategoriaFilters`, `ServiciosCategoriaMetrics`, `ServiciosCategoriaTable`, and `ServiciosCategoriaTableDetalle` components.

### Ventas (Sales) ← NEW MODULE

The Ventas module manages the sale of service profiles to users. It is the primary way clients acquire access to streaming services.

- **No dedicated Zustand store**: Ventas uses `getAll`, `create`, `remove`, `queryDocuments` from `src/lib/firebase/firestore.ts` directly at the page/component level. State is managed with local `useState`.
- **Collection**: `COLLECTIONS.VENTAS` (`'Ventas'`)
- **VentaDoc structure** (exported from `VentasMetrics.tsx`):
  - `clienteNombre`, `servicioId`, `servicioNombre`, `servicioCorreo`
  - `categoriaId`, `metodoPagoNombre`, `moneda`
  - `fechaInicio`, `fechaFin`, `cicloPago`
  - `estado`: `'activo' | 'inactivo'`
  - `precio`, `descuento`, `precioFinal`
  - `perfilNumero` - which profile slot of the service this sale occupies
- **Create form** (`VentasForm.tsx`): Multi-item form. The user selects a client, payment method, and dates, then adds service items (cuentas completas or perfiles). Each item has its own category, service, cycle, dates, and pricing. Supports discount and WhatsApp message generation.
- **Detail page** (`/ventas/[id]`): Shows venta info, payment history (`pagos` array embedded in the document), and actions (edit, renew, delete).
- **Renew/Edit payment dialogs**: `RenovarVentaDialog` and `EditarPagoVentaDialog` — analogous to the Servicios versions but for ventas.
- **Profile occupancy**: When a venta is deleted, `updatePerfilOcupado(servicioId, false)` is called on `serviciosStore` to decrement the occupied profile count.
- **Metrics** (`VentasMetrics.tsx`): 6 cards — Ventas Totales, Ingreso Total, Ingreso Mensual Esperado, Monto Sin Consumir, Ventas Activas, Ventas Inactivas.
- **Table** (`VentasTable.tsx`): Filterable by estado (todas/activas/inactivas). Columns include consumption percentage and remaining amount calculated client-side.

### Usuarios (Clients & Resellers)

- **Unified collection**: All users (clients and resellers) live in a single `usuarios` Firestore collection, distinguished by `tipo: 'cliente' | 'revendedor'`.
- **Single store**: `usuariosStore` manages both types. `fetchClientes()` and `fetchRevendedores()` use `queryDocuments` to filter by `tipo`.
- **Deprecated stores**: `clientesStore` and `revendedoresStore` are thin wrappers that subscribe to `usuariosStore` and re-expose filtered data. They exist for backward compatibility only — prefer `usuariosStore` directly.
- **Unified type**: `Usuario` with `tipo` discriminator. `Cliente` and `Revendedor` are deprecated type aliases.
- **Pages**: Single `/usuarios` page with tabs (Todos / Clientes / Revendedores). Detail page at `/usuarios/[id]` and edit page at `/usuarios/editar/[id]`.
- **UsuarioDetails component**: Displays a user's profile info and their associated ventas (queried via `queryDocuments` on `COLLECTIONS.VENTAS`). Supports deleting ventas and sending WhatsApp messages directly.
- **Tables**: `ClientesTable`, `RevendedoresTable`, `TodosUsuariosTable`

### Notifications

- Generated automatically based on expiration dates
- Priority increases as expiration approaches (100 days = baja, 1 day = crítica)
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

1. **On mount**: Pages call `fetchItems()` from store (or call `getAll()` directly for modules without a store, like Ventas)
2. **Firebase fetch**: Store / page calls Firebase `getAll()` or `queryDocuments()` function
3. **Local filtering**: Use `useMemo` to filter store data locally (no server calls)
4. **CRUD operations**: Call store methods (or Firestore functions directly), which update Firebase + local state + show toast
5. **Persistence**: All changes saved to Firebase (except auth & templates use localStorage)

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
// ✅ CORRECT - Use default Inter font
<span className="font-medium">{text}</span>
<span className="text-sm">{identifier}</span>

// ❌ WRONG - Never use font-mono
<span className="font-mono text-sm">{identifier}</span>
```

**When creating new components:**
- Do NOT add `font-mono` to any elements (numbers, codes, identifiers, etc.)
- Use `font-medium` or `font-semibold` for emphasis, never change font family
- Keep consistent typography across all modules

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
  - Crítica: red

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
// ✅ Correct
set((state) => ({ items: [...state.items, newItem] }))

// ❌ Wrong
state.items.push(newItem)
```

6. **Firebase errors**: Always wrap Firebase calls in try-catch blocks:
```typescript
try {
  await create(COLLECTIONS.ITEMS, data);
} catch (error) {
  console.error('Firebase error:', error);
  toast.error('Error creating item');
}
```

7. **Environment variables**: Ensure `.env.local` exists with Firebase credentials before running the app.

8. **Removed modules**: Do not reference `/suscripciones` or `/pagos-servicios` routes - they were permanently removed.

9. **Usuarios stores**: ~~Do not create new code that uses `clientesStore` or `revendedoresStore` directly.~~ These stores have been removed. Use `usuariosStore` and filter by `tipo` instead.

10. **Ventas store**: ~~The Ventas module calls Firestore functions directly.~~ **UPDATED**: Ventas now uses `ventasStore` for consistent state management with caching and error handling. Use `useVentasStore()` hook in components.

11. **Profile occupancy**: ~~When creating or deleting a venta that occupies a service profile, always call `updatePerfilOcupado(servicioId, increment)` on `serviciosStore`.~~ **UPDATED**: This is now handled automatically by `ventasStore.deleteVenta()` method.

12. **Pagination in tables**: Do NOT use `getAll()` for tables with more than 10 items. Use `useServerPagination` hook instead. See "Server-Side Pagination Pattern" section.

13. **Cache for secondary queries**: When creating a hook for related data (like `use-ventas-por-usuarios`), ALWAYS use module-level `Map` for cache, NEVER `useRef`. Also ALWAYS use `enabled: !isLoading` parameter to avoid queries with stale IDs.

14. **Count queries**: Use `getCount()` for metrics, NOT `getAll().length`. Count operations are free on Spark plan and don't cost document reads.

15. **Denormalization strategy**: If a field is read on every page load but changes rarely (e.g., count of related docs), denormalize it into the main document and update atomically with `increment()`. See `ventasActivas` field in Usuario type.

## Firebase Best Practices

1. **Use COLLECTIONS enum**: Always use `COLLECTIONS.ITEMS` instead of hardcoded strings
2. **Generic CRUD functions**: Use `getAll()`, `getById()`, `queryDocuments()`, `create()`, `update()`, `remove()` from `src/lib/firebase/firestore.ts`
3. **Type safety**: Pass type parameter to generic functions: `getAll<Servicio>(COLLECTIONS.SERVICIOS)`
4. **Error handling**: Firebase operations can fail - always handle errors gracefully. All stores now include `error: string | null` state.
5. **Loading states**: Show loading indicators while Firebase operations are in progress
6. **Optimistic updates**: Update local state immediately, then sync with Firebase. All delete operations now use optimistic updates with rollback on error.
7. **Undefined fields**: The `create()` and `update()` functions automatically strip `undefined` values before writing to Firestore (via `removeUndefinedFields`)
8. **Automatic timestamp conversion**: ✅ All Firebase CRUD functions (`getAll`, `getById`, `queryDocuments`) now automatically convert Firestore Timestamps to JavaScript Date objects. No need to manually call `timestampToDate()` in stores.
9. **Caching**: Stores now include 5-minute cache timeout to reduce unnecessary Firebase reads. Use `fetchItems(true)` to force refresh.
10. **Pagination**: ✅ **CRITICAL PATTERN**: Use server-side pagination with cursors for tables. See "Server-Side Pagination Pattern" section below.
11. **Denormalization**: ✅ For frequently-read fields that change rarely (e.g., `ventasActivas`), denormalize into the main document and update atomically with `increment()`.
12. **Count queries**: Use `getCount()` for metrics — it does NOT count as document reads on Spark plan (free).
13. **Development Logging**: ✅ All Firebase operations and cache hits are logged in development using `devLogger` system with automatic deduplication for React Strict Mode. See `docs/LOG_DEDUPLICATION.md` for details.

## Server-Side Pagination Pattern ✅ **CRITICAL FOR NEW MODULES**

**IMPORTANT**: Any new module with a table listing documents MUST follow this pattern to minimize Firebase reads.

### Quick Reference

| What | Tool | Cost |
|------|------|------|
| Paginated docs | `useServerPagination` + `getPaginated` | `pageSize + 1` reads |
| Count for metrics | `getCount()` in store | 0 doc-reads (free on Spark) |
| Related data per row | Custom hook with module-level cache | ≤ pageSize reads (cached 5 min) |
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
   - Example: `getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'cliente' }])`

3. **Secondary Data Hook** — Custom hook with module-level cache
   - For data that requires a separate query per row (e.g., "monto sin consumir" from ventas)
   - **Must use module-level `Map` for cache** (not `useRef`, which is destroyed on remount)
   - **Must use `enabled: !isLoading` parameter** to avoid queries with stale IDs during tab switches
   - Cache TTL: 5 minutes
   - Limitation: Firestore `in` operator accepts max 10 values → `pageSize` must be ≤ 10

4. **Denormalized Fields** — For fields read often, changed rarely
   - Store directly in the document (e.g., `ventasActivas` in usuario doc)
   - Update atomically with `increment()` on mutations
   - No extra query needed → read from paginated doc

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
- [ ] Set `pageSize ≤ 10` if using secondary data hook with `in` query
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

**See:** `docs/PAGINATION_AND_CACHE_PATTERN.md` for complete step-by-step guide with:
- Detailed explanation of each component
- Copy-paste templates for hooks
- Common pitfalls and solutions
- Real code examples from Usuarios module

### Performance Impact

**Before optimization** (Usuarios with 50 docs):
- `getAll()` → 50 document reads per visit
- No caching → repeated queries on tab switches
- Total: ~50-100+ reads per session

**After optimization** (Usuarios with 50 docs, pageSize=10):
- Paginated query → 11 reads (10 + 1 for `hasMore`)
- Secondary query → 5 reads (only users with ventas)
- Counts → 0 reads (free)
- Cache → 0 reads on repeated visits (5 min TTL)
- **Total: 16 reads first visit, 0 reads next 5 minutes** → **84% reduction**

### Common Mistakes to Avoid

1. ❌ **Using `useRef` for cache** → destroyed on component remount (Next.js tabs)
   ✅ Use module-level `Map` instead

2. ❌ **Not using `enabled` parameter** → queries fire with stale IDs during tab switch
   ✅ Pass `{ enabled: !isLoading }` to secondary hook

3. ❌ **Using `getAll()` in tables** → fetches entire collection
   ✅ Use `useServerPagination` instead

4. ❌ **Using document reads for counts** → expensive and unnecessary
   ✅ Use `getCount()` which is free on Spark

5. ❌ **Querying related data inside render loop** → N+1 query problem
   ✅ Single query with `in [ids]` in dedicated hook

6. ❌ **Not denormalizing frequently-read fields** → extra query per row
   ✅ Store in main doc + update with `increment()`

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
3. Create store in `src/store/` using Firebase CRUD functions (or use direct Firestore calls if the module is simple, like Ventas)
4. Create page in `src/app/(dashboard)/`
5. Create components (Dialog, Table, Filters, Metrics, etc.)
6. Update form schema in Dialog/Form component with Zod
7. Add form fields to Dialog/Form UI
8. Update table columns
9. Add filtering logic if needed
10. Add route to Sidebar if it's a top-level module
11. Test CRUD operations with Firebase
12. Test error handling and loading states

## Testing

- **Framework**: Vitest 4
- **Test files**: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- **Test utilities**: `src/test/setup.ts`, `src/test/utils.ts`
- **Commands**: `npm test`, `npm run test:ui`, `npm run test:watch`, `npm run test:coverage`
- **Status**: Test directories exist but no test files have been written yet.

## Known Issues & Technical Debt

1. **Configuracion Route**: Link exists in sidebar footer (`src/components/layout/Sidebar.tsx`) but route doesn't exist — will cause 404
2. **Subscription References**: Some types (`dashboard.ts`, `clientes.ts`) contain subscription-related fields (`suscripcionesTotales`, `suscripcionesActivas`) for historical data compatibility
3. **Dashboard Placeholder Data**: Dashboard UI restored but contains placeholder/static data (not connected to backend logic)
4. **SUSCRIPCIONES Collection**: Defined in Firestore COLLECTIONS enum but not used in UI (reserved for future use)
5. ~~**Deprecated Stores**: `clientesStore` and `revendedoresStore` are deprecated wrappers~~ ✅ **RESOLVED**: Deprecated stores have been removed.
6. ~~**VentaDoc type location**: The `VentaDoc` interface is exported from `src/components/ventas/VentasMetrics.tsx`~~ ✅ **RESOLVED**: `VentaDoc` now properly defined in `src/types/ventas.ts`.

## Deployment Considerations

When deploying to production:

1. **Firebase Configuration**: Ensure production Firebase credentials are in environment variables
2. **Firebase Security Rules**: Configure Firestore security rules for production
3. **Authentication**: Implement proper user management (not just admin@ email check)
4. **Server-Side Proxy**: Implement JWT/cookie validation in `proxy.ts` for server-side auth
5. **Error Tracking**: Add error monitoring service (Sentry, etc.)
6. **Performance**: Enable Firebase caching and optimize queries
7. **Backup**: Implement Firestore backup strategy

## Migration from Mock Data (Completed)

The system has been fully migrated from mock data to Firebase:

- ✅ All stores use Firebase Firestore
- ✅ Authentication uses Firebase Auth
- ✅ No more simulated delays (real async operations)
- ✅ Data persists across sessions
- ✅ Templates use localStorage (templatesStore)
- ✅ Auth state uses localStorage (authStore)
- ✅ All CRUD operations update Firebase

## Recent Changes (Feb 2026)

### Architecture Refactoring (Feb 4, 2026) ✅ **NEW**
**Major improvements to architecture, performance, and code quality:**

1. **Standardized Data Fetching**:
   - Created `ventasStore` with caching (5-minute timeout), error states, and optimistic updates
   - All stores now follow consistent pattern with error handling
   - Removed direct Firebase calls from components

2. **Error Handling**:
   - Added `error: string | null` state to all 10 stores
   - Implemented `DashboardErrorFallback` component
   - Added `ErrorBoundary` to dashboard layout for better error recovery

3. **Service Layer**:
   - Created `src/lib/services/` directory for business logic
   - `metricsService.ts` - Extracted metrics calculations from components
   - `ventasService.ts` - Encapsulates venta deletion with profile occupancy updates
   - Created `useVentasMetrics` custom hook

4. **Performance Optimizations**:
   - Added 5-minute caching to all stores (reduces Firebase reads)
   - Implemented optimistic updates with rollback for all delete operations
   - Created pagination utilities in `src/lib/firebase/pagination.ts` (ready for future use)
   - Fixed unnecessary re-renders in `VentasMetrics` component

5. **Firebase Layer Improvements**:
   - Automatic timestamp conversion in `getAll()`, `getById()`, `queryDocuments()`
   - No need to manually call `timestampToDate()` in stores anymore
   - Cleaner, more maintainable code

6. **Constants Cleanup**:
   - Added `CYCLE_MONTHS` constant with proper typing
   - Updated `CICLOS_PAGO` to include `semestral` option
   - Eliminated magic numbers throughout codebase

### Ventas Module (NEW)
- Full sales module: pages (`/ventas`, `/ventas/crear`, `/ventas/[id]`, `/ventas/[id]/editar`)
- Components: `VentasForm`, `VentasEditForm`, `VentasTable`, `VentasMetrics`, `RenovarVentaDialog`, `EditarPagoVentaDialog`
- Multi-item sale creation with per-item pricing, discounts, cycles, and WhatsApp message generation
- ~~No dedicated store~~ **UPDATED**: Now uses `ventasStore` with full error handling and caching
- Added to sidebar under GESTIÓN section

### Usuarios Migration (Unified Collection)
- Clients and resellers now stored in a single `usuarios` Firestore collection (previously separate `clientes` / `revendedores` collections)
- `usuariosStore` is the primary store; `clientesStore` / `revendedoresStore` are deprecated wrappers with subscriptions
- `Usuario` type unified with `tipo` discriminator; `Cliente` / `Revendedor` are deprecated aliases
- New detail page (`/usuarios/[id]`) with `UsuarioDetails` component showing user's ventas
- New edit page (`/usuarios/editar/[id]`)

### Server-Side Pagination + Cache Pattern (Feb 5, 2026) ✅ **CRITICAL**
**Major Firebase read optimization — 84% reduction in document reads:**

1. **Pagination with Cursors**:
   - Created `useServerPagination` hook — fetches only `pageSize + 1` docs per page
   - Uses Firestore cursors for forward/backward navigation
   - Auto-resets on filter changes (e.g., tab switches)
   - Implemented in: `src/hooks/useServerPagination.ts`

2. **Module-Level Cache for Secondary Queries**:
   - Created `use-ventas-por-usuarios` hook with module-level cache `Map`
   - Survives component remount/unmount (unlike `useRef`)
   - 5-minute TTL, cache key = `clienteIds.join(',')`
   - Uses `enabled: !isLoading` parameter to avoid stale ID queries
   - Logs cache HIT in dev mode (green console badge)

3. **Count Queries (Free on Spark)**:
   - Added `fetchCounts()` to `usuariosStore` using `getCount()`
   - Count operations do NOT cost document reads on Spark plan
   - Used for: totalClientes, totalRevendedores, totalNuevosHoy, totalClientesActivos

4. **Denormalized Fields**:
   - Added `ventasActivas` field to usuario docs (updated atomically with `increment()`)
   - Eliminates need for separate query to count active ventas per user
   - Updated in all venta mutation points (create/delete/update estado)

5. **Performance Results** (Usuarios module, pageSize=10):
   - Before: ~50-100+ document reads per session
   - After: 16 reads first visit, 0 reads for next 5 minutes
   - Reduction: **84% fewer Firebase reads**

6. **Documentation**:
   - Created `docs/PAGINATION_AND_CACHE_PATTERN.md` — complete replication guide
   - Added "Server-Side Pagination Pattern" section to CLAUDE.md
   - Template code for replicating pattern in other modules
   - Usuarios module is the reference implementation

7. **Files Created/Modified**:
   - `src/hooks/useServerPagination.ts` — pagination hook
   - `src/hooks/use-ventas-por-usuarios.ts` — secondary query with cache
   - `src/lib/firebase/pagination.ts` — `getPaginated()` function
   - `src/components/shared/PaginationFooter.tsx` — reusable UI
   - `src/store/usuariosStore.ts` — added `fetchCounts()` with `getCount()`
   - `src/app/(dashboard)/usuarios/page.tsx` — orchestrator with dynamic filters
   - All 3 tables: `ClientesTable`, `RevendedoresTable`, `TodosUsuariosTable` — use hooks

**CRITICAL**: All new modules with tables MUST follow this pattern. See docs/PAGINATION_AND_CACHE_PATTERN.md.

### Servicios Enhancements
- New detail page (`/servicios/detalle/[id]`) with full payment/renovation history
- `PagoServicio` type and `COLLECTIONS.PAGOS_SERVICIO` collection added
- `RenovarServicioDialog` and `EditarPagoServicioDialog` for managing payment history
- Category-level views: `ServiciosMetrics`, `CategoriasTable`, `ServiciosCategoriaFilters`, `ServiciosCategoriaMetrics`, `ServiciosCategoriaTableDetalle`
- `cicloPago` now supports `semestral` in addition to `mensual`, `trimestral`, `anual`

### WhatsApp Utilities Expanded
- New functions: `openWhatsApp()`, `formatearFechaWhatsApp()`, `generarMensajeVenta()`
- New placeholders: `{servicio}`, `{perfil_nombre}`, `{codigo}`, `{items}`
- `WhatsAppData` type expanded with matching fields

### Firestore Layer
- `queryDocuments<T>()` function added — supports `where` filters with `WhereFilterOp`
- `COLLECTIONS` updated: added `USUARIOS`, `PAGOS_SERVICIO`, `VENTAS`; `CLIENTES`/`REVENDEDORES` marked deprecated

### Previous Changes
- **Removed** (commit db25141): Suscripciones module, Pagos de Servicios module
- **Restored** (commit 8b4072d): Dashboard UI components with placeholder data
- **Fixed** (commit 9feb52b, d99fae7): Cleaned up imports and references to removed modules

---

## Quick Reference Guide

### Most Common Tasks

#### Creating a New Module with a Table

1. **Create types** in `src/types/[module].ts`
2. **Add collection** to `COLLECTIONS` enum in `firestore.ts`
3. **Create store** with `fetchCounts()` using `getCount()`:
   ```typescript
   fetchCounts: async () => {
     const [total, totalActive] = await Promise.all([
       getCount(COLLECTIONS.MY_ITEMS),
       getCount(COLLECTIONS.MY_ITEMS, [{ field: 'estado', operator: '==', value: 'active' }]),
     ]);
     set({ total, totalActive });
   }
   ```
4. **Create page** with `useServerPagination`:
   ```typescript
   const { data, isLoading, hasMore, page, next, previous, refresh } = useServerPagination({
     collectionName: COLLECTIONS.MY_ITEMS,
     filters,
     pageSize: 10,
   });
   ```
5. **If you need related data per row**, create custom hook:
   ```typescript
   // Module-level cache
   const cache = new Map();
   export function useRelatedData(ids: string[], { enabled = true } = {}) {
     // Check cache → query if miss → save to cache
   }
   ```
6. **Create table component** with `PaginationFooter`
7. **Add route** to sidebar
8. **Test** pagination, caching, and CRUD ops

#### Adding a New Field to Existing Type

1. **Update interface** in `src/types/[module].ts`
2. **Update form schema** (Zod validation)
3. **Update form UI** (add input field)
4. **Update table columns** (if displayed)
5. **Update store** create/update methods if needed
6. **Test** create/edit operations

#### Creating a Form Dialog

```typescript
// 1. Schema
const schema = z.object({
  nombre: z.string().min(2),
  // ... fields
});

// 2. Form
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});

// 3. Submit
const onSubmit = async (data) => {
  try {
    await createItem(data);
    toast.success('Created');
    onOpenChange(false);
  } catch (error) {
    toast.error('Error');
  }
};
```

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
| Atomic increment | `adjustVentasActivas(id, delta)` | 1 write |

### Common Code Patterns

#### Zustand Store with Firebase

```typescript
export const useMyStore = create<State>()(
  devtools((set, get) => ({
    items: [],
    isLoading: false,
    error: null,
    lastFetch: null,

    fetchItems: async (force = false) => {
      if (!force && get().lastFetch && Date.now() - get().lastFetch < 300000) {
        logCacheHit(COLLECTIONS.ITEMS);
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const items = await getAll<Item>(COLLECTIONS.ITEMS);
        set({ items, isLoading: false, lastFetch: Date.now() });
      } catch (error) {
        set({ error: error.message, isLoading: false });
      }
    },

    deleteItem: async (id) => {
      const prev = get().items;
      set({ items: prev.filter(i => i.id !== id) }); // Optimistic
      try {
        await remove(COLLECTIONS.ITEMS, id);
      } catch (error) {
        set({ items: prev, error: error.message }); // Rollback
        throw error;
      }
    },
  }))
);
```

#### Custom Hook with Module-Level Cache

```typescript
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: Record<string, Stats>; ts: number }>();

export function useMyStats(ids: string[], { enabled = true } = {}) {
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!enabled || ids.length === 0) return;

    const cached = cache.get(idsKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStats(cached.data);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const docs = await queryDocuments(COLLECTION, [
        { field: 'refId', operator: 'in', value: ids }
      ]);
      if (cancelled) return;
      const result = {}; // Calculate stats
      cache.set(idsKey, { data: result, ts: Date.now() });
      setStats(result);
    };
    load();
    return () => { cancelled = true; };
  }, [idsKey, enabled]);

  return { stats };
}
```

#### React Component with Memoization

```typescript
export const MyMetrics = memo(function MyMetrics({ items }) {
  const metrics = useMemo(() => {
    // Single-pass calculation
    let total = 0, active = 0;
    items.forEach(item => {
      total++;
      if (item.active) active++;
    });
    return { total, active };
  }, [items]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard title="Total" value={metrics.total} />
      <MetricCard title="Active" value={metrics.active} />
    </div>
  );
});
```

### Debugging Tips

#### Check Firebase Reads

Open browser console and look for:
- `[Firestore] paginated (collection) → N docs · Xms` (blue badge)
- `[Firestore] query (collection where ...) → N docs · Xms` (blue badge)
- `[VentasCache] HIT · N IDs · age Xs` (green badge)
- `[Cache] HIT · collection` (green badge)

#### Force Refresh Cache

```typescript
// In store:
fetchItems(true); // force = true bypasses cache

// In component:
const { refresh } = useServerPagination(...);
refresh(); // Forces re-fetch of current page
```

#### Test Pagination

1. Add 15+ items to collection
2. Set `pageSize = 10`
3. Navigate to page 2 → should see "Página 2 de 2"
4. Check console → should see 11 reads (10 + 1 for hasMore)
5. Go back to page 1 → should use cached cursor (no new reads)

### Performance Monitoring

| Metric | Tool | Target |
|--------|------|--------|
| Firebase reads per visit | Browser console | <20 first visit, 0 cached |
| Component re-renders | React DevTools Profiler | Only changed components |
| Time to Interactive | Lighthouse | <3s |
| Total Bundle Size | `npm run build` output | <500KB gzipped |

### Documentation Shortcuts

| Need | Read |
|------|------|
| Pagination pattern | `docs/PAGINATION_AND_CACHE_PATTERN.md` |
| React optimizations | `docs/PERFORMANCE_OPTIMIZATIONS.md` |
| Firebase setup | `docs/FIREBASE_SETUP.md` |
| Project overview | This file (CLAUDE.md) |

---

**Last Updated:** February 5, 2026
**Version:** 2.1.0
