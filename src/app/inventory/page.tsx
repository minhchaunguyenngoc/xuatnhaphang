"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useInventoryStore } from "@/stores/inventory-store";

type MovementFilter = "all" | "export" | "import";

export default function InventoryPage() {
  const { products, inventoryHistory, fetchProducts, fetchInventoryHistory } =
    useInventoryStore();
  const [filter, setFilter] = useState<MovementFilter>("export");

  useEffect(() => {
    void fetchProducts();
    void fetchInventoryHistory();
  }, [fetchProducts, fetchInventoryHistory]);

  const totalStockValue = products.reduce(
    (sum, p) => sum + p.stock_quantity * p.import_price,
    0,
  );

  const filteredHistory = useMemo(() => {
    if (filter === "all") return inventoryHistory;
    return inventoryHistory.filter((h) => h.movement_type === filter);
  }, [inventoryHistory, filter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kiểm kho"
        description="Kiểm tra tồn kho hiện tại và lịch sử xuất/nhập theo thời gian"
      />

      {/* Tồn kho hiện tại */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tồn kho hiện tại</h2>
          <span className="text-sm text-muted-foreground">
            Tổng giá trị tồn:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(totalStockValue)}
            </span>
          </span>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên hàng hóa</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Tồn tối thiểu</TableHead>
                <TableHead className="text-right">Giá vốn</TableHead>
                <TableHead className="text-right">Giá trị tồn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Chưa có hàng hóa nào.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {formatNumber(p.stock_quantity)}
                        {p.stock_quantity <= p.min_stock ? (
                          <Badge variant="destructive">Thấp</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(p.min_stock)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.import_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.stock_quantity * p.import_price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Lịch sử xuất/nhập kho */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Lịch sử xuất / nhập kho</h2>
          <div className="flex gap-1">
            {(
              [
                ["export", "Xuất hàng"],
                ["import", "Nhập hàng"],
                ["all", "Tất cả"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hàng hóa</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead>Số phiếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Chưa có phát sinh nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((h) => {
                  const isExport = h.movement_type === "export";
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDateTime(h.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isExport ? "destructive" : "secondary"}>
                          {isExport ? "Xuất" : "Nhập"}
                        </Badge>
                      </TableCell>
                      <TableCell>{h.product_name}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          isExport ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {h.quantity_change > 0 ? "+" : ""}
                        {formatNumber(h.quantity_change)}
                      </TableCell>
                      <TableCell>
                        {h.receipt_number ?? `#${h.reference_id}`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
