/**
 * Script de Importación: Sistema externo → MovieTime
 *
 * Importa clientes y métodos de pago desde un archivo JSON exportado de otro sistema.
 * Usa Firebase Admin SDK para bypasear las reglas de seguridad de Firestore.
 *
 * REQUISITO: Service Account Key de Firebase
 *   1. Ve a Firebase Console → Configuración del proyecto → Cuentas de servicio
 *   2. Haz clic en "Generar nueva clave privada"
 *   3. Guarda el archivo JSON descargado (ej. serviceAccount.json)
 *
 * Ejecución:
 *   npx tsx scripts/import-from-external.ts --sa="serviceAccount.json"
 *   npx tsx scripts/import-from-external.ts --sa="serviceAccount.json" --file="movietime-export.json"
 *
 * Comportamiento:
 *   - Métodos de pago: upsert por ID (crea si no existe, actualiza si ya existe)
 *   - Clientes: upsert por teléfono (crea si no existe, actualiza si ya existe)
 *   - Idempotente: seguro para ejecutar múltiples veces
 */

import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import type { Firestore, Timestamp } from 'firebase-admin/firestore';

// ─── Resolver argumentos de línea de comandos ─────────────────────────────────
function getArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return undefined;
  return arg.slice(name.length + 3).replace(/^["']|["']$/g, '');
}

// ─── Inicializar Firebase Admin ───────────────────────────────────────────────
function initAdmin(): Firestore {
  const saPath = getArg('sa');

  if (!saPath) {
    console.error('❌ Falta el argumento --sa=<ruta-service-account.json>');
    console.error('');
    console.error('   Cómo obtener la Service Account Key:');
    console.error('   1. Ve a https://console.firebase.google.com/');
    console.error('   2. Selecciona tu proyecto → Configuración (⚙️) → Cuentas de servicio');
    console.error('   3. Haz clic en "Generar nueva clave privada"');
    console.error('   4. Guarda el archivo JSON y pásalo aquí:');
    console.error('');
    console.error('   npx tsx scripts/import-from-external.ts --sa="serviceAccount.json"');
    process.exit(1);
  }

  const saFullPath = path.resolve(process.cwd(), saPath);
  if (!fs.existsSync(saFullPath)) {
    console.error(`❌ Service account no encontrada: ${saFullPath}`);
    process.exit(1);
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(saFullPath, 'utf-8')) as admin.ServiceAccount;
  } catch (err) {
    console.error('❌ Error al leer la service account JSON:', err);
    process.exit(1);
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

// ─── Colecciones ──────────────────────────────────────────────────────────────
const COLLECTIONS = {
  USUARIOS: 'usuarios',
  METODOS_PAGO: 'metodosPago',
} as const;

// ─── Tipos del sistema origen ─────────────────────────────────────────────────
interface ExternalClient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes: string;
  clientType: string;
  paymentMethodRef: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface ExternalPaymentMethod {
  id: string;
  type: 'Usuario' | 'Servicio';
  bankName: string;
  holderName: string;
  currency: string;
  country: string;
  alias: string;
  notes: string;
  accountType?: string;
  identifier?: string;
  email?: string;
  password?: string;
  lastFourDigits?: string;
  expiryDate?: string;
  cardNumber?: string;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportFile {
  version: string;
  exportedAt: string;
  modules: string[];
  data: {
    clients: ExternalClient[];
    paymentMethods: ExternalPaymentMethod[];
  };
}

// ─── Helpers de mapeo ─────────────────────────────────────────────────────────

/**
 * Infiere el tipo de método de pago según el nombre del banco.
 * Valores válidos en MovieTime: 'banco' | 'yappy' | 'paypal' | 'binance' | 'efectivo'
 */
function inferirTipoMetodoPago(bankName: string): string {
  const nombre = bankName.toLowerCase();
  if (nombre.includes('yappy')) return 'yappy';
  if (nombre.includes('paypal')) return 'paypal';
  if (nombre.includes('binance')) return 'binance';
  if (nombre.includes('efectivo') || nombre.includes('cash')) return 'efectivo';
  return 'banco';
}

/**
 * Normaliza accountType del sistema origen al enum TipoCuenta de MovieTime.
 * Valores válidos: 'ahorro' | 'corriente' | 'wallet' | 'telefono' | 'email'
 */
function normalizarTipoCuenta(accountType: string | undefined): string | undefined {
  if (!accountType) return undefined;
  const lower = accountType.toLowerCase();
  const map: Record<string, string> = {
    ahorro: 'ahorro',
    corriente: 'corriente',
    wallet: 'wallet',
    telefono: 'telefono',
    email: 'email',
    savings: 'ahorro',
    checking: 'corriente',
    phone: 'telefono',
  };
  return map[lower] ?? lower;
}

/** Convierte ISO string a Firestore Admin Timestamp */
function isoToTimestamp(iso: string): Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}

/** Quita campos undefined del objeto */
function limpiar<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result as T;
}

// ─── Fase 1: Importar métodos de pago ─────────────────────────────────────────
async function importarMetodosPago(
  db: Firestore,
  metodosPago: ExternalPaymentMethod[]
) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💳 FASE 1: MÉTODOS DE PAGO');
  console.log(`   Total a procesar: ${metodosPago.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const pm of metodosPago) {
    try {
      const esServicio = pm.type === 'Servicio';
      const asociadoA = esServicio ? 'servicio' : 'usuario';

      const docData = limpiar({
        nombre: pm.bankName,
        titular: pm.holderName,
        moneda: pm.currency,
        pais: pm.country,
        tipo: inferirTipoMetodoPago(pm.bankName),
        asociadoA,
        tipoCuenta: normalizarTipoCuenta(pm.accountType),
        identificador: pm.identifier ?? pm.email ?? pm.holderName,
        alias: pm.alias || undefined,
        notas: pm.notes || undefined,
        activo: true,
        createdBy: 'importacion',
        createdAt: isoToTimestamp(pm.createdAt),
        updatedAt: isoToTimestamp(pm.updatedAt),
        ...(esServicio && {
          email: pm.email || undefined,
          contrasena: pm.password || undefined,
          numeroTarjeta: pm.lastFourDigits || undefined,
          fechaExpiracion: pm.expiryDate || undefined,
        }),
      });

      const docRef = db.collection(COLLECTIONS.METODOS_PAGO).doc(pm.id);
      const existente = await docRef.get();

      if (existente.exists) {
        await docRef.update({ ...docData, updatedAt: isoToTimestamp(pm.updatedAt) });
        console.log(`🔄 Actualizado: [${pm.id}] ${pm.bankName} — ${asociadoA}`);
        actualizados++;
      } else {
        await docRef.set(docData);
        console.log(`✅ Creado:      [${pm.id}] ${pm.bankName} — ${asociadoA}`);
        creados++;
      }
    } catch (error) {
      console.error(`❌ Error con método de pago [${pm.id}] ${pm.bankName}:`, error);
      errores++;
    }
  }

  console.log('\n  Subtotal métodos de pago:');
  console.log(`    ✅ Creados:      ${creados}`);
  console.log(`    🔄 Actualizados: ${actualizados}`);
  console.log(`    ❌ Errores:      ${errores}`);

  return { creados, actualizados, errores };
}

// ─── Fase 2: Importar clientes ─────────────────────────────────────────────────
async function importarClientes(
  db: Firestore,
  clientes: ExternalClient[],
  metodosPagoMap: Map<string, ExternalPaymentMethod>
) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 FASE 2: CLIENTES');
  console.log(`   Total a procesar: ${clientes.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let creados = 0;
  let actualizados = 0;
  let errores = 0;
  let sinMetodoPago = 0;

  for (const cliente of clientes) {
    try {
      const metodoPago = metodosPagoMap.get(cliente.paymentMethodRef);
      if (!metodoPago) {
        console.warn(
          `⚠️  ${cliente.firstName} ${cliente.lastName} — ` +
          `paymentMethodRef "${cliente.paymentMethodRef}" no encontrado en el JSON.`
        );
        sinMetodoPago++;
      }

      const metodoPagoNombre = metodoPago?.bankName ?? '';
      const moneda = metodoPago?.currency ?? 'USD';

      const docData = limpiar({
        nombre: cliente.firstName.trim(),
        apellido: cliente.lastName.trim(),
        tipo: 'cliente',
        telefono: cliente.phone,
        email: '',
        notas: cliente.notes || undefined,
        metodoPagoId: cliente.paymentMethodRef,
        metodoPagoNombre,
        moneda,
        serviciosActivos: 0,
        active: true,
        createdBy: 'importacion',
        createdAt: isoToTimestamp(cliente.createdAt),
        updatedAt: isoToTimestamp(cliente.updatedAt),
      });

      // Buscar duplicado por teléfono
      const snapshot = await db
        .collection(COLLECTIONS.USUARIOS)
        .where('telefono', '==', cliente.phone)
        .limit(1)
        .get();

      const nombre = `${cliente.firstName.trim()} ${cliente.lastName.trim()}`;

      if (!snapshot.empty) {
        // Actualizar sin tocar serviciosActivos ni createdAt
        const camposActualizables = Object.fromEntries(
          Object.entries(docData as Record<string, unknown>).filter(
            ([k]) => k !== 'serviciosActivos' && k !== 'createdAt'
          )
        );
        await snapshot.docs[0].ref.update({
          ...camposActualizables,
          updatedAt: isoToTimestamp(cliente.updatedAt),
        });
        console.log(`🔄 Actualizado: ${nombre} (${cliente.phone})`);
        actualizados++;
      } else {
        // Crear con el ID original del JSON (idempotencia en re-ejecuciones)
        await db.collection(COLLECTIONS.USUARIOS).doc(cliente.id).set(docData);
        console.log(`✅ Creado:      ${nombre} (${cliente.phone})`);
        creados++;
      }
    } catch (error) {
      const nombre = `${cliente.firstName} ${cliente.lastName}`;
      console.error(`❌ Error con cliente ${nombre} [${cliente.id}]:`, error);
      errores++;
    }
  }

  console.log('\n  Subtotal clientes:');
  console.log(`    ✅ Creados:           ${creados}`);
  console.log(`    🔄 Actualizados:      ${actualizados}`);
  if (sinMetodoPago > 0) {
    console.log(`    ⚠️  Sin método pago:   ${sinMetodoPago}`);
  }
  console.log(`    ❌ Errores:           ${errores}`);

  return { creados, actualizados, errores, sinMetodoPago };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 IMPORTACIÓN DESDE SISTEMA EXTERNO → MOVIETIME');
  console.log(`   Iniciado: ${new Date().toLocaleString('es-PA')}\n`);

  // Inicializar Firebase Admin (requiere --sa=<ruta>)
  const db = initAdmin();
  const projectId = (admin.app().options.credential as admin.credential.Credential & { projectId?: string })?.projectId
    ?? process.env.GCLOUD_PROJECT
    ?? '(desconocido)';
  console.log(`   Proyecto Firebase: ${projectId}`);

  // Resolver ruta del archivo JSON
  const jsonArg = getArg('file');
  const jsonPath = jsonArg
    ? path.resolve(process.cwd(), jsonArg)
    : path.resolve(process.cwd(), 'movietime-export-2026-02-16 (2).json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Archivo JSON no encontrado: ${jsonPath}`);
    console.error('   Usa: npx tsx scripts/import-from-external.ts --sa="serviceAccount.json" --file="export.json"');
    process.exit(1);
  }

  console.log(`📂 Archivo: ${path.basename(jsonPath)}`);

  // Leer y parsear el JSON
  let exportData: ExportFile;
  try {
    exportData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ExportFile;
  } catch (err) {
    console.error('❌ Error al leer el archivo JSON:', err);
    process.exit(1);
  }

  const { clients, paymentMethods } = exportData.data;
  console.log(`📊 Datos: ${paymentMethods.length} métodos de pago, ${clients.length} clientes\n`);

  // Mapa en memoria para resolver referencias de métodos de pago
  const metodosPagoMap = new Map<string, ExternalPaymentMethod>(
    paymentMethods.map((pm) => [pm.id, pm])
  );

  // Fase 1: Métodos de pago
  const resultadosMP = await importarMetodosPago(db, paymentMethods);

  // Fase 2: Clientes
  const resultadosClientes = await importarClientes(db, clients, metodosPagoMap);

  // ─── Resumen final ───────────────────────────────────────────────────────────
  const totalErrores = resultadosMP.errores + resultadosClientes.errores;

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN FINAL DE IMPORTACIÓN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('MÉTODOS DE PAGO');
  console.log(`  ✅ Creados:       ${resultadosMP.creados}`);
  console.log(`  🔄 Actualizados:  ${resultadosMP.actualizados}`);
  console.log(`  ❌ Errores:       ${resultadosMP.errores}`);
  console.log('');
  console.log('CLIENTES');
  console.log(`  ✅ Creados:       ${resultadosClientes.creados}`);
  console.log(`  🔄 Actualizados:  ${resultadosClientes.actualizados}`);
  if (resultadosClientes.sinMetodoPago > 0) {
    console.log(`  ⚠️  Sin método:    ${resultadosClientes.sinMetodoPago}`);
  }
  console.log(`  ❌ Errores:       ${resultadosClientes.errores}`);
  console.log(`  📊 Total:         ${clients.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (totalErrores === 0) {
    console.log('\n🎉 Importación completada exitosamente!\n');
  } else {
    console.log(`\n⚠️  Importación completada con ${totalErrores} error(es). Revisa el log arriba.\n`);
  }

  process.exit(totalErrores > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
