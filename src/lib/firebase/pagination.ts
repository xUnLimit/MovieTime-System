import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  QueryDocumentSnapshot,
  DocumentData,
  WhereFilterOp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { convertTimestamps } from './firestore';

export interface FilterOption {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

export interface PaginationOptions {
  pageSize: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
  filters?: FilterOption[];
}

export interface PaginatedResult<T> {
  docs: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch paginated documents from a Firestore collection.
 * Costs pageSize + 1 reads (one extra to detect hasMore).
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
    filters = [],
  } = options;

  const start = Date.now();

  try {
    const filterConstraints: QueryConstraint[] = filters.map(f =>
      where(f.field, f.operator, f.value)
    );

    let q = query(
      collection(db, collectionName),
      ...filterConstraints,
      orderBy(orderByField, orderDirection),
      limit(pageSize + 1)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.slice(0, pageSize);
    const hasMore = querySnapshot.docs.length > pageSize;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    if (process.env.NODE_ENV === 'development') {
      const filterStr = filters.map(f => f.field + ' ' + f.operator + ' ' + JSON.stringify(f.value)).join(', ');
      console.log(
        '%c[Firestore]%c paginated (' + collectionName + (filterStr ? ' where ' + filterStr : '') + ') → ' + docs.length + ' docs · ' + (Date.now() - start) + 'ms',
        'background:#2196F3;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
        'color:#2196F3;font-weight:600'
      );
    }

    return {
      docs: docs.map(doc => ({
        id: doc.id,
        ...(convertTimestamps(doc.data()) as Record<string, unknown>),
      } as T)),
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error(`Error getting paginated ${collectionName}:`, error);
    throw error;
  }
}
