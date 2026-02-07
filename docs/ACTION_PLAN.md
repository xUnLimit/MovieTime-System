# MovieTime System - Production Readiness Action Plan

**Date:** February 7, 2026
**Version:** 1.0
**Target:** Production-ready deployment in 5-8 weeks

---

## Executive Summary

This action plan outlines the steps required to transition MovieTime System from its current state (B+ grade with critical security issues) to a production-ready system (A- grade).

**Current State:**
- ✅ Excellent architecture and performance patterns
- ✅ Comprehensive documentation
- ✅ Strong type safety
- 🚨 Critical security vulnerabilities
- ❌ Zero test coverage

**Target State:**
- ✅ Security hardened (Custom Claims + Security Rules)
- ✅ 80% test coverage
- ✅ Full error tracking and monitoring
- ✅ Production-ready deployment

**Timeline:** 5-8 weeks (single developer)
**Critical Path:** Security (Weeks 1-2) → Testing (Weeks 3-5)

---

## Phase 1: Security Hardening (BLOCKING)

**Duration:** 1-2 weeks
**Priority:** CRITICAL 🚨
**Blocking:** Cannot deploy to production without this

### Week 1: Firebase Security Foundation

#### Day 1-2: Firebase Security Rules
**File:** `firestore.rules` (already created)

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Test rules locally
firebase emulators:start --only firestore
```

**Checklist:**
- [ ] Review `firestore.rules` file
- [ ] Test rules with Firebase Emulator
- [ ] Deploy rules to production project
- [ ] Verify rules work with existing app
- [ ] Document any breaking changes

**Expected Issues:**
- Existing queries may fail due to missing indexes
- Some operations may be denied (admin-only)

**Testing Commands:**
```javascript
// Test in Firebase console or emulator
// Try to read usuarios as unauthenticated
firebase.firestore().collection('usuarios').get()
  .catch(err => console.log('✅ Blocked:', err)); // Should fail

// Try to delete as operador
firebase.firestore().collection('usuarios').doc('id').delete()
  .catch(err => console.log('✅ Blocked:', err)); // Should fail
```

#### Day 3-4: Firestore Indexes
**File:** `firestore.indexes.json` (already created)

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Check index build status
firebase firestore:indexes
```

**Checklist:**
- [ ] Review `firestore.indexes.json`
- [ ] Deploy indexes to production
- [ ] Wait for index builds (can take hours for large collections)
- [ ] Test queries that use composite indexes
- [ ] Add any missing indexes from production logs

#### Day 5: Firebase App Check (Rate Limiting)
**File:** `src/lib/firebase/config.ts`

```typescript
// Add to firebase config.ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Initialize App Check
if (typeof window !== 'undefined') {
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true
  });
}
```

**Checklist:**
- [ ] Register site with reCAPTCHA v3
- [ ] Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to `.env.local`
- [ ] Initialize App Check in config
- [ ] Enable App Check in Firebase Console
- [ ] Test with App Check enforced
- [ ] Monitor blocked requests

**Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### Week 2: Custom Claims & Server-Side Validation

#### Day 1-3: Firebase Functions Setup
**New Directory:** `functions/`

```bash
# Initialize Firebase Functions
firebase init functions

# Choose TypeScript
# Install dependencies
cd functions
npm install
```

**File Structure:**
```
functions/
├── src/
│   ├── index.ts              # Main exports
│   ├── auth/
│   │   ├── onUserCreated.ts  # Set initial claims
│   │   └── setAdminClaim.ts  # Admin management
│   ├── validation/
│   │   ├── validateVenta.ts  # Venta validation
│   │   └── validateUsuario.ts # Usuario validation
│   └── utils/
│       └── validators.ts     # Shared validation
├── package.json
└── tsconfig.json
```

**Sample Implementation:**

```typescript
// functions/src/auth/setAdminClaim.ts
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';

export const setAdminClaim = https.onCall(async (data, context) => {
  // Only existing admins can set admin claims
  if (!context.auth?.token.admin) {
    throw new https.HttpsError('permission-denied', 'Only admins can set admin claims');
  }

  const { uid, admin: isAdmin } = data;

  await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });

  return { success: true };
});
```

