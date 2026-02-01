# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), categories, payment methods, and automatic notifications. The system is integrated with **Firebase** (Authentication + Firestore) for data persistence.

**Note**: The Subscriptions (Suscripciones) and Service Payments (Pagos de Servicios) modules were removed in January 2026 (commit db25141). The dashboard UI has been restored with placeholder components.

## Project Structure (Updated Feb 2026)

```
MovieTime System/
├── proxy.ts                   # Next.js 16 Edge Runtime proxy (root level)
├── vitest.config.ts          # Test configuration
├── .env.local                # Firebase credentials (not in repo)
├── docs/                      # Documentation
├── public/                    # Static assets
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
└── src/
    ├── app/                  # Next.js App Router
    ├── components/           # React components by feature
    │   ├── layout/          # Sidebar, Header, NotificationBell
    │   ├── dashboard/       # Dashboard metrics & charts
    │   ├── servicios/       # Services components
    │   ├── usuarios/        # Clients & Resellers components
    │   ├── categorias/      # Categories components
    │   ├── metodos-pago/    # Payment methods components
    │   ├── notificaciones/  # Notifications components
    │   ├── editor-mensajes/ # WhatsApp template editor
    │   ├── log-actividad/   # Activity log components
    │   ├── shared/          # Shared components
    │   └── ui/              # shadcn/ui components
    ├── config/               # Configuration files
    │   ├── constants.ts      # App constants
    │   ├── env.ts           # Environment config
    │   └── site.ts          # Site metadata
    ├── hooks/                # Custom React hooks
    ├── lib/                  # Utilities and helpers
    │   ├── firebase/        # Firebase integration
    │   │   ├── auth.ts     # Authentication functions
    │   │   ├── config.ts   # Firebase initialization
    │   │   └── firestore.ts # Generic CRUD + COLLECTIONS
    │   ├── utils/           # Utility functions
    │   │   ├── calculations.ts # Business logic
    │   │   ├── whatsapp.ts    # WhatsApp utilities
    │   │   ├── cn.ts          # Class utilities
    │   │   └── index.ts       # Exports
    │   └── config/          # (Re-exported from config/)
    ├── store/                # Zustand stores (Firebase-integrated)
    ├── test/                 # Test utilities
    │   ├── setup.ts         # Test setup
    │   └── utils.ts         # Test helpers
    └── types/                # TypeScript types (separated by domain)
        ├── index.ts         # Barrel export
        ├── auth.ts          # Authentication types
        ├── categorias.ts    # Category types
        ├── clientes.ts      # Client/Reseller types
        ├── common.ts        # Shared types
        ├── dashboard.ts     # Dashboard types
        ├── metodos-pago.ts  # Payment method types
        ├── notificaciones.ts # Notification types
        ├── servicios.ts     # Service types
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
  CLIENTES: 'clientes',
  REVENDEDORES: 'revendedores',
  SERVICIOS: 'servicios',
  CATEGORIAS: 'categorias',
  SUSCRIPCIONES: 'suscripciones',  // Defined but not used in UI
  NOTIFICACIONES: 'notificaciones',
  METODOS_PAGO: 'metodosPago',
  ACTIVITY_LOG: 'activityLog',
  CONFIG: 'config',
  GASTOS: 'gastos',
  TEMPLATES: 'templates',
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

**Firebase Functions:**
- `src/lib/firebase/auth.ts` - `signInUser()`, `signOutUser()`, `onAuthChange()`
- `src/lib/firebase/config.ts` - Firebase app initialization
- `src/lib/firebase/firestore.ts` - Generic CRUD: `getAll()`, `getById()`, `create()`, `update()`, `deleteDoc()`

### State Management with Zustand

The app uses **Zustand** stores (not Redux) with **Firebase integration**:

- All stores are in `src/store/` directory
- Each store uses Firebase Firestore for data persistence
- Stores handle loading states during async Firebase operations
- Only `authStore` and `templatesStore` persist to localStorage
- All CRUD operations are async and update Firestore

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
2. **usuariosStore.ts** - Manages both clients and resellers (Firebase)
3. **clientesStore.ts** - Re-export from usuariosStore for convenience
4. **revendedoresStore.ts** - Re-export from usuariosStore for convenience
5. **serviciosStore.ts** - Services management (Firebase)
6. **categoriasStore.ts** - Categories (Firebase)
7. **metodosPagoStore.ts** - Payment methods (Firebase)
8. **notificacionesStore.ts** - Notifications (Firebase)
9. **activityLogStore.ts** - Activity logs (Firebase)
10. **configStore.ts** - Configuration settings (Firebase)
11. **templatesStore.ts** - Message templates (localStorage persistence)
12. **templatesMensajesStore.ts** - Additional template management

**Note**: ~~`suscripcionesStore.ts`~~ was removed in commit db25141 (Subscriptions module removed).

### Type System

Types are **organized by domain** in `src/types/` directory:
- `auth.ts` - User, authentication, role-based access
- `categorias.ts` - Categories
- `clientes.ts` - Clients, Resellers (contains legacy `suscripcionesTotales` field)
- `common.ts` - Shared types (ActivityLog, Configuracion, Gasto, TemplateMensaje)
- `dashboard.ts` - Dashboard metrics (contains legacy `suscripcionesActivas` field)
- `metodos-pago.ts` - Payment methods
- `notificaciones.ts` - Notifications
- `servicios.ts` - Services (individual/familiar)
- `whatsapp.ts` - WhatsApp integration
- `index.ts` - Barrel export (imports work from `@/types`)

**Note**: ~~`suscripciones.ts`~~ was removed. Some subscription references remain in other types for historical data compatibility.

Key concepts:

- **Payment Cycles**: `mensual` (1 month), `trimestral` (3 months), `anual` (12 months)
- **Notification Days**: [100, 11, 8, 7, 3, 2, 1] - notifications sent at these intervals before expiration
- **User Roles**: `admin` (full access), `operador` (limited access)

### Calculation Utilities

All business logic calculations are in `src/lib/utils/calculations.ts`:

- `calcularFechaVencimiento()` - Computes expiration date from start date + cycle
- `calcularConsumo()` - Returns 0-100% consumption based on elapsed time
- `calcularMontoRestante()` - Amount remaining based on consumption
- `calcularEstadoSuscripcion()` - Determines if subscription is `activa` or `vencida`
- `formatearMoneda()` - Formats numbers as USD currency

**Note**: These utilities remain for potential future subscription features or historical data calculations.

### WhatsApp Integration

WhatsApp utilities in `src/lib/utils/whatsapp.ts`:

- `getSaludo()` - Returns time-based greeting (Buenos días/tardes/noches)
- `replacePlaceholders()` - Replaces template variables like `{cliente}`, `{correo}`, `{vencimiento}`
- `generateWhatsAppLink()` - Creates `wa.me` links with pre-filled messages
- **Available Placeholders**: `{saludo}`, `{cliente}`, `{categoria}`, `{correo}`, `{contrasena}`, `{vencimiento}`, `{monto}`, `{diasRetraso}`

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
│   │   └── [id]/editar/  # Edit service
│   ├── usuarios/    # Clients & Resellers (tabs)
│   ├── notificaciones/
│   ├── editor-mensajes/  # WhatsApp template editor
│   ├── log-actividad/
│   ├── categorias/
│   │   ├── crear/   # Create category
│   │   └── [id]/editar/  # Edit category
│   └── metodos-pago/
│       ├── crear/   # Create payment method
│       └── [id]/editar/  # Edit payment method
```

