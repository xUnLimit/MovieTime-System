# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MovieTime PTY is a subscription management system for streaming services in Panama. It manages clients, resellers, services (Netflix, Disney+, etc.), subscriptions with payment cycles, and automatic notifications. The frontend is fully implemented with mock data using Zustand for state management, ready for backend integration.

## Project Structure (Reorganized Jan 2026)

```
MovieTime System/
├── proxy.ts                   # Next.js 16 Edge Runtime proxy (root level)
├── vitest.config.ts          # Test configuration
├── docs/                      # Documentation
├── public/                    # Static assets (cleaned)
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
└── src/
    ├── app/                  # Next.js App Router
    ├── components/           # React components by feature
    ├── config/               # Configuration files
    │   ├── constants.ts      # App constants
    │   ├── env.ts           # Environment config
    │   └── site.ts          # Site metadata
    ├── hooks/                # Custom React hooks
    ├── lib/                  # Utilities and helpers
    │   ├── constants/       # (Original location, re-exported from config)
    │   ├── mock-data/       # Mock data (separated by entity)
    │   └── utils/           # Utility functions
    ├── store/                # Zustand stores
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
        ├── suscripciones.ts # Subscription types
        └── whatsapp.ts      # WhatsApp types
```

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server on localhost:3000
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

# Test Credentials
Email: admin@movietime.com
Password: 123456 (any 6+ characters works)
```

## Architecture Overview

### State Management with Zustand

The app uses **Zustand** stores (not Redux) with a specific pattern:

- All stores are in `src/store/` directory
- Each store simulates API calls with 300-500ms delays for realistic UX
- Stores are NOT persisted except `authStore` and `templatesStore` (uses localStorage)
- All CRUD operations return promises and update state immutably

**Critical Store Pattern:**
```typescript
// Always use this pattern in stores
fetchItems: async () => {
  set({ isLoading: true });
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulated delay
  set({ items: MOCK_DATA, isLoading: false });
}
```

### Store Directory

- `src/store/` - All Zustand stores (suscripcionesStore, authStore, etc.)
- ~~`src/stores/`~~ - **REMOVED** (was duplicate/legacy, consolidated Jan 2026)
- All stores are in a single directory for consistency
- Some stores use re-exports for convenience (clientesStore, revendedoresStore)

### Type System

Types are **organized by domain** in `src/types/` directory:
- `auth.ts` - User, authentication
- `categorias.ts` - Categories
- `clientes.ts` - Clients, Resellers
- `common.ts` - Shared types (Activity logs, Config, Gastos, Templates)
- `dashboard.ts` - Dashboard metrics
- `metodos-pago.ts` - Payment methods
- `notificaciones.ts` - Notifications
- `servicios.ts` - Services
- `suscripciones.ts` - Subscriptions
- `whatsapp.ts` - WhatsApp integration
- `index.ts` - Barrel export (imports work from `@/types`)

Key concepts:

- **Suscripción (Subscription)**: Has calculated fields (`consumoPorcentaje`, `montoRestante`, `estado`) that must be recomputed when dates change
- **Payment Cycles**: `mensual` (1 month), `trimestral` (3 months), `anual` (12 months)
- **Subscription States**: `activa`, `suspendida`, `inactiva`, `vencida` (auto-calculated based on dates)
- **Notification Days**: [100, 11, 8, 7, 3, 2, 1] - subscriptions are notified at these intervals before expiration

### Calculation Utilities

All business logic calculations are in `src/lib/utils/calculations.ts`:

- `calcularFechaVencimiento()` - Computes expiration date from start date + cycle
- `calcularConsumo()` - Returns 0-100% consumption based on elapsed time
- `calcularMontoRestante()` - Amount remaining based on consumption
- `calcularEstadoSuscripcion()` - Determines if subscription is `activa` or `vencida`
- `formatearMoneda()` - Formats numbers as USD currency

**Important**: When updating subscription dates, always recalculate these fields using the utility functions.

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
│   ├── dashboard/   # Home dashboard
│   ├── servicios/   # Streaming service management
│   ├── usuarios/    # Clients & Resellers (tabs)
│   ├── suscripciones/  # Subscriptions with cycle tracking
│   ├── notificaciones/
│   ├── editor-mensajes/  # WhatsApp template editor
│   ├── log-actividad/
│   ├── categorias/
│   ├── metodos-pago/
│   └── pagos-servicios/
```

