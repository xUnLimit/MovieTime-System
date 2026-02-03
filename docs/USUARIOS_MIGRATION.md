# Migración de Usuarios: Colección Unificada

## Resumen

Se refactorizó el sistema de usuarios para usar **una sola colección `usuarios`** en Firestore en lugar de dos colecciones separadas (`clientes` y `revendedores`).

## Cambios Principales

### 1. Tipo Usuario Unificado

**Antes**: Dos tipos separados
```typescript
interface Cliente { ... }
interface Revendedor { ... }
```

**Ahora**: Un solo tipo con discriminador
```typescript
interface Usuario {
  id: string;
  tipo: 'cliente' | 'revendedor';  // Campo discriminador
  // ... campos comunes
  serviciosActivos?: number;        // Solo clientes
  suscripcionesTotales?: number;    // Solo revendedores
}
```

### 2. Colección Firestore

**Antes**: Dos colecciones
- `clientes` (COLLECTIONS.CLIENTES)
- `revendedores` (COLLECTIONS.REVENDEDORES)

**Ahora**: Una sola colección
- `usuarios` (COLLECTIONS.USUARIOS)
- Filtrado por campo `tipo`:
  - `tipo === 'cliente'`
  - `tipo === 'revendedor'`

### 3. Store Unificado

**Archivo principal**: `src/store/usuariosStore.ts`

```typescript
const { usuarios, fetchUsuarios, createUsuario, updateUsuario, deleteUsuario } = useUsuariosStore();

// Helpers para filtrar por tipo
const clientes = useUsuariosStore().getClientes();
const revendedores = useUsuariosStore().getRevendedores();
```

**Wrappers de compatibilidad** (deprecated):
- `src/store/clientesStore.ts` - Wrapper que usa usuariosStore
- `src/store/revendedoresStore.ts` - Wrapper que usa usuariosStore

### 4. Cambio de Tipo Simplificado

**Antes**: Crear en colección nueva + eliminar de colección vieja
```typescript
await createRevendedor(data);
await deleteCliente(id);
```

**Ahora**: Solo actualizar el campo `tipo`
```typescript
await updateUsuario(id, { tipo: 'revendedor' });
```

## Ventajas

✅ **Simplicidad**: Un solo store, una sola colección  
✅ **Menos código**: Eliminada duplicación de lógica  
✅ **Cambio de tipo fácil**: Solo actualizar un campo  
✅ **Queries unificadas**: Buscar todos los usuarios con una sola query  
✅ **Ordenamiento conjunto**: Ordenar clientes y revendedores juntos  
✅ **Métricas combinadas**: Sin necesidad de juntar arrays

## Compatibilidad Hacia Atrás

Los stores `clientesStore` y `revendedoresStore` siguen existiendo como wrappers (marcados como deprecated) para compatibilidad temporal:

```typescript
// ✅ Recomendado (nuevo)
import { useUsuariosStore } from '@/store/usuariosStore';
const { usuarios, createUsuario } = useUsuariosStore();

// ⚠️ Deprecated (funciona pero no recomendado)
import { useClientesStore } from '@/store/clientesStore';
const { clientes, createCliente } = useClientesStore();
```

## Componentes Actualizados

- ✅ `UsuarioForm` - Simplificado, usa usuariosStore
- ✅ `UsuarioDetails` - Acepta Usuario unificado
- ✅ `UsuariosMetrics` - Recibe array de usuarios
- ✅ `TodosUsuariosTable` - Simplificado con un solo handler
- ✅ `src/app/(dashboard)/usuarios/page.tsx` - Usa usuariosStore

## Migración de Datos (Manual)

Si ya tienes datos en `clientes` y `revendedores` en Firestore, debes migrarlos a `usuarios`:

### Opción A: Script de migración (Firestore Console)

1. Exportar documentos de `clientes` y `revendedores`
2. Agregar campo `tipo: 'cliente'` o `tipo: 'revendedor'` a cada documento
3. Importar a la colección `usuarios`

### Opción B: Código de migración (temporal)

```typescript
import { getAll, create, COLLECTIONS } from '@/lib/firebase/firestore';

async function migrateUsers() {
  // Migrar clientes
  const clientes = await getAll(COLLECTIONS.CLIENTES);
  for (const cliente of clientes) {
    await create(COLLECTIONS.USUARIOS, { ...cliente, tipo: 'cliente' });
  }
  
  // Migrar revendedores
  const revendedores = await getAll(COLLECTIONS.REVENDEDORES);
  for (const revendedor of revendedores) {
    await create(COLLECTIONS.USUARIOS, { ...revendedor, tipo: 'revendedor' });
  }
  
  console.log('Migración completada');
}
```

## Próximos Pasos (Opcional)

1. ✅ **Completado**: Refactorización del código
2. ⏳ **Pendiente**: Migrar datos existentes en Firestore (si aplica)
3. ⏳ **Pendiente**: Eliminar colecciones `clientes` y `revendedores` vacías
4. ⏳ **Pendiente**: Remover stores deprecated (`clientesStore`, `revendedoresStore`)

## Notas Técnicas

- El campo `comisionPorcentaje` fue removido (no se usaba)
- Los campos específicos por tipo son opcionales (`serviciosActivos?`, `suscripcionesTotales?`)
- La UI sigue mostrando pestañas separadas (Clientes/Revendedores) filtrando por `tipo`
- Los aliases `Cliente` y `Revendedor` existen como tipos deprecated para compatibilidad
