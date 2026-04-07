# Scripts de Mantenimiento

Scripts utilitarios para migraciÃ³n, importaciÃ³n y monitoreo del sistema.

## Estado de Migraciones

| Script | Estado | Fecha | DescripciÃ³n |
|--------|--------|-------|-------------|
| `migrate-venta-fechas.ts` | âœ… Ejecutado | Feb 2026 | MigraciÃ³n de campos de fecha en ventas |
| `migrate-metodopago-denormalization.ts` | âœ… Ejecutado | Feb 2026 | DenormalizaciÃ³n de MetodoPago en servicios/ventas |

## Scripts de Utilidad

| Script | DescripciÃ³n |
|--------|-------------|
| `firebase-monitor.js` | Monitor de lecturas Firestore en tiempo real (desarrollo) |
| `fix-perfiles-disponibles.md` | GuÃ­a para corregir contadores de perfiles manualmente en Firebase Console |

## CÃ³mo ejecutar un script

```bash
npx ts-node --esm scripts/<nombre>.ts
```

> âš ï¸ Los scripts de migraciÃ³n son de uso Ãºnico. Verificar el estado antes de ejecutar.

