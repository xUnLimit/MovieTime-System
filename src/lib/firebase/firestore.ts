import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Generic Firestore service for CRUD operations
 */

// Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: any): Date => {
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

const removeUndefinedFields = <T extends Record<string, any>>(data: T): T => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
};

/**
 * Get all documents from a collection
 */
export async function getAll<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as T));
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get a single document by ID
 */
export async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T>(
  collectionName: string,
  filters: { field: string; operator: WhereFilterOp; value: any }[] = []
): Promise<T[]> {
  try {
    const constraints: QueryConstraint[] = filters.map(filter =>
      where(filter.field, filter.operator, filter.value)
    );

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as T));
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
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
    const cleanedData = removeUndefinedFields(data as Record<string, any>);
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
    const cleanedData = removeUndefinedFields(data as Record<string, any>);
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
 * Collection names constants
 */
export const COLLECTIONS = {
  USUARIOS: 'usuarios',
  /** @deprecated Usar USUARIOS con filtro tipo='cliente' */
  CLIENTES: 'clientes',
  /** @deprecated Usar USUARIOS con filtro tipo='revendedor' */
  REVENDEDORES: 'revendedores',
  SERVICIOS: 'servicios',
  CATEGORIAS: 'categorias',
  SUSCRIPCIONES: 'suscripciones',
  NOTIFICACIONES: 'notificaciones',
  METODOS_PAGO: 'metodosPago',
  ACTIVITY_LOG: 'activityLog',
  CONFIG: 'config',
  GASTOS: 'gastos',
  TEMPLATES: 'templates',
  PAGOS_SERVICIO: 'pagosServicio',
  VENTAS: 'Ventas',
} as const;
