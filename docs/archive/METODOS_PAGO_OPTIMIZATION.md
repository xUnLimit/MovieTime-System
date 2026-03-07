# Optimización de Métodos de Pago - Queries Filtradas

## Problema Anterior

Cuando el usuario creaba o editaba un usuario, el sistema hacía **2 llamadas duplicadas** a `getAll(metodosPago)`, trayendo **todos** los métodos de pago (3 documentos en total), aunque solo se necesitaban los métodos asociados a usuarios.

```
[Firestore] getAll (metodosPago) → 3 docs · 184ms
[Firestore] getAll (metodosPago) → 3 docs · 203ms
```

**Total:** 6 lecturas (2 llamadas × 3 docs)

## Solución Implementada

Se implementó un patrón de **query con filtros** usando `queryDocuments()` en lugar de `getAll()`.

### 1. Store: `metodosPagoStore.ts`

Se agregaron 2 nuevos métodos de fetch con filtros:

```typescript
fetchMetodosPagoUsuarios: async () => {
  try {
    const metodos = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
      { field: 'asociadoA', operator: '==', value: 'usuario' },
      { field: 'activo', operator: '==', value: true }
    ]);
    return metodos;
  } catch (error) {
    console.error('Error fetching metodos pago usuarios:', error);
    return [];
  }
},

fetchMetodosPagoServicios: async () => {
  try {
    const metodos = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
      { field: 'asociadoA', operator: '==', value: 'servicio' },
      { field: 'activo', operator: '==', value: true }
    ]);
    return metodos;
  } catch (error) {
    console.error('Error fetching metodos pago servicios:', error);
    return [];
  }
},
```

### 2. Página Crear Usuario: `usuarios/crear/page.tsx`

Cambió de usar `getMetodosPagoUsuarios()` (selector con getAll) a usar `fetchMetodosPagoUsuarios()` (query filtrada):

**Antes:**
```typescript
const metodos = useMetodosPagoStore().metodosPago; // getAll() en mount
const metodosPagoUsuarios = metodos.filter(m => m.asociadoA === 'usuario' && m.activo);
```

**Después:**
```typescript
const { fetchMetodosPagoUsuarios } = useMetodosPagoStore();
const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadMetodos = async () => {
    setLoading(true);
    const metodos = await fetchMetodosPagoUsuarios(); // Query filtrada
    setMetodosPago(metodos);
    setLoading(false);
  };
  loadMetodos();
}, [fetchMetodosPagoUsuarios]);
```

### 3. Página Editar Usuario: `usuarios/editar/[id]/page.tsx`

Cambió de `getAll()` + filtro en memoria a query filtrada en Firebase:

**Antes:**
```typescript
const metodosData = await getAll<MetodoPago>(COLLECTIONS.METODOS_PAGO);
const metodosPagoUsuarios = metodosData.filter(m => m.asociadoA === 'usuario' && m.activo);
```

**Después:**
```typescript
const { fetchMetodosPagoUsuarios } = useMetodosPagoStore();

const [usuarioData, metodosData] = await Promise.all([
  getById<Usuario>(COLLECTIONS.USUARIOS, id),
  fetchMetodosPagoUsuarios() // Query filtrada
]);
```

## Resultados Esperados

### Antes de la Optimización
```
[Firestore] getAll (metodosPago) → 3 docs · 184ms
[Firestore] getAll (metodosPago) → 3 docs · 203ms
```
**Total:** 6 lecturas

### Después de la Optimización

Si hay 1 método de pago asociado a usuarios:
```
[Firestore] query (metodosPago where asociadoA == usuario, activo == true) → 1 doc · ~150ms
```
**Total:** 1 lectura

**Reducción:** 83% menos lecturas (6 → 1)

Si hay 2 métodos de pago asociados a usuarios:
```
[Firestore] query (metodosPago where asociadoA == usuario, activo == true) → 2 docs · ~150ms
```
**Total:** 2 lecturas

**Reducción:** 67% menos lecturas (6 → 2)

## Verificación

### Pasos para Probar

1. Abre la consola del navegador (F12)
2. Navega a `/usuarios/crear` o haz clic en "Editar" en un usuario existente
3. Verifica que **NO** aparezca:
   ```
   [Firestore] getAll (metodosPago) → 3 docs
   ```

4. Verifica que **SÍ** aparezca:
   ```
   [Firestore] query (metodosPago where asociadoA == usuario, activo == true) → N docs
   ```

### Interpretación de Logs

| Log | Significado | Estado |
|-----|-------------|--------|
| `[Firestore] getAll (metodosPago) → 3 docs` | ❌ Trae todos los métodos de pago | **Problema** |
| `[Firestore] query (metodosPago where asociadoA == usuario...) → 1 doc` | ✅ Query filtrada, solo usuarios | **Optimizado** |

## Archivos Modificados

1. ✅ `src/store/metodosPagoStore.ts`
   - Agregado `fetchMetodosPagoUsuarios()`
   - Agregado `fetchMetodosPagoServicios()`

2. ✅ `src/app/(dashboard)/usuarios/crear/page.tsx`
   - Cambió de selector a fetch filtrado
   - Agregó useState + useEffect para carga

3. ✅ `src/app/(dashboard)/usuarios/editar/[id]/page.tsx`
   - Cambió de `getAll()` a `fetchMetodosPagoUsuarios()`
   - Removió filtrado en memoria

## Próximos Pasos Recomendados

Esta misma optimización se puede aplicar a:

1. **Página Crear Venta** (`/ventas/crear`)
   - Actualmente podría estar usando `getAll()` para métodos de pago
   - Aplicar mismo patrón con `fetchMetodosPagoServicios()` si es necesario

2. **Página Crear Servicio** (`/servicios/crear`)
   - Verificar si usa métodos de pago de servicios
   - Optimizar con `fetchMetodosPagoServicios()` si aplica

## Notas Técnicas

- **Firebase Queries con Filtros:** `queryDocuments()` envía el filtro a Firestore, solo trae los documentos que coinciden
- **Filtrado en Memoria:** `getAll()` + `filter()` trae TODOS los documentos primero, luego filtra localmente
- **Costos:** En Firestore, pagas por documentos leídos. Query filtrada = menos documentos = menos costo
- **Spark Plan:** Plan gratuito tiene límite de 50k lecturas/día. Esta optimización ayuda a no excederlo

---

**Fecha de Implementación:** Febrero 6, 2026
**Impacto:** Reducción de ~67-83% en lecturas de Firebase para páginas de usuarios
