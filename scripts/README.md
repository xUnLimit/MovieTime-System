# Scripts de Mantenimiento

Scripts utilitarios para migración, importación y monitoreo del sistema.

## Estado de Migraciones

| Script | Estado | Fecha | Descripción |
|--------|--------|-------|-------------|
| `migrate-venta-fechas.ts` | ✅ Ejecutado | Feb 2026 | Migración de campos de fecha en ventas |
| `migrate-metodopago-denormalization.ts` | ✅ Ejecutado | Feb 2026 | Denormalización de MetodoPago en servicios/ventas |
| `import-from-external.ts` | ✅ Ejecutado | Feb 2026 | Importación inicial desde sistema externo |

## Scripts de Utilidad

| Script | Descripción |
|--------|-------------|
| `firebase-monitor.js` | Monitor de lecturas Firestore en tiempo real (desarrollo) |
| `fix-perfiles-disponibles.md` | Guía para corregir contadores de perfiles manualmente en Firebase Console |

## Cómo ejecutar un script

```bash
npx ts-node --esm scripts/<nombre>.ts
```

> ⚠️ Los scripts de migración son de uso único. Verificar el estado antes de ejecutar.
