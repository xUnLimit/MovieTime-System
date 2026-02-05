import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  increment,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Generic Firestore service for CRUD operations
 */

// Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: unknown): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

// Convert Date to Firestore Timestamp
export const dateToTimestamp = (date: Date | string): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  return Timestamp.fromDate(new Date(date));
};

const removeUndefinedFields = <T extends Record<string, unknown>>(data: T): T => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
};

/**
 * Recursively convert Firestore Timestamps to Dates
 */
export function convertTimestamps(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = convertTimestamps(value);
  }
  return result;
}

/**
 * Dev-only: log cuando un store evita una lectura por caché
 */
export function logCacheHit(collectionName: string) {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(
    '%c[Cache]%c Hit (' + collectionName + ') → sin lectura a Firestore',
    'background:#FF9800;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
    'color:#FF9800;font-weight:600'
  );
}

/**
 * Get all documents from a collection with automatic timestamp conversion
 */
export async function getAll<T>(collectionName: string): Promise<T[]> {
  const start = Date.now();
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const docs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(convertTimestamps(data) as Record<string, unknown>),
      } as T;
    });
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '%c[Firestore]%c getAll (' + collectionName + ') → ' + docs.length + ' docs · ' + (Date.now() - start) + 'ms',
        'background:#4CAF50;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
        'color:#4CAF50;font-weight:600'
      );
    }
    return docs;
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get a single document by ID with automatic timestamp conversion
 */
export async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const start = Date.now();
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    let result: T | null = null;
    if (docSnap.exists()) {
      const data = docSnap.data();
      result = {
        id: docSnap.id,
        ...(convertTimestamps(data) as Record<string, unknown>),
      } as T;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '%c[Firestore]%c getById (' + collectionName + '/' + id + ') → ' + (result ? 'encontrado' : 'null') + ' · ' + (Date.now() - start) + 'ms',
        'background:#4CAF50;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
        'color:#4CAF50;font-weight:600'
      );
    }
    return result;
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Query documents with filters and automatic timestamp conversion
 */
export async function queryDocuments<T>(
  collectionName: string,
  filters: { field: string; operator: WhereFilterOp; value: unknown }[] = []
): Promise<T[]> {
  const start = Date.now();
  try {
    const constraints: QueryConstraint[] = filters.map(filter =>
      where(filter.field, filter.operator, filter.value)
    );

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    const docs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(convertTimestamps(data) as Record<string, unknown>),
      } as T;
    });
    if (process.env.NODE_ENV === 'development') {
      const filterStr = filters.map(f => f.field + ' ' + f.operator + ' ' + JSON.stringify(f.value)).join(', ');
      console.log(
        '%c[Firestore]%c query (' + collectionName + (filterStr ? ' where ' + filterStr : '') + ') → ' + docs.length + ' docs · ' + (Date.now() - start) + 'ms',
        'background:#4CAF50;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
        'color:#4CAF50;font-weight:600'
      );
    }
    return docs;
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Count documents in a collection (without fetching data).
 * Costs 1 read regardless of collection size.
 */
export async function getCount(
  collectionName: string,
  filters: { field: string; operator: WhereFilterOp; value: unknown }[] = []
): Promise<number> {
  const start = Date.now();
  try {
    const constraints: QueryConstraint[] = filters.map(filter =>
      where(filter.field, filter.operator, filter.value)
    );
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;

    if (process.env.NODE_ENV === 'development') {
      const filterStr = filters.map(f => f.field + ' ' + f.operator + ' ' + JSON.stringify(f.value)).join(', ');
      console.log(
        '%c[Firestore]%c count (' + collectionName + (filterStr ? ' where ' + filterStr : '') + ') → ' + count + ' · ' + (Date.now() - start) + 'ms',
        'background:#9C27B0;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
        'color:#9C27B0;font-weight:600'
      );
    }
    return count;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create a new document
 */
export async function create<T extends DocumentData>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<string> {
  try {
    const now = Timestamp.now();
    const cleanedData = removeUndefinedFields(data as Record<string, unknown>);
    const docRef = await addDoc(collection(db, collectionName), {
      ...cleanedData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update an existing document
 */
export async function update<T extends DocumentData>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    const cleanedData = removeUndefinedFields(data as Record<string, unknown>);
    await updateDoc(docRef, {
      ...cleanedData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function remove(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Incrementa o decrementa el campo `ventasActivas` de un usuario de forma atómica.
 * Si el campo no existe, `increment` lo inicializa en 0 antes de ajustar.
 * @param clienteId  – id del documento en la colección `usuarios`
 * @param delta      – +1 al crear venta activa, -1 al eliminar/inactivar
 */
export async function adjustVentasActivas(clienteId: string, delta: number): Promise<void> {
  if (!clienteId) return;
  try {
    const docRef = doc(db, 'usuarios', clienteId);
    await updateDoc(docRef, { ventasActivas: increment(delta) });
  } catch (error) {
    console.error(`Error ajustando ventasActivas para usuario ${clienteId}:`, error);
    // No lanzamos — es un campo denormalizado, no debe bloquear la operación principal
  }
}

/**
 * Collection names constants
 */
export const COLLECTIONS = {
  USUARIOS: 'usuarios',
  SERVICIOS: 'servicios',
  CATEGORIAS: 'categorias',
  NOTIFICACIONES: 'notificaciones',
  METODOS_PAGO: 'metodosPago',
  ACTIVITY_LOG: 'activityLog',
  CONFIG: 'config',
  GASTOS: 'gastos',
  TEMPLATES: 'templates',
  PAGOS_SERVICIO: 'pagosServicio',
  VENTAS: 'Ventas',
} as const;
