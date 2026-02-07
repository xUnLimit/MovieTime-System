'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PaginationFooterProps {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function PaginationFooter({ page, totalPages, hasPrevious, hasMore, onPrevious, onNext }: PaginationFooterProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mostrar</span>
        <Select value="10" onValueChange={() => {}}>
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasMore}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
