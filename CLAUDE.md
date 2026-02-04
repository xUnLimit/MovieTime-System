# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), sales, categories, payment methods, and automatic notifications. The system is integrated with **Firebase** (Authentication + Firestore) for data persistence.

**Note**: The legacy Subscriptions (Suscripciones) and Service Payments (Pagos de Servicios) modules were removed in January 2026 (commit db25141). They have been replaced by the **Ventas** (Sales) module and the **Servicios Detalle** payment/renewal system.

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
├── docs/                      # Documentation (9 files)
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
    │   └── use-sidebar.ts   # Sidebar toggle state hook
    ├── lib/                  # Utilities and helpers
    │   ├── firebase/        # Firebase integration
    │   │   ├── auth.ts     # Authentication functions
    │   │   ├── config.ts   # Firebase initialization
    │   │   └── firestore.ts # Generic CRUD + COLLECTIONS + queryDocuments
    │   ├── utils/           # Utility functions
    │   │   ├── calculations.ts # Business logic
    │   │   ├── whatsapp.ts    # WhatsApp utilities (expanded)
    │   │   ├── cn.ts          # Class utilities
    │   │   └── index.ts       # Exports
    │   └── constants/       # Application constants
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
- `getAll<T>(collection)` - Fetch all documents
- `getById<T>(collection, id)` - Fetch single document
- `queryDocuments<T>(collection, filters)` - Query with `where` filters ← NEW
- `create<T>(collection, data)` - Create document (auto-adds `createdAt`/`updatedAt`)
- `update<T>(collection, id, data)` - Update document (auto-updates `updatedAt`)
- `remove(collection, id)` - Delete document
- `timestampToDate(timestamp)` - Convert Firestore Timestamp → Date
- `dateToTimestamp(date)` - Convert Date → Firestore Timestamp

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

### Store Directory (12 stores)

All stores in `src/store/` are Firebase-integrated:

1. **authStore.ts** - Firebase authentication + localStorage persistence
2. **usuariosStore.ts** - Manages both clients and resellers in a single `usuarios` collection. Supports `fetchUsuarios()`, `fetchClientes()`, `fetchRevendedores()` (the latter two use `queryDocuments` with `tipo` filter). Has `getClientes()` / `getRevendedores()` selectors.
3. **clientesStore.ts** - ⚠️ **Deprecated wrapper** around `usuariosStore`. Subscribes to `usuariosStore` and syncs filtered state. Use `usuariosStore` directly for new code.
4. **revendedoresStore.ts** - ⚠️ **Deprecated wrapper** around `usuariosStore`. Same pattern as `clientesStore`. Use `usuariosStore` directly for new code.
5. **serviciosStore.ts** - Services management. Creates an initial `PagoServicio` record in `COLLECTIONS.PAGOS_SERVICIO` when a service is created. Includes `updatePerfilOcupado()` for profile occupancy tracking.
6. **categoriasStore.ts** - Categories (Firebase)
7. **metodosPagoStore.ts** - Payment methods (Firebase)
8. **notificacionesStore.ts** - Notifications (Firebase)
9. **activityLogStore.ts** - Activity logs (Firebase)
10. **configStore.ts** - Configuration settings (Firebase)
11. **templatesStore.ts** - Message templates (localStorage persistence)
12. **templatesMensajesStore.ts** - Additional template management

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

9. **Usuarios stores**: Do not create new code that uses `clientesStore` or `revendedoresStore` directly. Use `usuariosStore` and filter by `tipo` instead. The wrapper stores exist only for backward compatibility with existing components.

10. **Ventas has no store**: The Ventas module calls Firestore functions directly. Do not create a `ventasStore` unless explicitly needed — follow the existing pattern of direct calls + local `useState`.

11. **Profile occupancy**: When creating or deleting a venta that occupies a service profile, always call `updatePerfilOcupado(servicioId, increment)` on `serviciosStore` to keep the occupancy count in sync.

## Firebase Best Practices

1. **Use COLLECTIONS enum**: Always use `COLLECTIONS.ITEMS` instead of hardcoded strings
2. **Generic CRUD functions**: Use `getAll()`, `getById()`, `queryDocuments()`, `create()`, `update()`, `remove()` from `src/lib/firebase/firestore.ts`
3. **Type safety**: Pass type parameter to generic functions: `getAll<Servicio>(COLLECTIONS.SERVICIOS)`
4. **Error handling**: Firebase operations can fail - always handle errors gracefully
5. **Loading states**: Show loading indicators while Firebase operations are in progress
6. **Optimistic updates**: Update local state immediately, then sync with Firebase
7. **Undefined fields**: The `create()` and `update()` functions automatically strip `undefined` values before writing to Firestore (via `removeUndefinedFields`)

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
5. **Deprecated Stores**: `clientesStore` and `revendedoresStore` are deprecated wrappers; existing components that use them still work via subscriptions to `usuariosStore`, but new code should use `usuariosStore` directly
6. **VentaDoc type location**: The `VentaDoc` interface is exported from `src/components/ventas/VentasMetrics.tsx` rather than from `src/types/`. Consider moving it to `src/types/` in a future refactor.

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

### Ventas Module (NEW)
- Full sales module: pages (`/ventas`, `/ventas/crear`, `/ventas/[id]`, `/ventas/[id]/editar`)
- Components: `VentasForm`, `VentasEditForm`, `VentasTable`, `VentasMetrics`, `RenovarVentaDialog`, `EditarPagoVentaDialog`
- Multi-item sale creation with per-item pricing, discounts, cycles, and WhatsApp message generation
- No dedicated store — direct Firestore calls + local state
- Added to sidebar under GESTIÓN section

### Usuarios Migration (Unified Collection)
- Clients and resellers now stored in a single `usuarios` Firestore collection (previously separate `clientes` / `revendedores` collections)
- `usuariosStore` is the primary store; `clientesStore` / `revendedoresStore` are deprecated wrappers with subscriptions
- `Usuario` type unified with `tipo` discriminator; `Cliente` / `Revendedor` are deprecated aliases
- New detail page (`/usuarios/[id]`) with `UsuarioDetails` component showing user's ventas
- New edit page (`/usuarios/editar/[id]`)

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
