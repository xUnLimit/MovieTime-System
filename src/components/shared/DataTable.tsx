'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

// Memoized TableRow component for better performance
const MemoizedTableRow = memo(function MemoizedTableRow<T extends Record<string, any>>({
  item,
  columns,
  actions,
  onRowClick,
  index,
}: {
  item: T;
  columns: Column<T>[];
  actions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  index: number;
}) {
  return (
    <TableRow
      onClick={() => onRowClick?.(item)}
      className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
    >
      {columns.map((column, colIndex) => (
        <TableCell
          key={column.key}
          className={`${colIndex === 0 ? 'pl-6' : ''} ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
        >
          {column.render ? column.render(item) : item[column.key]}
        </TableCell>
      ))}
      {actions && (
        <TableCell className="text-center pr-6" onClick={(e) => e.stopPropagation()}>
          {actions(item)}
        </TableCell>
      )}
    </TableRow>
  );
});

function DataTableComponent<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      // Misma columna: ciclar asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // Nueva columna: empezar con asc
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const getSortIcon = useCallback((columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  }, [sortKey, sortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="rounded-md border bg-background overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, colIndex) => (
              <TableHead
                key={column.key}
                style={{ width: column.width }}
                className={`${colIndex === 0 ? 'pl-6' : ''} ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
              >
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className={`h-8 -ml-3 ${column.align === 'center' ? 'w-full justify-center ml-0' : ''} ${sortKey === column.key ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {column.header}
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  <span className="text-muted-foreground">{column.header}</span>
                )}
              </TableHead>
            ))}
            {actions && <TableHead className="text-center pr-6 text-muted-foreground">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item, index) => (
            <MemoizedTableRow
              key={item.id || index}
              item={item}
              columns={columns as Column<Record<string, any>>[]}
              actions={actions as ((item: Record<string, any>) => React.ReactNode) | undefined}
              onRowClick={onRowClick as ((item: Record<string, any>) => void) | undefined}
              index={index}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Export memoized version of DataTable
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
