'use client';

import { Button } from '@/components/ui/button';

export interface PaginationFooterProps {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function PaginationFooter({ page, totalPages, hasPrevious, hasMore, onPrevious, onNext }: PaginationFooterProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasMore}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