```typescript
// functions/src/validation/validateVenta.ts
import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createVenta = https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Must be logged in');
  }

  // Validate data server-side
  const { clienteId, servicioId, precio } = data;

  if (!clienteId || !servicioId) {
    throw new https.HttpsError('invalid-argument', 'Missing required fields');
  }

  if (precio <= 0) {
    throw new https.HttpsError('invalid-argument', 'Price must be positive');
  }

  // Check if client exists
  const clientDoc = await admin.firestore().collection('usuarios').doc(clienteId).get();
  if (!clientDoc.exists) {
    throw new https.HttpsError('not-found', 'Client not found');
  }

  // Create venta with server timestamp
  const ventaRef = await admin.firestore().collection('ventas').add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { id: ventaRef.id };
});
```

**Checklist:**
- [ ] Initialize Firebase Functions project
- [ ] Create auth functions (setAdminClaim)
- [ ] Create validation functions (createVenta, createUsuario)
- [ ] Add unit tests for functions
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test functions from client
- [ ] Update client code to use functions

#### Day 4-5: Update Client Code

**Update Auth Store:**

```typescript
// src/lib/firebase/auth.ts
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function getUserRole(user: FirebaseUser): Promise<'admin' | 'operador'> {
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true ? 'admin' : 'operador';
  } catch (error) {
    console.error('Error getting role:', error);
    return 'operador'; // Default to least privileged
  }
}

// Admin function to set roles
export async function setUserAdmin(uid: string, isAdmin: boolean) {
  const functions = getFunctions();
  const setAdminClaim = httpsCallable(functions, 'setAdminClaim');

  try {
    await setAdminClaim({ uid, admin: isAdmin });
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw error;
  }
}
```

**Update Ventas Store:**

```typescript
// src/store/ventasStore.ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createVentaFn = httpsCallable(functions, 'createVenta');

// In ventasStore
createVenta: async (venta: VentaFormData) => {
  set({ isLoading: true, error: null });
  try {
    // Call Firebase Function for server-side validation
    const result = await createVentaFn(venta);
    const ventaId = result.data.id;

    // Refetch ventas to update local state
    await get().fetchVentas(true);

    set({ isLoading: false });
    return ventaId;
  } catch (error) {
    set({ error: error.message, isLoading: false });
    throw error;
  }
}
```

**Checklist:**
- [ ] Update `authStore` to read claims
- [ ] Update `ventasStore` to use Functions
- [ ] Update `usuariosStore` to use Functions
- [ ] Update all stores with server validation
- [ ] Add error handling for Functions errors
- [ ] Test all CRUD operations
- [ ] Document breaking changes

#### Day 6-7: Proxy JWT Validation

**Update Proxy:**

```typescript
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (server-side only)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname === '/login' || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Get token from cookie or header
  const token = request.cookies.get('__session')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT server-side
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check admin-only routes
    if (pathname.startsWith('/usuarios') && request.method === 'DELETE') {
      if (!decodedToken.admin) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // Add user info to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decodedToken.uid);
    requestHeaders.set('x-user-role', decodedToken.admin ? 'admin' : 'operador');

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};
```

**Environment Variables (Server-Side):**
```bash
# .env.local (server-side only, NOT prefixed with NEXT_PUBLIC_)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Checklist:**
- [ ] Add Firebase Admin SDK dependencies
- [ ] Add server-side environment variables
- [ ] Implement JWT verification in proxy
- [ ] Test with valid JWT
- [ ] Test with expired JWT (should redirect)
- [ ] Test with missing JWT (should redirect)
- [ ] Test admin-only routes
- [ ] Document proxy behavior

---

## Phase 2: Testing Infrastructure (BLOCKING)

**Duration:** 2-3 weeks
**Priority:** CRITICAL ❌
**Goal:** 80% code coverage

### Week 3: Unit Tests (Utilities & Services)

#### Day 1-2: Test Setup & Configuration

```bash
# Install testing dependencies (already in package.json)
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Update Vitest Config:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**'
      ],
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Checklist:**
- [ ] Update Vitest config
- [ ] Create test setup file
- [ ] Add test scripts to package.json
- [ ] Test that vitest runs: `npm test`

