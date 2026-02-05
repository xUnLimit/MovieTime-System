import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { convertTimestamps } from './firestore';

export interface PaginationOptions {
  pageSize: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
}

export interface PaginatedResult<T> {
  docs: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch paginated documents from a Firestore collection
 * @param collectionName - Name of the Firestore collection
 * @param options - Pagination options
 * @returns Paginated result with documents and metadata
 */
export async function getPaginated<T>(
  collectionName: string,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const {
    pageSize,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    startAfterDoc,
  } = options;

  try {
    let q = query(
      collection(db, collectionName),
      orderBy(orderByField, orderDirection),
      limit(pageSize + 1) // Fetch one extra to check if there are more
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.slice(0, pageSize);
    const hasMore = querySnapshot.docs.length > pageSize;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      docs: docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      } as T)),
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error(`Error getting paginated ${collectionName}:`, error);
    throw error;
  }
}