### Component Patterns

Every module follows this structure:

1. **Page** (`page.tsx`): Main component with filtering logic and state
2. **Metrics** (`*Metrics.tsx`): 4 cards displaying key stats
3. **Filters** (`*Filters.tsx`): Search + dropdowns for filtering
4. **Table** (`*Table.tsx`): Data table with actions
5. **Dialog** (`*Dialog.tsx`): Form for create/edit with React Hook Form + Zod

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
    await createItem(data);
    toast.success('Created successfully');
    onOpenChange(false);
  } catch (error) {
    toast.error('Error');
  }
};
```

## Critical Implementation Details

### Suscripciones Complexity

Subscriptions are the most complex entity:

1. **Auto-calculated fields** - Never set these manually in forms:
   - `fechaVencimiento` (computed from `fechaInicio` + `cicloPago`)
   - `consumoPorcentaje` (based on days elapsed)
   - `montoRestante` (monto × remaining percentage)
   - `estado` (active if before expiration, vencida after)

2. **Renovation Logic** (`renovarSuscripcion`):
   - Sets new `fechaInicio` to today
   - Recalculates `fechaVencimiento` based on cycle
   - Increments `renovaciones` counter
   - Resets `consumoPorcentaje` to 0
   - Sets `estado` to 'activa'

3. **Type Switching**:
   - Subscriptions can be for `cliente` or `revendedor`
   - When type changes in form, clear the selected user ID
   - Auto-populate payment method from selected user

### Services (Servicios)

- **Individual**: 1 profile, cost = `costoPorPerfil`
- **Familiar**: Multiple profiles, cost = `costoPorPerfil × perfilesDisponibles`
- Track `perfilesOcupados` vs `perfilesDisponibles`
- Show progress bar for occupancy percentage

### Notifications

- Generated automatically based on subscription expiration dates
- Priority increases as expiration approaches (100 days = baja, 1 day = crítica)
- `estado` field maps to notification thresholds: '100_dias', '11_dias', '8_dias', '7_dias', '3_dias', '2_dias', '1_dia', 'vencido'

### Authentication

Mock authentication (`authStore`):
- Accepts any email with 6+ character password
- Email with `admin@` = admin role, others = operador
- State persisted to localStorage

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

## Data Flow

1. **On mount**: Pages call `fetchItems()` from store
2. **Local filtering**: Use `useMemo` to filter store data locally (no server calls)
3. **CRUD operations**: Call store methods, which update state + show toast
4. **No persistence**: Changes lost on reload (except auth & templates)

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

- **Subscription Status**:
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

### Responsive Grid

Standard layout for metrics:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 4 metric cards */}
</div>
```

## Common Pitfalls

1. **Recalculate subscription fields**: When updating `fechaInicio` or `fechaVencimiento`, you must recalculate `consumoPorcentaje`, `montoRestante`, and `estado` using the calculation utilities.

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

4. **Date handling**: Use `date-fns` functions, not native Date methods. All dates stored as Date objects, not strings.

5. **Zustand updates**: Always return new objects/arrays, never mutate:
```typescript
// ✅ Correct
set((state) => ({ items: [...state.items, newItem] }))

// ❌ Wrong
state.items.push(newItem)
```

## Future Backend Integration

The codebase is designed for easy migration:

1. Replace store fetch delays with actual `fetch()` or API client calls
2. Add error handling for network failures
3. Remove mock data imports
4. Implement server-side validation
5. Add authentication token management

All business logic (calculations, validation schemas) can be reused on the backend.

## shadcn/ui Components

Installed components:
- Dialog, Alert Dialog
- Button, Input, Label, Select, Checkbox, Switch
- Table, Tabs, Badge, Progress, Avatar, Separator
- Dropdown Menu, Popover
- Calendar (react-day-picker)

Add new components: Check shadcn/ui docs, copy to `src/components/ui/`

## Development Workflow

When adding features:

1. Update type in `src/types/index.ts`
2. Update store (fetch, create, update, delete)
3. Update form schema in Dialog component
4. Add form fields to Dialog UI
5. Update table columns
6. Add filtering logic if needed
7. Test CRUD operations and filters