#### Day 3-5: Utility Tests

**File:** `tests/unit/calculations.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  calcularConsumo,
  calcularMontoRestante,
  calcularFechaVencimiento,
  formatearMoneda
} from '@/lib/utils/calculations';

describe('calcularConsumo', () => {
  it('returns 0% at start date', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-02-01');
    const now = new Date('2025-01-01');
    expect(calcularConsumo(start, end, now)).toBe(0);
  });

  it('returns 100% at end date', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-02-01');
    const now = new Date('2025-02-01');
    expect(calcularConsumo(start, end, now)).toBe(100);
  });

  it('returns 50% at midpoint', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');  // 30 days
    const now = new Date('2025-01-16');  // 15 days
    expect(calcularConsumo(start, end, now)).toBeCloseTo(50, 0);
  });

  it('handles same start and end date', () => {
    const date = new Date('2025-01-01');
    expect(calcularConsumo(date, date, date)).toBe(100);
  });
});

describe('calcularMontoRestante', () => {
  it('returns full amount at 0% consumption', () => {
    expect(calcularMontoRestante(100, 0)).toBe(100);
  });

  it('returns 0 at 100% consumption', () => {
    expect(calcularMontoRestante(100, 100)).toBe(0);
  });

  it('returns half amount at 50% consumption', () => {
    expect(calcularMontoRestante(100, 50)).toBe(50);
  });
});

describe('formatearMoneda', () => {
  it('formats USD correctly', () => {
    expect(formatearMoneda(100, 'USD')).toBe('$100.00');
  });

  it('formats PAB correctly', () => {
    expect(formatearMoneda(100, 'PAB')).toBe('B/.100.00');
  });

  it('handles decimals', () => {
    expect(formatearMoneda(99.99, 'USD')).toBe('$99.99');
  });
});
```

**Target Files:**
- `tests/unit/calculations.test.ts` ✅
- `tests/unit/whatsapp.test.ts`
- `tests/unit/cn.test.ts`

**Checklist:**
- [ ] Write tests for `calculations.ts` (10+ tests)
- [ ] Write tests for `whatsapp.ts` (8+ tests)
- [ ] Write tests for utility functions
- [ ] Run tests: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Target: 90% coverage on utilities

#### Day 6-7: Service Layer Tests

**File:** `tests/unit/services/metricsService.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateVentasMetrics } from '@/lib/services/metricsService';
import type { VentaDoc } from '@/types/ventas';

describe('calculateVentasMetrics', () => {
  const mockVentas: VentaDoc[] = [
    {
      id: '1',
      precioFinal: 100,
      estado: 'activo',
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-02-01'),
      // ... other fields
    },
    {
      id: '2',
      precioFinal: 200,
      estado: 'inactivo',
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-02-01'),
      // ... other fields
    }
  ];

  it('calculates total ingreso correctly', () => {
    const metrics = calculateVentasMetrics(mockVentas);
    expect(metrics.totalIngreso).toBe(300);
  });

  it('counts active and inactive ventas', () => {
    const metrics = calculateVentasMetrics(mockVentas);
    expect(metrics.ventasActivas).toBe(1);
    expect(metrics.ventasInactivas).toBe(1);
  });

  it('handles empty array', () => {
    const metrics = calculateVentasMetrics([]);
    expect(metrics.totalIngreso).toBe(0);
    expect(metrics.ventasActivas).toBe(0);
  });
});
```

**Checklist:**
- [ ] Test `metricsService.ts`
- [ ] Test `ventasService.ts`
- [ ] Target: 80% coverage on services
- [ ] Run: `npm run test:coverage`

### Week 4: Store Tests

#### Day 1-3: Zustand Store Tests

