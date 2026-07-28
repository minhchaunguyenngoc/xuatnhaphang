"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/stores/inventory-store";

interface PaginationProps {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

/** Nút Trước/Sau dùng chung cho mọi bảng danh sách có phân trang. */
export function Pagination({ page, total, onPageChange, pageSize = PAGE_SIZE }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-sm text-muted-foreground">
        Tổng {total} dòng · Trang {page}/{totalPages}
      </p>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
