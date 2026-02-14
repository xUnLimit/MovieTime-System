import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { currencyService } from '@/lib/services/currencyService';
import { format } from 'date-fns';
import type { DashboardStats, UsuariosMes, IngresosMes, IngresoCategoria, IngresosDia, UsuariosDia, PronosticoMensual, VentaPronostico, ServicioPronostico } from '@/types/dashboard';

const STATS_DOC_ID = 'dashboard_stats';
const CONFIG_COLLECTION = 'config';

const EMPTY_STATS: DashboardStats = {
  gastosTotal: 0,
  ingresosTotal: 0,
  usuariosPorMes: [],
  usuariosPorDia: [],
  ingresosPorMes: [],
  ingresosPorDia: [],
  ingresosPorCategoria: [],
};

// ===========================
// READ
// ===========================

export async function getDashboardStats(): Promise<DashboardStats> {
  const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { ...EMPTY_STATS };
  const data = snap.data();
  return {
    gastosTotal: data.gastosTotal ?? 0,
    ingresosTotal: data.ingresosTotal ?? 0,
    usuariosPorMes: data.usuariosPorMes ?? [],
    usuariosPorDia: data.usuariosPorDia ?? [],
    ingresosPorMes: data.ingresosPorMes ?? [],
    ingresosPorDia: data.ingresosPorDia ?? [],
    ingresosPorCategoria: data.ingresosPorCategoria ?? [],
    pronostico: data.pronostico ?? undefined,
    ventasPronostico: data.ventasPronostico ?? undefined,
    serviciosPronostico: data.serviciosPronostico ?? undefined,
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
  };
}

// ===========================
// HELPERS
// ===========================

function getMesKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function getDiaKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getCurrentMesKey(): string {
  return getMesKey(new Date());
}

/** Resetea ingresosPorDia si el mes cambió, y mantiene solo el mes actual */
function resetDiaIfNewMonth<T extends { dia: string }>(arr: T[], currentMes: string): T[] {
  return arr.filter((d) => d.dia.startsWith(currentMes));
}

async function getOrCreate(): Promise<DashboardStats> {
  const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, { ...EMPTY_STATS, updatedAt: Timestamp.now() });
    return { ...EMPTY_STATS };
  }
  const data = snap.data();
  return {
    gastosTotal: data.gastosTotal ?? 0,
    ingresosTotal: data.ingresosTotal ?? 0,
    usuariosPorMes: data.usuariosPorMes ?? [],
    usuariosPorDia: data.usuariosPorDia ?? [],
    ingresosPorMes: data.ingresosPorMes ?? [],
    ingresosPorDia: data.ingresosPorDia ?? [],
    ingresosPorCategoria: data.ingresosPorCategoria ?? [],
  };
}

async function saveStats(stats: DashboardStats): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
  await setDoc(docRef, { ...stats, updatedAt: Timestamp.now() });
}

// ===========================
// INGRESOS (called by ventasStore)
// ===========================

export async function adjustIngresosStats(params: {
  delta: number;
  moneda: string;
  mes: string; // "YYYY-MM"
  dia: string; // "YYYY-MM-DD"
  categoriaId: string;
  categoriaNombre: string;
}): Promise<void> {
  try {
    const { delta, moneda, mes, dia, categoriaId, categoriaNombre } = params;
    const deltaUSD = await currencyService.convertToUSD(Math.abs(delta), moneda);
    const signedDelta = delta < 0 ? -deltaUSD : deltaUSD;

    const stats = await getOrCreate();

    // Update ingresosTotal
    stats.ingresosTotal = Math.max(0, (stats.ingresosTotal ?? 0) + signedDelta);

    // Update ingresosPorMes
    const mesEntry = stats.ingresosPorMes.find((m: IngresosMes) => m.mes === mes);
    if (mesEntry) {
      mesEntry.ingresos = Math.max(0, mesEntry.ingresos + signedDelta);
    } else {
      stats.ingresosPorMes = [
        ...stats.ingresosPorMes,
        { mes, ingresos: Math.max(0, signedDelta), gastos: 0 },
      ];
    }
    stats.ingresosPorMes = keepLast12Months(stats.ingresosPorMes);

    // Update ingresosPorDia (solo mes actual, resetea si cambió el mes)
    const currentMes = getCurrentMesKey();
    stats.ingresosPorDia = resetDiaIfNewMonth(stats.ingresosPorDia ?? [], currentMes);
    if (mes === currentMes) {
      const diaEntry = stats.ingresosPorDia.find((d: IngresosDia) => d.dia === dia);
      if (diaEntry) {
        diaEntry.ingresos = Math.max(0, diaEntry.ingresos + signedDelta);
      } else {
        stats.ingresosPorDia = [
          ...stats.ingresosPorDia,
          { dia, ingresos: Math.max(0, signedDelta), gastos: 0 },
        ];
      }
    }

    // Update ingresosPorCategoria
    const catEntry = stats.ingresosPorCategoria.find(
      (c: IngresoCategoria) => c.categoriaId === categoriaId
    );
    if (catEntry) {
      catEntry.total = Math.max(0, catEntry.total + signedDelta);
    } else {
      stats.ingresosPorCategoria = [
        ...stats.ingresosPorCategoria,
        { categoriaId, nombre: categoriaNombre, total: Math.max(0, signedDelta) },
      ];
    }

    await saveStats(stats);
  } catch (error) {
    console.error('[DashboardStats] Error adjusting ingresos:', error);
  }
}