**File:** `tests/unit/stores/ventasStore.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVentasStore } from '@/store/ventasStore';

// Mock Firebase
vi.mock('@/lib/firebase/firestore', () => ({
  getAll: vi.fn(() => Promise.resolve([
    { id: '1', clienteNombre: 'Test', precioFinal: 100 },
    { id: '2', clienteNombre: 'Test 2', precioFinal: 200 }
  ])),
  create: vi.fn(() => Promise.resolve('venta123')),
  remove: vi.fn(() => Promise.resolve()),
  getCount: vi.fn(() => Promise.resolve(2))
}));

describe('VentasStore', () => {
  beforeEach(() => {
    // Reset store state
    useVentasStore.setState({
      ventas: [],
      isLoading: false,
      error: null,
      lastFetch: null
    });
  });

  it('fetches ventas from Firebase', async () => {
    const { result } = renderHook(() => useVentasStore());

    await act(async () => {
      await result.current.fetchVentas(true);
    });

    expect(result.current.ventas).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('caches ventas for 5 minutes', async () => {
    const { result } = renderHook(() => useVentasStore());

    // First fetch
    await act(async () => {
      await result.current.fetchVentas();
    });

    // Second fetch (should use cache)
    await act(async () => {
      await result.current.fetchVentas();
    });

    // Firebase getAll should only be called once
    const { getAll } = await import('@/lib/firebase/firestore');
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully', async () => {
    const { getAll } = await import('@/lib/firebase/firestore');
    vi.mocked(getAll).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVentasStore());

    await act(async () => {
      try {
        await result.current.fetchVentas(true);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });
});
```

**Target Stores:**
- `ventasStore.test.ts` ✅
- `usuariosStore.test.ts`
- `serviciosStore.test.ts`
- `authStore.test.ts`

**Checklist:**
- [ ] Test all 10 stores
- [ ] Mock Firebase operations
- [ ] Test loading states
- [ ] Test error handling
- [ ] Test cache behavior
- [ ] Target: 70% coverage on stores
- [ ] Run: `npm run test:coverage`

#### Day 4-5: Hook Tests

**File:** `tests/unit/hooks/useServerPagination.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServerPagination } from '@/hooks/useServerPagination';

vi.mock('@/lib/firebase/pagination', () => ({
  getPaginated: vi.fn(() => Promise.resolve({
    data: Array(10).fill(null).map((_, i) => ({ id: `${i}`, nombre: `User ${i}` })),
    lastDoc: { id: '9' },
    hasMore: true
  }))
}));

describe('useServerPagination', () => {
  it('fetches first page', async () => {
    const { result } = renderHook(() =>
      useServerPagination({
        collectionName: 'usuarios',
        filters: [],
        pageSize: 10
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(10);
    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('navigates to next page', async () => {
    const { result } = renderHook(() =>
      useServerPagination({
        collectionName: 'usuarios',
        filters: [],
        pageSize: 10
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.next();
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
  });

  it('resets on filter change', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) =>
        useServerPagination({
          collectionName: 'usuarios',
          filters,
          pageSize: 10
        }),
      { initialProps: { filters: [] } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Navigate to page 2
    await act(async () => {
      result.current.next();
    });

    // Change filters
    rerender({ filters: [{ field: 'tipo', operator: '==', value: 'cliente' }] });

    await waitFor(() => {
      expect(result.current.page).toBe(1); // Should reset to page 1
    });
  });
});
```

**Checklist:**
- [ ] Test `useServerPagination`
- [ ] Test `use-ventas-por-usuarios`
- [ ] Test `useVentasMetrics`
- [ ] Target: 75% coverage on hooks

### Week 5: Integration & E2E Tests

#### Day 1-3: Integration Tests

**File:** `tests/integration/crear-venta.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VentasForm from '@/components/ventas/VentasForm';

describe('Crear Venta Flow', () => {
  it('creates a venta with single item', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<VentasForm onSuccess={onSuccess} />);

    // Fill form
    await user.click(screen.getByLabelText('Cliente'));
    await user.click(screen.getByText('Juan Pérez'));

    await user.click(screen.getByLabelText('Método de Pago'));
    await user.click(screen.getByText('Yappy'));

    // Add item
    await user.click(screen.getByText('Agregar Cuenta/Perfil'));

    await user.click(screen.getByLabelText('Categoría'));
    await user.click(screen.getByText('Streaming'));

    // Submit
    await user.click(screen.getByText('Crear Venta'));

    // Verify
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

**Target Flows:**
- Create venta
- Edit venta
- Delete venta
- Create usuario
- Pagination flow

**Checklist:**
- [ ] Write 5-10 integration tests
- [ ] Test critical user flows
- [ ] Mock Firebase operations
- [ ] Test form validation
- [ ] Test error scenarios

#### Day 4-5: E2E Tests (Playwright)

```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install
```

**File:** `tests/e2e/auth-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('admin can login and access dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Login
    await page.fill('[name="email"]', 'admin@movietime.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('[name="email"]', 'invalid@test.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toBeVisible();
  });
});