**REMOVED ROUTES** (commit db25141):
- ❌ `/suscripciones` - Subscriptions module completely removed
- ❌ `/pagos-servicios` - Service payments module removed

**KNOWN ISSUES**:
- ⚠️ `/configuracion` - Link exists in sidebar but route doesn't exist (will cause 404)

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

- **Individual**: 1 profile, cost = `costoPorPerfil`
- **Familiar**: Multiple profiles, cost = `costoPorPerfil × perfilesDisponibles`
- Track `perfilesOcupados` vs `perfilesDisponibles`
- Show progress bar for occupancy percentage
- Managed in Firebase `servicios` collection

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
1. **Client-Side (Primary):** `src/app/(dashboard)/layout.tsx` (lines 18-41)
   - Checks `isAuthenticated` from authStore with Zustand hydration
   - Redirects to `/login` if not authenticated
   - Shows loading spinner while hydrating state from localStorage

2. **Server-Side (Proxy):** `proxy.ts` (project root)
   - Next.js 16 Edge Runtime proxy
   - Exports `function proxy()` (Next.js 16 convention)
   - Currently allows all navigation (auth is client-side)
   - Placeholder for future JWT/cookie validation in production

### Usuarios (Clients & Resellers)

- Single `usuariosStore` manages both types
- Separate re-export stores (`clientesStore`, `revendedoresStore`) for convenience
- Single page with tabs to switch between views
- Both types stored in separate Firebase collections: `clientes` and `revendedores`
- Dialogs: `ClienteDialog`, `RevendedorDialog`
- Tables: `ClientesTable`, `RevendedoresTable`, `TodosUsuariosTable`

