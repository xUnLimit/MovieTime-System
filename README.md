# MovieTime PTY - Sistema de Gestión

Sistema de gestión para negocio de venta de servicios de streaming con control financiero, notificaciones automáticas y gestión de clientes/revendedores.

## 🚀 Estado Actual: IMPLEMENTACIÓN COMPLETA

### ✅ Lo que está implementado

#### 1. Configuración del Proyecto
- ✅ Next.js 15 con App Router
- ✅ TypeScript configurado
- ✅ Tailwind CSS
- ✅ shadcn/ui components instalados
- ✅ Zustand para manejo de estado
- ✅ date-fns para manejo de fechas
- ✅ Recharts para gráficos
- ✅ Sonner para notificaciones toast
- ✅ React Hook Form + Zod para validación

#### 2. Types TypeScript (`src/types/index.ts`)
- ✅ User, Cliente, Revendedor
- ✅ Servicio, Categoria
- ✅ Venta, MetodoPago
- ✅ Gasto, Notificacion
- ✅ TemplateMensaje, ActivityLog
- ✅ Configuracion
- ✅ Dashboard Metrics types
- ✅ Form types completos

#### 3. Zustand Stores (9 stores)
- ✅ `categoriasStore.ts` - Gestión de categorías
- ✅ `metodosPagoStore.ts` - Métodos de pago
- ✅ `serviciosStore.ts` - Servicios de streaming
- ✅ `clientesStore.ts` - Gestión de clientes
- ✅ `revendedoresStore.ts` - Gestión de revendedores
- ✅ `ventasStore.ts` - Ventas con lógica de ciclos
- ✅ `notificacionesStore.ts` - Notificaciones
- ✅ `templatesMensajesStore.ts` - Templates WhatsApp
- ✅ `activityLogStore.ts` - Log de actividades

#### 4. Módulos Completos (6 módulos principales)
- ✅ **Servicios** - CRUD completo con métricas y filtros
- ✅ **Usuarios** - Clientes y Revendedores con tabs
- ✅ **Ventas** - Módulo más complejo con múltiples acciones
- ✅ **Notificaciones** - Sistema de notificaciones con filtros
- ✅ **Editor de Mensajes** - Templates con preview
- ✅ **Log de Actividad** - Timeline de actividades

#### 5. Componentes (34 componentes totales)
**Servicios (4):**
- ✅ ServiciosMetrics.tsx
- ✅ ServiciosFilters.tsx
- ✅ ServiciosTable.tsx
- ✅ ServicioDialog.tsx

**Usuarios (4):**
- ✅ ClientesTable.tsx (con WhatsApp)
- ✅ RevendedoresTable.tsx
- ✅ ClienteDialog.tsx
- ✅ RevendedorDialog.tsx

**Ventas (4):**
- ✅ VentasMetrics.tsx
- ✅ VentasFilters.tsx
- ✅ VentasTable.tsx (con progress bars)
- ✅ VentaDialog.tsx (form complejo)

**Notificaciones (2):**
- ✅ NotificacionesList.tsx
- ✅ NotificacionesFilters.tsx

**Editor de Mensajes (3):**
- ✅ TemplatesList.tsx
- ✅ MessagePreview.tsx
- ✅ TemplateDialog.tsx

**Log de Actividad (2):**
- ✅ LogTimeline.tsx
- ✅ LogFilters.tsx

**Shared Components:**
- ✅ DataTable (reusable)
- ✅ ConfirmDialog
- ✅ MetricCard
- ✅ LoadingSpinner
- ✅ EmptyState

#### 6. Páginas Implementadas
- ✅ `/servicios`
- ✅ `/usuarios` (con tabs)
- ✅ `/ventas`
- ✅ `/notificaciones`
- ✅ `/editor-mensajes`
- ✅ `/log-actividad`
- ✅ `/categorias`
- ✅ `/metodos-pago`

## 📁 Estructura del Proyecto

```
movietime-pty/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/page.tsx
│   │   ├── layout.tsx (root con Toaster)
│   │   ├── page.tsx (redirección)
│   │   └── globals.css
│   │
│   ├── components/
│   │   └── ui/ (shadcn components)
│   │
│   ├── lib/
│   │   ├── mock-data/index.ts
│   │   ├── utils/
│   │   │   ├── whatsapp.ts
│   │   │   ├── calculations.ts
│   │   │   └── utils.ts (shadcn)
│   │   └── constants/index.ts
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── categoriasStore.ts
│   │   ├── metodosPagoStore.ts
│   │   ├── serviciosStore.ts
│   │   ├── usuariosStore.ts
│   │   ├── ventasStore.ts
│   │   ├── notificacionesStore.ts
│   │   ├── templatesStore.ts
│   │   ├── activityLogStore.ts
│   │   └── configStore.ts
│   │
│   ├── types/index.ts
│   └── middleware.ts
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🔧 Instalación y Ejecución

### Instalar dependencias

```bash
cd movietime-pty
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Credenciales de prueba

- **Email:** `admin@movietime.com`
- **Contraseña:** `123456` (mínimo 6 caracteres)

## 📋 Próximos Pasos