test.describe('Ventas Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'admin@movietime.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('admin can create a venta', async ({ page }) => {
    await page.click('text=Ventas');
    await page.click('text=Crear Venta');

    // Fill form
    await page.selectOption('[name="clienteId"]', { label: 'Juan Pérez' });
    await page.click('text=Agregar Cuenta/Perfil');
    await page.selectOption('[name="categoriaId"]', { label: 'Streaming' });

    await page.click('button:has-text("Crear Venta")');

    // Verify success
    await expect(page.locator('.toast')).toContainText('Venta creada');
  });
});
```

**Checklist:**
- [ ] Write E2E tests for auth flow
- [ ] Write E2E tests for main CRUD operations
- [ ] Test with real Firebase Emulator
- [ ] Run: `npx playwright test`
- [ ] Generate HTML report: `npx playwright show-report`

### Week 5 Day 6-7: CI/CD Pipeline

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**Checklist:**
- [ ] Create GitHub Actions workflow
- [ ] Add test job (unit + integration)
- [ ] Add E2E job with Playwright
- [ ] Add coverage reporting (Codecov)
- [ ] Test CI pipeline on PR

---

## Phase 3: Performance & UX (HIGH)

**Duration:** 1-2 weeks
**Priority:** HIGH ⚠️

### Week 6: Performance Improvements

#### Day 1-2: Payment History Pagination

**File:** `src/app/(dashboard)/ventas/[id]/page.tsx`

Currently:
```typescript
// ❌ No pagination - breaks with 100+ payments
const pagos = await queryDocuments(COLLECTIONS.PAGOS_VENTA, [
  { field: 'ventaId', operator: '==', value: id }
]);
```

Updated:
```typescript
// ✅ With pagination
const { data: pagos, hasMore, next } = usePaginatedQuery({
  collectionName: COLLECTIONS.PAGOS_VENTA,
  filters: [{ field: 'ventaId', operator: '==', value: id }],
  pageSize: 20,
  orderBy: { field: 'fechaPago', direction: 'desc' }
});
```

**Checklist:**
- [ ] Add pagination to payment history (ventas detail)
- [ ] Add pagination to payment history (servicios detail)
- [ ] Test with 100+ payments
- [ ] Add "Load More" button
- [ ] Document pagination pattern

#### Day 3: Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**File:** `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(hint.originalException || hint.syntheticException);
      return null;
    }
    return event;
  }
});
```

**Checklist:**
- [ ] Install Sentry SDK
- [ ] Configure client-side tracking
- [ ] Configure server-side tracking
- [ ] Test error reporting
- [ ] Set up alerts (Slack/Email)
- [ ] Document error handling

#### Day 4: Bundle Size Optimization

```bash
# Analyze bundle size
npm run build
npm install --save-dev @next/bundle-analyzer
```

**File:** `next.config.ts`

```typescript
import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
});

const nextConfig = {
  // ... existing config
};

export default withBundleAnalyzer(withSentryConfig(nextConfig));
```

**Run Analysis:**
```bash
ANALYZE=true npm run build
```

**Checklist:**
- [ ] Install bundle analyzer
- [ ] Run analysis
- [ ] Identify large dependencies
- [ ] Add dynamic imports for large components
- [ ] Target: <500KB gzipped
- [ ] Document optimizations

#### Day 5: Firebase Performance SDK

**File:** `src/lib/firebase/config.ts`

```typescript
import { getPerformance } from 'firebase/performance';

// Initialize Performance Monitoring
if (typeof window !== 'undefined') {
  const perf = getPerformance(app);
}
```

**Custom Traces:**

```typescript
// src/lib/firebase/firestore.ts
import { trace } from 'firebase/performance';

