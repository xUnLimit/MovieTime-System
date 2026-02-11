# Fix: Perfiles Disponibles Negativos en Categorías

## Problema

La categoría Crunchyroll tiene `perfilesDisponiblesTotal: -4` en Firestore, causado por desincronización del contador.

## Solución Manual (Firebase Console)

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Abrir Firestore Database
3. Ir a colección `categorias`
4. Buscar el documento de la categoría "Crunchyroll"
5. Editar el campo `perfilesDisponiblesTotal` y cambiarlo a `0`
6. Guardar

## Verificación

Después de arreglar, recargar la página `/servicios` y verificar que la columna "Perfiles Disponibles" muestra `0` en lugar de `-4`.

## Prevención

El código ya está actualizado para:
- ✅ Mostrar `Math.max(0, valor)` en la tabla (nunca mostrará negativos)
- ✅ Al desactivar/activar servicios, el contador se ajusta correctamente

Si vuelves a activar Crunchyroll, los perfiles se sumarán correctamente desde 0.
