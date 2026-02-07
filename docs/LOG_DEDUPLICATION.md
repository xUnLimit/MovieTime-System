# Sistema de Deduplicación de Logs

## Problema Resuelto

React 18+ ejecuta los efectos (`useEffect`) **dos veces** en modo desarrollo cuando está activado Strict Mode. Esto es intencional para ayudar a detectar efectos secundarios no deseados. Sin embargo, causa que los logs de Firebase y cache se muestren duplicados en la consola.

**Antes:**
```
[Firestore] query (usuarios) → 10 docs · 43ms
[Firestore] query (usuarios) → 10 docs · 45ms  ← Duplicado
[Cache] Hit (ventas) → sin lectura a Firestore
[Cache] Hit (ventas) → sin lectura a Firestore  ← Duplicado
```

**Después:**
```
[Firestore] query (usuarios) → 10 docs · 43ms
[Cache] Hit (ventas) → sin lectura a Firestore
```

## Solución Implementada

### Archivo: `src/lib/utils/devLogger.ts`

Sistema de deduplicación con las siguientes características:

#### 1. **Ventana de Tiempo**
- **500ms** de deduplicación
- Suficiente para capturar las dos ejecuciones de React Strict Mode
- Permite logs legítimos posteriores (recargas, navegación, etc.)

#### 2. **Normalización de Mensajes**
Los logs con valores variables (duración, edad de cache) se normalizan para ser tratados como iguales:

```typescript
function getLogKey(message: string): string {
  return message
    .replace(/\s*·\s*\d+ms$/i, '')      // Remueve "· 45ms"
    .replace(/\s*·\s*age\s+\d+s$/i, '') // Remueve "· age 3s"
    .trim();
}
```

**Ejemplo:**
- `"[Firestore] query (usuarios) → 10 docs · 43ms"`
- `"[Firestore] query (usuarios) → 10 docs · 45ms"`
- **Ambos se normalizan a:** `"[Firestore] query (usuarios) → 10 docs"`

#### 3. **Tracking con Map**
```typescript
const recentLogs = new Map<string, number>();
```

- **Key:** Mensaje normalizado
- **Value:** Timestamp del primer log
- Solo se muestra el **primer log** dentro de la ventana de 500ms
- Los logs se limpian automáticamente después de 2 segundos

## Funciones Exportadas

### `logFirestoreOp()`
Logs de operaciones Firebase (getAll, query, paginated, count, getById)

```typescript
logFirestoreOp('query', 'usuarios', '10 docs', 43);
// → [Firestore] query (usuarios) → 10 docs · 43ms
```

### `logCacheHit()`
Logs cuando un store evita una lectura por caché

```typescript
logCacheHit('ventas');
// → [Cache] Hit (ventas) → sin lectura a Firestore
```

### `logVentasCacheHit()`
Logs específicos para el cache de ventas por usuarios

```typescript
logVentasCacheHit(5, 120);
// → [VentasCache] HIT · 5 IDs · age 120s
```

## Archivos Modificados

### Core Logging
- ✅ `src/lib/utils/devLogger.ts` - Sistema de deduplicación

### Firebase Layer
- ✅ `src/lib/firebase/firestore.ts` - `getAll()`, `getById()`, `queryDocuments()`, `getCount()`, `logCacheHit()`
- ✅ `src/lib/firebase/pagination.ts` - `getPaginated()`

### Hooks
- ✅ `src/hooks/use-ventas-por-usuarios.ts` - Cache de ventas con deduplicación

### Stores (usan `logCacheHit()`)
- ✅ Todos los stores en `src/store/` que implementan cache de 5 minutos

## Configuración

### Variables de Control

```typescript
const LOG_DEBOUNCE_MS = 500; // Ventana de deduplicación (ms)
const CLEANUP_DELAY = 2000;  // Tiempo para limpiar logs antiguos (ms)
```

### Ajustes Opcionales

**Si ves duplicados ocasionales:**
- Aumentar `LOG_DEBOUNCE_MS` a 1000ms

**Si los logs no aparecen cuando deberían:**
- Reducir `LOG_DEBOUNCE_MS` a 300ms
- Verificar que la operación no esté siendo cacheada

## Comportamiento en Producción

```typescript
if (process.env.NODE_ENV !== 'development') return;
```

- **Desarrollo:** Todos los logs activos con deduplicación
- **Producción:** Ningún log (cero overhead)

## Testing

### Verificar Deduplicación

1. Ir a cualquier página con tabla (ej: `/usuarios`)
2. Abrir DevTools Console
3. Recargar la página (F5)
4. **Esperado:** Ver cada operación **una sola vez**

### Verificar Cache

1. Ir a `/usuarios`
2. Esperar 5 segundos (dentro del TTL de cache)
3. Cambiar entre tabs (Todos / Clientes / Revendedores)
4. **Esperado:** Ver logs de cache HIT sin nuevas queries

## Beneficios

✅ **Consola limpia** - Sin logs duplicados confusos
✅ **Debugging fácil** - Ver claramente cada operación única
✅ **Cero impacto en producción** - Solo activo en desarrollo
✅ **Compatible con Strict Mode** - Diseñado específicamente para React 18+
✅ **Flexible** - Fácil de ajustar parámetros según necesidad

## Notas Técnicas

### ¿Por qué no desactivar Strict Mode?

Strict Mode es **recomendado** por el equipo de React porque:
- Detecta efectos secundarios no deseados
- Prepara tu código para React 19+ (Concurrent Features)
- Simula montaje/desmontaje rápido (como navegación real)

### ¿Por qué 500ms?

React Strict Mode ejecuta los efectos:
1. **Primera ejecución** - Tiempo T
2. **Cleanup** - Tiempo T + ~10ms
3. **Segunda ejecución** - Tiempo T + ~20-50ms

500ms captura ambas ejecuciones con margen de seguridad, pero permite logs legítimos después (como al navegar a otra página).

## Troubleshooting

**Problema:** Veo logs duplicados en producción
**Solución:** Verificar que `NODE_ENV` esté correctamente configurado

**Problema:** No veo ningún log
**Solución:** Verificar que estés en modo desarrollo (`npm run dev`)

**Problema:** Logs aparecen con delay
**Solución:** Esto es normal; el primer log dentro de 500ms se muestra, los demás se filtran

---

**Última actualización:** Febrero 2026
**Versión del sistema:** 2.1.0
