/**
 * Script de Migración: Poblador de fechaInicio, fechaFin, cicloPago en VentaDoc
 *
 * Purpose: Actualizar documentos de venta existentes para incluir campos denormalizados
 * requeridos por el sistema de notificaciones v2.1
 *
 * Ejecución:
 * - Desarrollo: npx ts-node scripts/migrate-venta-fechas.ts
 * - Este script es seguro para ejecutar múltiples veces (idempotente)
 *
 * Lo que hace:
 * 1. Lee todas las ventas de la colección
 * 2. Para cada venta sin fechaFin, busca el pago más reciente en pagosVenta
 * 3. Denormaliza fechaInicio, fechaFin, cicloPago desde ese pago
 * 4. Actualiza el documento de venta
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  orderBy,
  limit,
  Query,
} from 'firebase/firestore';

// Importar configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.projectId) {
  console.error('❌ Error: Firebase config not found in environment variables');
  console.error('Please ensure NEXT_PUBLIC_FIREBASE_* env vars are set in .env.local');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface VentaDoc {
  id: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  cicloPago?: string;
  [key: string]: any;
}

interface PagoVenta {
  ventaId: string;
  fechaInicio?: Date;
  fechaVencimiento?: Date;
  cicloPago?: string;
  createdAt?: Date;
  [key: string]: any;
}

async function migrateVentaFechas() {
  console.log('🚀 Iniciando migración de fechas de ventas...\n');

  try {
    // 1. Obtener todas las ventas
    const ventasSnapshot = await getDocs(collection(db, 'ventas'));
    const ventasTotal = ventasSnapshot.size;
    console.log(`📊 Total de ventas encontradas: ${ventasTotal}\n`);

    let migradas = 0;
    let conFechas = 0;
    let sinPagos = 0;

    // 2. Procesar cada venta
    for (const ventaDoc of ventasSnapshot.docs) {
      const venta = ventaDoc.data() as VentaDoc;
      const ventaId = ventaDoc.id;

      // Si ya tiene fechaFin, skip
      if (venta.fechaFin) {
        conFechas++;
        continue;
      }

      console.log(`📝 Procesando venta: ${ventaId}`);

      // 3. Buscar pagos para esta venta
      const pagosSnapshot = await getDocs(
        query(
          collection(db, 'pagosVenta'),
          where('ventaId', '==', ventaId),
          orderBy('createdAt', 'desc'),
          limit(1)
        ) as Query
      );

      if (pagosSnapshot.empty) {
        console.log(`   ⚠️  Sin pagos encontrados - skipping\n`);
        sinPagos++;
        continue;
      }

      // 4. Obtener el pago más reciente
      const ultimoPago = pagosSnapshot.docs[0].data() as PagoVenta;

      const fechaInicio = ultimoPago.fechaInicio ? new Date(ultimoPago.fechaInicio) : new Date();
      const fechaVencimiento = ultimoPago.fechaVencimiento
        ? new Date(ultimoPago.fechaVencimiento)
        : new Date();
      const cicloPago = ultimoPago.cicloPago || 'mensual';

      // 5. Actualizar documento de venta
      await updateDoc(doc(db, 'ventas', ventaId), {
        fechaInicio,
        fechaFin: fechaVencimiento,
        cicloPago,
      });

      console.log(`   ✅ Migrada exitosamente`);
      console.log(`      fechaInicio: ${fechaInicio.toISOString().split('T')[0]}`);
      console.log(`      fechaFin: ${fechaVencimiento.toISOString().split('T')[0]}`);
      console.log(`      cicloPago: ${cicloPago}\n`);

      migradas++;
    }

    // 6. Resumen final
    console.log('\n========== RESUMEN DE MIGRACIÓN ==========');
    console.log(`Total de ventas:        ${ventasTotal}`);
    console.log(`✅ Migradas:            ${migradas}`);
    console.log(`📌 Ya con fechas:       ${conFechas}`);
    console.log(`⚠️  Sin pagos:          ${sinPagos}`);
    console.log(`Total procesadas:       ${migradas + conFechas + sinPagos}`);
    console.log('==========================================\n');

    if (migradas > 0) {
      console.log(`✨ Migración completada exitosamente!`);
      console.log(`   ${migradas} documento(s) actualizado(s)`);
    } else {
      console.log('ℹ️  No había documentos que migrar.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateVentaFechas();