### FASE 2: Backend e Integración API ⏳
- [ ] Implementar API endpoints (9 endpoints principales)
- [ ] Integrar stores con API real
- [ ] Implementar autenticación real
- [ ] Agregar validación del lado del servidor
- [ ] Configurar base de datos

### FASE 3: WhatsApp y Notificaciones ⏳
- [ ] Integrar WhatsApp Business API
- [ ] Implementar envío de mensajes
- [ ] Configurar cron jobs para notificaciones
- [ ] Sistema de email como fallback

### FASE 4: Características Avanzadas ⏳
- [ ] Reportes y exportación de datos
- [ ] Dashboard con gráficos interactivos
- [ ] Sistema de permisos granular
- [ ] Auditoría y logs persistentes
- [ ] Búsqueda avanzada y analytics

### FASE 5: Testing y Deploy 🎯
- [ ] Tests unitarios (stores, utils)
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] CI/CD pipeline
- [ ] Deploy a producción
- [ ] Monitoring y logging

## 🎨 Stack Tecnológico

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Estado Global:** Zustand
- **Formularios:** React Hook Form + Zod
- **Fechas:** date-fns
- **Gráficos:** Recharts
- **Notificaciones:** Sonner

## 📝 Notas Importantes

### Enfoque UI-First
El proyecto está diseñado con el enfoque "UI primero":
1. Toda la interfaz funciona con datos mockeados
2. Zustand maneja el estado global
3. Los stores simulan delay de red para UX realista
4. La estructura está preparada para migración fácil a Firebase

### Datos Mock
- Todos los datos están en `src/lib/mock-data/index.ts`
- Los stores cargan estos datos al iniciar
- Las operaciones CRUD funcionan solo en memoria
- Los cambios se pierden al recargar (excepto auth y templates por persist)

### Autenticación Mock
- Login acepta cualquier email con contraseña de 6+ caracteres
- El email determina el rol: `admin@...` = admin, otros = operador
- El estado se persiste en localStorage

## 🔑 Características Clave

### Gestión de Ventas
- Ciclos de pago: mensual, trimestral, anual
- Cálculo automático de fechas de vencimiento
- Barra de progreso de consumo
- Estados: activa, suspendida, inactiva, vencida
- Renovación automática

### Notificaciones Inteligentes
- Basadas en días de vencimiento [100, 11, 8, 7, 3, 2, 1]
- Prioridades: baja, media, alta, crítica
- Contador en header
- Sistema de lectura/no lectura

### WhatsApp Integration
- Templates personalizables
- Placeholders dinámicos
- Generación automática de links wa.me
- Saludo según hora del día

### Activity Log
- Registro de todas las acciones CRUD
- Filtrable por entidad y acción
- Timestamp automático
- Solo lectura (inmutable)

## 🐛 Troubleshooting

### Error: Module not found
```bash
npm install
```

### Error de tipos TypeScript
```bash
npm run build
```

### Puerto 3000 ocupado
```bash
# Cambiar puerto en package.json o
PORT=3001 npm run dev
```

## 📞 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.

---

**Versión:** 2.0.0 - Implementación Frontend Completa
**Última actualización:** 28 de enero de 2026

---

## 📚 Documentación Adicional

### Documentación General
- **IMPLEMENTATION_SUMMARY.md** - Resumen detallado de la implementación
- **DEVELOPER_GUIDE.md** - Guía de referencia rápida para desarrolladores
- **README.md** - Este archivo (guía general del proyecto)

### Optimización y Monitoreo
- **FIREBASE_READS_MONITORING.md** - 🔥 **Guía completa de monitoreo de lecturas Firebase**
- **PAGINATION_AND_CACHE_PATTERN.md** - Patrón de paginación y cache (reduce 90-96% lecturas)
- **firebase-monitor.js** - Script para consola del navegador (contador global de lecturas)

### 🔍 Cómo Verificar las Optimizaciones

El proyecto incluye un sistema completo de logging para monitorear las lecturas de Firebase en tiempo real:

**Opción 1: Logs Automáticos en Consola**
1. Abre la consola del navegador (F12)
2. Filtra por "Firestore" para ver solo operaciones relevantes
3. Cada operación se registra con colores:
   - 🟢 Verde: `getAll`, `getById`, `query`
   - 🔵 Azul: `paginated` (paginación optimizada)
   - 🟣 Morado: `count` (0 lecturas, gratis en Spark)
   - 🟠 Naranja: Cache hits (0 lecturas)

**Opción 2: Monitor Avanzado**
1. Copia el contenido de `docs/firebase-monitor.js`
2. Pégalo en la consola del navegador
3. Navega por la app
4. Ejecuta `firestoreMonitor.report()` para ver el resumen completo

**Ejemplo de output esperado (módulo Usuarios optimizado):**
```
[Firestore] paginated (usuarios) → 10 docs · 85ms
[Firestore] count (usuarios) → 50 · 25ms
[Firestore] count (usuarios where tipo == cliente) → 35 · 20ms
[Firestore] count (usuarios where tipo == revendedor) → 15 · 18ms
```
**Total: 11 lecturas** (vs ~100+ sin optimización)

Ver `docs/FIREBASE_READS_MONITORING.md` para guía completa con escenarios de prueba.