export async function getAll<T>(collectionName: string): Promise<T[]> {
  const t = trace(perf, `firestore_getAll_${collectionName}`);
  t.start();

  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as T[];

    t.putMetric('documents_read', snapshot.size);
    t.stop();

    return data;
  } catch (error) {
    t.stop();
    throw error;
  }
}
```

**Checklist:**
- [ ] Initialize Performance SDK
- [ ] Add custom traces for Firebase operations
- [ ] Add traces for page loads
- [ ] Monitor in Firebase Console
- [ ] Set performance budgets

### Week 7: UX Improvements

#### Day 1-2: User-Friendly Error Messages

**File:** `src/lib/utils/errorMessages.ts`

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'No tienes permiso para realizar esta acción.',
  'not-found': 'El recurso solicitado no existe.',
  'already-exists': 'Este recurso ya existe.',
  'unauthenticated': 'Debes iniciar sesión para continuar.',
  'invalid-argument': 'Los datos proporcionados no son válidos.',
  'network-request-failed': 'Error de red. Por favor, verifica tu conexión.',
  'FIRESTORE_UNAVAILABLE': 'Servicio temporalmente no disponible. Intenta más tarde.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's a Firebase error
    if ('code' in error) {
      const code = (error as any).code.replace('auth/', '').replace('firestore/', '');
      return ERROR_MESSAGES[code] || error.message;
    }
    return error.message;
  }
  return 'Ha ocurrido un error inesperado.';
}
```

**Update Stores:**

```typescript
// In all stores
catch (error) {
  const errorMessage = getErrorMessage(error);
  set({ error: errorMessage, isLoading: false });
  throw error;
}
```

**Checklist:**
- [ ] Create error message mapping
- [ ] Update all stores to use mapping
- [ ] Update all components to show friendly errors
- [ ] Add error message tests
- [ ] Document error codes

#### Day 3: Retry Logic

**File:** `src/lib/utils/retry.ts`

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        ('code' in error && [
          'permission-denied',
          'unauthenticated',
          'invalid-argument'
        ].includes((error as any).code))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}
