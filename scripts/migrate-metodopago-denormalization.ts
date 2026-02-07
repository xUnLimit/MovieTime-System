/**
 * Script de migración: Denormalizar metodoPagoNombre y moneda en Servicios
 *
 * Ejecutar con: npx tsx scripts/migrate-metodopago-denormalization.ts
 */

import { getAll, update, getById } from '../src/lib/firebase/firestore';
import { COLLECTIONS } from '../src/lib/firebase/firestore';
import type { Servicio } from '../src/types/servicios';
import type { MetodoPago } from '../src/types/metodos-pago';

async function migrateServicios() {
  console.log('🚀 Iniciando migración de denormalización metodoPago...\n');

  try {
    // 1. Obtener todos los servicios
    const servicios = await getAll<Servicio>(COLLECTIONS.SERVICIOS);
    console.log(`📊 Encontrados ${servicios.length} servicios\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Procesar cada servicio
    for (const servicio of servicios) {
      try {
        // Si no tiene metodoPagoId, saltar
        if (!servicio.metodoPagoId) {
          console.log(`⏭️  Servicio ${servicio.id} (${servicio.nombre}) - Sin método de pago`);
          skipped++;
          continue;
        }

        // Si ya tiene los campos denormalizados, saltar
        if (servicio.metodoPagoNombre && servicio.moneda) {
          console.log(`✅ Servicio ${servicio.id} (${servicio.nombre}) - Ya migrado`);
          skipped++;
          continue;
        }

        // 3. Obtener el método de pago completo
        const metodoPago = await getById<MetodoPago>(
          COLLECTIONS.METODOS_PAGO,
          servicio.metodoPagoId
        );

        if (!metodoPago) {
          console.log(`⚠️  Servicio ${servicio.id} (${servicio.nombre}) - Método de pago no encontrado: ${servicio.metodoPagoId}`);
          errors++;
          continue;
        }

        // 4. Actualizar con campos denormalizados
        await update(COLLECTIONS.SERVICIOS, servicio.id, {
          metodoPagoNombre: metodoPago.nombre,
          moneda: metodoPago.moneda,
        });

        console.log(`✅ Servicio ${servicio.id} (${servicio.nombre}) - Migrado: ${metodoPago.nombre} (${metodoPago.moneda})`);
        migrated++;

      } catch (error) {
        console.error(`❌ Error procesando servicio ${servicio.id}:`, error);
        errors++;
      }
    }

    // 5. Resumen
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migrados:     ${migrated}`);
    console.log(`⏭️  Omitidos:     ${skipped}`);
    console.log(`❌ Errores:      ${errors}`);
    console.log(`📊 Total:        ${servicios.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errors === 0) {
      console.log('🎉 Migración completada exitosamente!\n');
    } else {
      console.log('⚠️  Migración completada con errores. Revisa el log arriba.\n');
    }

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateServicios();