// ===========================
// GASTOS (called by serviciosStore)
// ===========================

export async function adjustGastosStats(params: {
  delta: number;
  moneda: string;
  mes: string; // "YYYY-MM"
  dia: string; // "YYYY-MM-DD"
}): Promise<void> {
  try {
    const { delta, moneda, mes, dia } = params;
    const deltaUSD = await currencyService.convertToUSD(Math.abs(delta), moneda);
    const signedDelta = delta < 0 ? -deltaUSD : deltaUSD;

    const stats = await getOrCreate();

    // Update gastosTotal
    stats.gastosTotal = Math.max(0, (stats.gastosTotal ?? 0) + signedDelta);

    // Update ingresosPorMes gastos field
    const mesEntry = stats.ingresosPorMes.find((m: IngresosMes) => m.mes === mes);
    if (mesEntry) {
      mesEntry.gastos = Math.max(0, mesEntry.gastos + signedDelta);
    } else {
      stats.ingresosPorMes = [
        ...stats.ingresosPorMes,
        { mes, ingresos: 0, gastos: Math.max(0, signedDelta) },
      ];
    }
    stats.ingresosPorMes = keepLast12Months(stats.ingresosPorMes);

    // Update ingresosPorDia gastos field (solo mes actual)
    const currentMes = getCurrentMesKey();
    stats.ingresosPorDia = resetDiaIfNewMonth(stats.ingresosPorDia ?? [], currentMes);
    if (mes === currentMes) {
      const diaEntry = stats.ingresosPorDia.find((d: IngresosDia) => d.dia === dia);
      if (diaEntry) {
        diaEntry.gastos = Math.max(0, diaEntry.gastos + signedDelta);
      } else {
        stats.ingresosPorDia = [
          ...stats.ingresosPorDia,
          { dia, ingresos: 0, gastos: Math.max(0, signedDelta) },
        ];
      }
    }

    await saveStats(stats);
  } catch (error) {
    console.error('[DashboardStats] Error adjusting gastos:', error);
  }
}

// ===========================
// USUARIOS (called by usuariosStore)
// ===========================

export async function adjustUsuariosPorMes(params: {
  mes: string; // "YYYY-MM"
  dia: string; // "YYYY-MM-DD"
  tipo: 'cliente' | 'revendedor';
  delta: 1 | -1;
}): Promise<void> {
  try {
    const { mes, dia, tipo, delta } = params;

    const stats = await getOrCreate();

    // Update usuariosPorMes
    const mesEntry = stats.usuariosPorMes.find((m: UsuariosMes) => m.mes === mes);
    if (mesEntry) {
      if (tipo === 'cliente') {
        mesEntry.clientes = Math.max(0, mesEntry.clientes + delta);
      } else {
        mesEntry.revendedores = Math.max(0, mesEntry.revendedores + delta);
      }
    } else {
      stats.usuariosPorMes = [
        ...stats.usuariosPorMes,
        {
          mes,
          clientes: tipo === 'cliente' ? Math.max(0, delta) : 0,
          revendedores: tipo === 'revendedor' ? Math.max(0, delta) : 0,
        },
      ];
    }
    stats.usuariosPorMes = keepLast12Months(stats.usuariosPorMes);

    // Update usuariosPorDia (solo mes actual)
    const currentMes = getCurrentMesKey();
    stats.usuariosPorDia = resetDiaIfNewMonth(stats.usuariosPorDia ?? [], currentMes);
    if (mes === currentMes) {
      const diaEntry = stats.usuariosPorDia.find((d: UsuariosDia) => d.dia === dia);
      if (diaEntry) {
        if (tipo === 'cliente') {
          diaEntry.clientes = Math.max(0, diaEntry.clientes + delta);
        } else {
          diaEntry.revendedores = Math.max(0, diaEntry.revendedores + delta);
        }
      } else {
        stats.usuariosPorDia = [
          ...stats.usuariosPorDia,
          {
            dia,
            clientes: tipo === 'cliente' ? Math.max(0, delta) : 0,
            revendedores: tipo === 'revendedor' ? Math.max(0, delta) : 0,
          },
        ];
      }
    }

    await saveStats(stats);
  } catch (error) {
    console.error('[DashboardStats] Error adjusting usuariosPorMes:', error);
  }
}