```

**Update Firebase Layer:**

```typescript
// src/lib/firebase/firestore.ts
export async function getAll<T>(collectionName: string): Promise<T[]> {
  return withRetry(async () => {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as T[];
  }, { maxRetries: 3, delay: 1000 });
}
```

**Checklist:**
- [ ] Create retry utility
- [ ] Add exponential backoff
- [ ] Update Firebase functions to use retry
- [ ] Test with network failures
- [ ] Add retry tests
- [ ] Document retry behavior

#### Day 4: Offline Detection

**File:** `src/components/layout/OfflineIndicator.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        Sin conexión a Internet. Los cambios se sincronizarán cuando vuelvas a estar en línea.
      </AlertDescription>
    </Alert>
  );
}
```

**Add to Layout:**

```typescript
// src/app/(dashboard)/layout.tsx
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
```

**Checklist:**
- [ ] Create offline indicator component
- [ ] Add to dashboard layout
- [ ] Test offline behavior
- [ ] Add visual feedback
- [ ] Document offline support

#### Day 5: Fix /configuracion Route

**File:** `src/app/(dashboard)/configuracion/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [config, setConfig] = useState({
    empresaNombre: 'MovieTime PTY',
    empresaTelefono: '+507 1234-5678',
    empresaEmail: 'info@movietime.com',
    notificacionDias: [100, 11, 8, 7, 3, 2, 1],
  });

  const handleSave = async () => {
    try {
      // TODO: Save to Firebase config collection
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>
            Configuración general del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresaNombre">Nombre de la Empresa</Label>
            <Input
              id="empresaNombre"
              value={config.empresaNombre}
              onChange={(e) => setConfig({ ...config, empresaNombre: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresaTelefono">Teléfono</Label>
            <Input
              id="empresaTelefono"
              value={config.empresaTelefono}
              onChange={(e) => setConfig({ ...config, empresaTelefono: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresaEmail">Email</Label>
            <Input
              id="empresaEmail"
              type="email"
              value={config.empresaEmail}
              onChange={(e) => setConfig({ ...config, empresaEmail: e.target.value })}
            />
          </div>

          <Button onClick={handleSave}>
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Checklist:**
- [ ] Create /configuracion page
- [ ] Add form fields
- [ ] Connect to config store
- [ ] Test saving/loading
- [ ] Add to sidebar (already exists)

---

## Phase 4: Pre-Production (MEDIUM)

**Duration:** 1 week
**Priority:** MEDIUM

### Week 8: Final Preparation

#### Day 1-2: Load Testing

```bash
# Install k6 for load testing
brew install k6  # macOS
# or download from https://k6.io/docs/getting-started/installation/
```

**File:** `tests/load/basic-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
  },
};

export default function () {
  // Test homepage
  let res = http.get('http://localhost:3000/dashboard');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'page loaded': (r) => r.body.includes('Dashboard'),
  });

  sleep(1);

  // Test usuarios page
  res = http.get('http://localhost:3000/usuarios');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

**Run Load Test:**
```bash
k6 run tests/load/basic-load.js
```

**Checklist:**
- [ ] Install k6
- [ ] Create load test scripts
- [ ] Test with 50+ concurrent users
- [ ] Monitor Firebase reads/writes
- [ ] Identify bottlenecks
- [ ] Document performance limits

#### Day 3: Security Audit

**Checklist:**
- [ ] Review all Firebase Security Rules
- [ ] Test rules with different user roles
- [ ] Check for sensitive data exposure
- [ ] Verify JWT validation in proxy
- [ ] Test Custom Claims
- [ ] Run security scanner (npm audit)
- [ ] Document security measures

**Security Audit Commands:**
```bash
# Check for vulnerabilities
npm audit

# Fix automatic vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Update dependencies
npm update
```

#### Day 4: Documentation

**Create:**
- [ ] User manual (`docs/USER_MANUAL.md`)
- [ ] Admin guide (`docs/ADMIN_GUIDE.md`)
- [ ] Deployment guide (`docs/DEPLOYMENT.md`)
- [ ] Troubleshooting guide (`docs/TROUBLESHOOTING.md`)
- [ ] API documentation (if using Functions)

**Update:**
- [ ] README.md with deployment instructions
- [ ] CLAUDE.md with latest changes
- [ ] Update all docs with production URLs

#### Day 5: Backup & Restore Testing

**File:** `scripts/backup-firestore.sh`

```bash
#!/bin/bash

# Backup Firestore to GCS
gcloud firestore export gs://movietime-backups/$(date +%Y-%m-%d)

# Verify backup
gcloud firestore operations list

echo "Backup completed: gs://movietime-backups/$(date +%Y-%m-%d)"
```

**File:** `scripts/restore-firestore.sh`

```bash
#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./restore-firestore.sh <backup-date>"
  exit 1
fi

# Restore from backup
gcloud firestore import gs://movietime-backups/$1

echo "Restore initiated from: gs://movietime-backups/$1"
echo "Check status: gcloud firestore operations list"
```

**Checklist:**
- [ ] Create backup scripts
- [ ] Enable daily Firestore backups
- [ ] Test backup creation
- [ ] Test restore process
- [ ] Document backup/restore procedures
- [ ] Set up backup retention policy (30 days)

#### Day 6-7: Pre-Production Checklist

**Environment Setup:**
- [ ] Create production Firebase project
- [ ] Set production environment variables
- [ ] Deploy Security Rules to production
- [ ] Deploy Indexes to production
- [ ] Deploy Functions to production
- [ ] Configure custom domain
- [ ] Configure SSL certificate

**Monitoring Setup:**
- [ ] Enable Sentry in production
- [ ] Enable Firebase Analytics
- [ ] Enable Firebase Performance
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure alert thresholds
- [ ] Set up Slack/Email notifications

**Testing:**
- [ ] Run full test suite
- [ ] Run E2E tests on staging
- [ ] Test all user flows manually
- [ ] Test with real Firebase data
- [ ] Test error scenarios
- [ ] Verify monitoring alerts work

**Documentation:**
- [ ] Deployment runbook
- [ ] Rollback procedures
- [ ] Incident response plan
- [ ] On-call rotation (if applicable)

---

## Success Criteria

### Phase 1: Security (BLOCKING)
- ✅ Firebase Security Rules deployed and tested
- ✅ Custom Claims implemented for roles
- ✅ Server-side validation via Functions
- ✅ Proxy JWT verification working
- ✅ No security vulnerabilities (npm audit)

### Phase 2: Testing (BLOCKING)
- ✅ 80% code coverage on utilities
- ✅ 70% code coverage on stores
- ✅ Integration tests for critical flows
- ✅ E2E tests for main user flows
- ✅ CI/CD pipeline passing

### Phase 3: Performance & UX (HIGH)
- ✅ Payment history paginated
- ✅ Error tracking (Sentry) configured
- ✅ User-friendly error messages
- ✅ Retry logic implemented
- ✅ Offline detection working
- ✅ Bundle size <500KB gzipped
- ✅ Lighthouse score >90

### Phase 4: Pre-Production (MEDIUM)
- ✅ Load testing passed (50+ users)
- ✅ Security audit completed
- ✅ Documentation complete
- ✅ Backup/restore tested
- ✅ Production environment configured
- ✅ Monitoring enabled

---

## Risk Mitigation

### High-Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Security Rules break existing queries | HIGH | Test with emulator first, gradual rollout |
| Custom Claims require user re-login | MEDIUM | Notify users, provide clear instructions |
| Functions increase costs | MEDIUM | Monitor usage, optimize hot paths |
| Test coverage too low | HIGH | Prioritize critical paths, automate |
| Load testing reveals bottlenecks | MEDIUM | Optimize before launch, scale Firebase plan |

### Contingency Plans

1. **Security Rules Failure:**
   - Have rollback script ready
   - Test with emulator extensively
   - Deploy to staging first

2. **Functions Cost Overrun:**
   - Monitor costs daily
   - Set billing alerts at 80%
   - Optimize frequently-called functions

3. **Test Coverage Not Met:**
   - Focus on critical paths (auth, CRUD)
   - Defer non-critical tests to post-launch
   - Add tests incrementally

---

## Timeline Summary

| Phase | Duration | Blocking? | Focus |
|-------|----------|-----------|-------|
| **Phase 1: Security** | 1-2 weeks | YES 🚨 | Security Rules, Custom Claims, Functions |
| **Phase 2: Testing** | 2-3 weeks | YES ❌ | Unit tests, Integration tests, E2E tests |
| **Phase 3: Performance** | 1-2 weeks | NO ⚠️ | Pagination, Error tracking, UX improvements |
| **Phase 4: Pre-Production** | 1 week | NO | Load testing, Documentation, Deployment prep |
| **Total** | **5-8 weeks** | | |

---

## Post-Launch Monitoring

### Week 1 Post-Launch
- [ ] Monitor error rates hourly
- [ ] Check Firebase usage (reads/writes)
- [ ] Review Sentry errors
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately

### Week 2-4 Post-Launch
- [ ] Daily error monitoring
- [ ] Weekly performance review
- [ ] User feedback analysis
- [ ] Optimize based on metrics
- [ ] Plan next features

### Ongoing
- [ ] Monthly security review
- [ ] Quarterly dependency updates
- [ ] Continuous test coverage improvement
- [ ] Performance optimization
- [ ] Documentation updates

---

## Resources & Contact

### Key Documentation
- Architecture: `docs/ARCHITECTURE.md`
- Evaluation: `docs/EVALUATION_SUMMARY.md`
- C4 Diagrams: `docs/C4_DIAGRAMS.md`
- Developer Guide: `CLAUDE.md`
- Pagination Pattern: `docs/PAGINATION_AND_CACHE_PATTERN.md`

### External Resources
- Firebase Console: https://console.firebase.google.com
- Vercel Dashboard: https://vercel.com/dashboard
- Sentry: https://sentry.io
- GitHub: [Your repo URL]

### Support Contacts
- [Add your team contacts here]

---

**Document Version:** 1.0
**Created:** February 7, 2026
**Owner:** [Your Name]
**Next Review:** End of Week 2 (after security implementation)
