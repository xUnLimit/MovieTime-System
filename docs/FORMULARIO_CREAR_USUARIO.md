# Documentación: Formulario de Crear Usuario

Este documento explica cómo está implementado el formulario de creación de usuarios (clientes/revendedores) para que pueda replicarse exactamente en otros módulos del sistema.

## Ubicación de Archivos

```
src/
├── components/usuarios/
│   └── UsuarioForm.tsx          # Componente principal del formulario
└── app/(dashboard)/usuarios/
    └── crear/
        └── page.tsx              # Página que usa el formulario
```

## Estructura del Formulario

### 1. Sistema de Tabs

El formulario usa **tabs horizontales** con las siguientes características:

```tsx
<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
  <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
    <TabsTrigger
      value="personal"
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
    >
      Información Personal
    </TabsTrigger>
    <TabsTrigger
      value="pago"
      className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm ${
        !isPersonalTabComplete ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      Información de Pago
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**Características importantes:**
- `inline-flex` en TabsList: Para que la línea inferior solo llegue hasta donde termina el texto de los tabs
- `border-b border-border`: Línea inferior que delimita los tabs
- `cursor-not-allowed opacity-50`: Para tabs bloqueados

### 2. Validación entre Tabs

El sistema previene que el usuario avance sin completar los campos:

```tsx
const [isPersonalTabComplete, setIsPersonalTabComplete] = useState(false);

const handleTabChange = async (value: string) => {
  if (value === 'pago' && !isPersonalTabComplete) {
    const isValid = await trigger(['nombre', 'apellido', 'tipoUsuario', 'telefono']);
    if (isValid) {
      setIsPersonalTabComplete(true);
      setActiveTab(value);
    }
  } else {
    setActiveTab(value);
  }
};

const handleNext = async () => {
  const isValid = await trigger(['nombre', 'apellido', 'tipoUsuario', 'telefono']);
  if (isValid) {
    setIsPersonalTabComplete(true);
    setActiveTab('pago');
  }
};
```

### 3. Layout de Campos

Los campos están organizados en un **grid de 2 columnas** en pantallas medianas y grandes:

```tsx
<TabsContent value="personal" className="space-y-13">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Campos aquí */}
  </div>
</TabsContent>
```

**Distribución de campos:**

| Fila 1        | Columna 1     | Columna 2   |
|---------------|---------------|-------------|
|               | Nombre        | Apellido    |
| Fila 2        | Tipo Usuario  | Teléfono    |

### 4. Tipos de Campos

#### A. Campos de Texto con Capitalización Automática

```tsx
<Input
  id="nombre"
  {...register('nombre')}
  placeholder="Juan"
  onChange={(e) => {
    const value = e.target.value;
    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
    setValue('nombre', capitalized);
  }}
/>
```

**Se aplica a:** Nombre, Apellido

#### B. Campo de Teléfono con Validación de Caracteres

```tsx
<Input
  id="telefono"
  {...register('telefono')}
  placeholder="+507 6000-0000"
  onKeyDown={(e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    const allowedChars = /[0-9+\-() ]/;

    if (allowedKeys.includes(e.key) || allowedChars.test(e.key)) {
      return;
    }

    e.preventDefault();
  }}
/>
```

**Permite solo:** Números, +, -, (, ), espacios, y teclas de navegación

#### C. DropdownMenu (NO Select)

```tsx
<div className="space-y-2 md:col-span-1">
  <Label htmlFor="tipoUsuario">Tipo de Usuario</Label>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="w-full justify-between"
        type="button"
      >
        {tipoUsuarioValue === 'cliente' ? 'Cliente' : tipoUsuarioValue === 'revendedor' ? 'Revendedor' : 'Seleccionar...'}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
      <DropdownMenuItem onClick={() => setValue('tipoUsuario', 'cliente')}>
        Cliente
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setValue('tipoUsuario', 'revendedor')}>
        Revendedor
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**IMPORTANTE:**
- Usar `DropdownMenu`, NO `Select`
- `align="start"`: Alinea el menú al inicio del botón
- `w-[var(--radix-dropdown-menu-trigger-width)]`: El menú tiene el mismo ancho que el botón
- `md:col-span-1`: Ocupa solo 1 columna (mitad del ancho)

### 5. Limpieza Automática de Errores

Los errores se limpian automáticamente cuando el usuario corrige el campo:

```tsx
const nombreValue = watch('nombre');
const apellidoValue = watch('apellido');
const telefonoValue = watch('telefono');
const tipoUsuarioValue = watch('tipoUsuario');

useEffect(() => {
  if (nombreValue && nombreValue.length >= 2 && errors.nombre) {
    clearErrors('nombre');
  }
}, [nombreValue, errors.nombre, clearErrors]);

useEffect(() => {
  if (apellidoValue && apellidoValue.length >= 2 && errors.apellido) {
    clearErrors('apellido');
  }
}, [apellidoValue, errors.apellido, clearErrors]);

useEffect(() => {
  if (tipoUsuarioValue && errors.tipoUsuario) {
    clearErrors('tipoUsuario');
  }
}, [tipoUsuarioValue, errors.tipoUsuario, clearErrors]);

useEffect(() => {
  if (telefonoValue && telefonoValue.length >= 8 && errors.telefono) {
    clearErrors('telefono');
  }
}, [telefonoValue, errors.telefono, clearErrors]);
```

