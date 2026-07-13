"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportExportsToExcel,
  exportImportsToExcel,
  exportProductsToExcel,
  exportProfitReportToExcel,
} from "@/lib/export";
import { formatCurrency, todayISO } from "@/lib/format";
import { useInventoryStore } from "@/stores/inventory-store";

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ReportsPage() {
  const {
    products,
    importReceipts,
    exportReceipts,
    dashboardStats,
    profitReport,
    fetchProducts,
    fetchImportReceipts,
    fetchExportReceipts,
    fetchDashboard,
    fetchProfitReport,
  } = useInventoryStore();

  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());

  useEffect(() => {
    void fetchProducts();
    void fetchImportReceipts();
    void fetchExportReceipts();
    void fetchDashboard();
  }, [fetchProducts, fetchImportReceipts, fetchExportReceipts, fetchDashboard]);

  useEffect(() => {
    void fetchProfitReport(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        description="Xuất báo cáo Excel tồn kho, nhập xuất và tổng hợp lợi nhuận"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Giá trị tồn kho"
          value={formatCurrency(dashboardStats?.total_stock_value ?? 0)}
        />
        <StatCard
          title="Tổng nhập tháng"
          value={formatCurrency(dashboardStats?.import_total_month ?? 0)}
        />
        <StatCard
          title="Lợi nhuận tháng"
          value={formatCurrency(dashboardStats?.profit_month ?? 0)}
          hint="Xuất - Nhập trong tháng hiện tại"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Báo cáo tồn kho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Xuất danh sách sản phẩm, số lượng tồn và giá trị kho hiện tại.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                exportProductsToExcel(products);
                toast.success("Đã xuất báo cáo tồn kho");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel ({products.length})
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Báo cáo nhập hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Xuất chi tiết các phiếu nhập và từng dòng sản phẩm.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                exportImportsToExcel(importReceipts);
                toast.success("Đã xuất báo cáo nhập hàng");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel ({importReceipts.length})
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Báo cáo xuất hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Xuất chi tiết các phiếu xuất và doanh thu theo từng dòng.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                exportExportsToExcel(exportReceipts);
                toast.success("Đã xuất báo cáo xuất hàng");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel ({exportReceipts.length})
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Báo cáo lợi nhuận theo sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Từ ngày</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Đến ngày</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => void fetchProfitReport(from, to)}>Xem báo cáo</Button>
            <Button
              variant="secondary"
              disabled={!profitReport || profitReport.by_product.length === 0}
              onClick={() => {
                if (!profitReport) return;
                exportProfitReportToExcel(profitReport);
                toast.success("Đã xuất báo cáo lợi nhuận");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>

          {profitReport ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Doanh thu" value={formatCurrency(profitReport.total_revenue)} />
                <StatCard title="Giá vốn" value={formatCurrency(profitReport.total_cost)} />
                <StatCard
                  title="Lợi nhuận"
                  value={formatCurrency(profitReport.total_profit)}
                  hint={`Biên lợi nhuận ${profitReport.margin_percent.toFixed(1)}%`}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã SP</TableHead>
                      <TableHead>Tên SP</TableHead>
                      <TableHead className="text-right">SL bán</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Giá vốn</TableHead>
                      <TableHead className="text-right">Lợi nhuận</TableHead>
                      <TableHead className="text-right">Biên LN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitReport.by_product.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Không có dữ liệu xuất hàng trong khoảng thời gian này
                        </TableCell>
                      </TableRow>
                    ) : (
                      profitReport.by_product.map((row) => (
                        <TableRow key={row.product_id}>
                          <TableCell>{row.product_code}</TableCell>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell className="text-right">{row.quantity_sold}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.cost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.margin_percent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}