## Data Flow

1. **On mount**: Pages call `fetchItems()` from store
2. **Firebase fetch**: Store calls Firebase `getAll()` function
3. **Local filtering**: Use `useMemo` to filter store data locally (no server calls)
4. **CRUD operations**: Call store methods, which update Firebase + local state + show toast
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

- **Subscription Status** (legacy, for historical data):
  - Activa: green
  - Suspendida: yellow
  - Inactiva: gray
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

- Edit: `Pencil`
- Delete: `Trash2`
- WhatsApp: `MessageCircle` (text-green-600)
- Actions menu: `MoreVertical`
- Status: `AlertCircle` / `CheckCircle`
- Add: `Plus`
- Search: `Search`
- Filter: `Filter`

### Responsive Grid

Standard layout for metrics:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 4 metric cards */}
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

4. **Date handling**: Use `date-fns` functions, not native Date methods. Store dates as Firestore Timestamps or Date objects.

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

## Firebase Best Practices

1. **Use COLLECTIONS enum**: Always use `COLLECTIONS.ITEMS` instead of hardcoded strings
2. **Generic CRUD functions**: Use `getAll()`, `getById()`, `create()`, `update()`, `deleteDoc()` from `src/lib/firebase/firestore.ts`
3. **Type safety**: Pass type parameter to generic functions: `getAll<Servicio>(COLLECTIONS.SERVICIOS)`
4. **Error handling**: Firebase operations can fail - always handle errors gracefully
5. **Loading states**: Show loading indicators while Firebase operations are in progress
6. **Optimistic updates**: Update local state immediately, then sync with Firebase

## shadcn/ui Components

Installed components:
- Dialog, Alert Dialog
- Button, Input, Label, Select, Checkbox, Switch
- Table, Tabs, Badge, Progress, Avatar, Separator
- Dropdown Menu, Popover
- Calendar (react-day-picker)
- Card, Form, Textarea

Add new components: Check shadcn/ui docs, copy to `src/components/ui/`

## Development Workflow

When adding features:

1. Update type in `src/types/[domain].ts`
2. Add Firestore collection to `COLLECTIONS` enum (if new entity)
3. Create store in `src/store/` using Firebase CRUD functions
4. Create page in `src/app/(dashboard)/`
5. Create components (Dialog, Table, Filters, etc.)
6. Update form schema in Dialog component with Zod
7. Add form fields to Dialog UI
8. Update table columns
9. Add filtering logic if needed
10. Test CRUD operations with Firebase
11. Test error handling and loading states

## Testing

- **Framework**: Vitest 4
- **Test files**: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- **Test utilities**: `src/test/setup.ts`, `src/test/utils.ts`
- **Commands**: `npm test`, `npm run test:ui`, `npm run test:watch`, `npm run test:coverage`

## Known Issues & Technical Debt

1. **Configuracion Route**: Link exists in sidebar (`src/components/layout/Sidebar.tsx`) but route doesn't exist - will cause 404
2. **Subscription References**: Some types (`dashboard.ts`, `clientes.ts`) contain subscription-related fields for historical data compatibility
3. **Dashboard Placeholder Data**: Dashboard UI restored but contains placeholder/static data (not connected to backend logic)
4. **SUSCRIPCIONES Collection**: Defined in Firestore COLLECTIONS enum but not used in UI (reserved for future use)

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

- **Removed** (commit db25141): Suscripciones module, Pagos de Servicios module
- **Restored** (commit 8b4072d): Dashboard UI components with placeholder data
- **Fixed** (commit 9feb52b, d99fae7): Cleaned up imports and references to removed modules
- **Status**: System is stable with core features (services, users, categories, payment methods, notifications, activity log, message templates)