### 6. Schema de Validación (Zod)

```tsx
const usuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  tipoUsuario: z.enum(['cliente', 'revendedor'], {
    message: 'Debe seleccionar un tipo de usuario',
  }),
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  notas: z.string().optional(),
});
```

**Nota:** El mensaje personalizado para `enum` se define con `{ message: '...' }`

### 7. Valores por Defecto

```tsx
defaultValues: {
  nombre: '',
  apellido: '',
  tipoUsuario: '' as any,  // IMPORTANTE: Vacío para mostrar placeholder
  telefono: '',
  metodoPagoId: '',
  notas: '',
}
```

### 8. Botones de Navegación

```tsx
{/* Tab 1: Personal */}
<div className="flex gap-3 justify-end pt-6">
  <Button type="button" variant="outline" onClick={onCancel}>
    Cancelar
  </Button>
  <Button type="button" onClick={handleNext}>
    Siguiente
  </Button>
</div>

{/* Tab 2: Pago */}
<div className="flex gap-3 justify-end pt-6">
  <Button type="button" variant="outline" onClick={handlePrevious}>
    Anterior
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Creando...' : 'Crear Usuario'}
  </Button>
</div>
```

### 9. Segundo Tab: Método de Pago

```tsx
<TabsContent value="pago" className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label htmlFor="metodoPagoId">Método de Pago</Label>
      <DropdownMenu>
        {/* Similar al dropdown de Tipo de Usuario */}
      </DropdownMenu>
    </div>
  </div>

  <div className="space-y-2">
    <Label htmlFor="notas">Notas</Label>
    <Textarea
      id="notas"
      {...register('notas')}
      placeholder="Añade notas sobre el método de pago o el cliente..."
      rows={6}
    />
  </div>
</TabsContent>
```

## Imports Necesarios

```tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
```

## Estilos y Clases CSS Importantes

### TabsList
- `inline-flex`: Para que solo ocupe el ancho necesario
- `border-b border-border`: Línea inferior
- `mb-8`: Margen inferior
- `bg-transparent`: Fondo transparente
- `rounded-none p-0 h-auto`: Reset de estilos por defecto

### TabsTrigger
- `rounded-none`: Sin bordes redondeados
- `border-b-2 border-transparent`: Borde inferior transparente por defecto
- `data-[state=active]:border-primary`: Borde de color primary cuando está activo
- `data-[state=active]:bg-transparent`: Mantener fondo transparente cuando está activo
- `px-4 py-2 text-sm`: Padding y tamaño de texto

### Grid de Campos
- `grid grid-cols-1 md:grid-cols-2 gap-6`: 1 columna en móvil, 2 en desktop
- `md:col-span-1`: Campo ocupa 1 columna (mitad del ancho)
- `space-y-2`: Espacio entre label, input y mensaje de error

### Espaciado de Tabs
- Tab Personal: `space-y-13` (más espacio para igualar altura con tab de pago)
- Tab Pago: `space-y-6` (espacio normal)

## Tipografía

**IMPORTANTE:** Todo el texto usa la fuente Inter (fuente del sistema). NUNCA usar `font-mono`.

## Checklist para Replicar

- [ ] Usar sistema de Tabs con `inline-flex` para línea ajustada
- [ ] Implementar validación entre tabs con estado `isTabComplete`
- [ ] Grid de 2 columnas (`md:grid-cols-2`)
- [ ] Capitalización automática en campos de texto (nombre, apellido)
- [ ] Validación de caracteres en teléfono
- [ ] Usar DropdownMenu (NO Select) con `align="start"` y ancho variable
- [ ] Limpieza automática de errores con `useEffect` + `watch`
- [ ] Schema de Zod con mensajes personalizados
- [ ] Valores por defecto vacíos para dropdowns (`'' as any`)
- [ ] Botones Cancelar/Siguiente en primer tab
- [ ] Botones Anterior/Crear en segundo tab
- [ ] Importar ChevronDown de lucide-react
- [ ] NO usar `font-mono` en ningún elemento

## Ejemplo Completo de Campo con Dropdown

```tsx
<div className="space-y-2 md:col-span-1">
  <Label htmlFor="categoria">Categoría</Label>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="w-full justify-between"
        type="button"
      >
        {categoriaValue || 'Seleccionar...'}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
      {categorias.map((cat) => (
        <DropdownMenuItem
          key={cat.id}
          onClick={() => setValue('categoriaId', cat.id)}
        >
          {cat.nombre}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
  {errors.categoriaId && (
    <p className="text-sm text-red-500">{errors.categoriaId.message}</p>
  )}
</div>
```

## Notas Finales

1. **No usar Select de shadcn/ui**, usar DropdownMenu para mejor control del ancho
2. **Validar antes de cambiar de tab**, tanto en el botón como al hacer clic directo en el tab
3. **Limpiar errores automáticamente** cuando el usuario corrige el campo
4. **Capitalizar nombres propios** automáticamente
5. **Validar caracteres permitidos** en campos específicos (teléfono, etc.)
6. **Altura de tabs consistente**: Ajustar `space-y-X` en TabsContent para igualar alturas