// ===========================
// PRONÓSTICO SOURCE DATA (called by ventasStore + serviciosStore after mutations)
// Stores minimal denormalized fields needed to compute the forecast client-side.
// No getAll reads needed on dashboard load.
// ===========================

/**
 * Upserts or removes a single venta in the ventasPronostico array.
 * Safe regardless of whether the store has all ventas loaded.
 */
export async function upsertVentaPronostico(venta: VentaPronostico | null, ventaId: string): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
    const snap = await getDoc(docRef);
    const existing: VentaPronostico[] = snap.exists() ? (snap.data().ventasPronostico ?? []) : [];

    let updated: VentaPronostico[];
    if (venta === null) {
      // Delete
      updated = existing.filter((v) => v.id !== ventaId);
    } else {
      // Upsert
      const idx = existing.findIndex((v) => v.id === ventaId);
      updated = idx >= 0
        ? existing.map((v, i) => (i === idx ? venta : v))
        : [...existing, venta];
    }

    await setDoc(docRef, { ventasPronostico: updated, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('[DashboardStats] Error upserting ventaPronostico:', error);
  }
}

/**
 * Upserts or removes a single servicio in the serviciosPronostico array.
 * Safe regardless of whether the store has all servicios loaded.
 */
export async function upsertServicioPronostico(servicio: ServicioPronostico | null, servicioId: string): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
    const snap = await getDoc(docRef);
    const existing: ServicioPronostico[] = snap.exists() ? (snap.data().serviciosPronostico ?? []) : [];

    let updated: ServicioPronostico[];
    if (servicio === null) {
      // Delete
      updated = existing.filter((s) => s.id !== servicioId);
    } else {
      // Upsert
      const idx = existing.findIndex((s) => s.id === servicioId);
      updated = idx >= 0
        ? existing.map((s, i) => (i === idx ? servicio : s))
        : [...existing, servicio];
    }

    await setDoc(docRef, { serviciosPronostico: updated, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('[DashboardStats] Error upserting servicioPronostico:', error);
  }
}

/**
 * @deprecated Use upsertVentaPronostico instead.
 * Replaces the full ventasPronostico array.
 */
export async function syncVentasPronostico(ventas: VentaPronostico[]): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
    await setDoc(docRef, { ventasPronostico: ventas, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('[DashboardStats] Error syncing ventasPronostico:', error);
  }
}

/**
 * @deprecated Use upsertServicioPronostico instead.
 * Replaces the full serviciosPronostico array.
 */
export async function syncServiciosPronostico(servicios: ServicioPronostico[]): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
    await setDoc(docRef, { serviciosPronostico: servicios, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('[DashboardStats] Error syncing serviciosPronostico:', error);
  }
}

/**
 * @deprecated Use syncVentasPronostico/syncServiciosPronostico instead.
 * Saves a pre-computed forecast into dashboard_stats.
 */
export async function savePronostico(pronostico: PronosticoMensual[]): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STATS_DOC_ID);
    await setDoc(docRef, { pronostico, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('[DashboardStats] Error saving pronostico:', error);
  }
}

// ===========================
// UTILITIES
// ===========================

export function getMesKeyFromDate(date: Date): string {
  return getMesKey(date);
}

export function getDiaKeyFromDate(date: Date): string {
  return getDiaKey(date);
}

function keepLast12Months<T extends { mes: string }>(arr: T[]): T[] {
  return arr
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12);
}

