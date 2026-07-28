"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import { formatCurrency, todayISO } from "@/lib/format";
import { useInventoryStore } from "@/stores/inventory-store";

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Trần số dòng tải về khi bấm "Xuất Excel" — đủ dùng cho hầu hết cửa hàng,
 * tránh kéo cả bảng dữ liệu khổng lồ vào bộ nhớ trình duyệt chỉ để xuất file
 * (bản thân Excel cũng không tải nổi hàng triệu dòng mượt mà). */
const EXPORT_CAP = 20000;

/** Số dòng hiện sẵn ở bảng lợi nhuận theo sản phẩm trước khi bấm "Xem tất cả". */
const PROFIT_ROWS_PREVIEW = 200;

export default function ReportsPage() {
  const {
    productsTotal,
    importReceiptsTotal,
    exportReceiptsTotal,
    dashboardStats,
    profitReport,
    fetchProducts,
    fetchImportReceipts,
    fetchExportReceipts,
    fetchDashboard,
    fetchProfitReport,
  } = useInventoryStore(
    useShallow((s) => ({
      productsTotal: s.productsTotal,
      importReceiptsTotal: s.importReceiptsTotal,
      exportReceiptsTotal: s.exportReceiptsTotal,
      dashboardStats: s.dashboardStats,
      profitReport: s.profitReport,
      fetchProducts: s.fetchProducts,
      fetchImportReceipts: s.fetchImportReceipts,
      fetchExportReceipts: s.fetchExportReceipts,
      fetchDashboard: s.fetchDashboard,
      fetchProfitReport: s.fetchProfitReport,
    })),
  );

  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [exporting, setExporting] = useState<string | null>(null);
  const [showAllProfitRows, setShowAllProfitRows] = useState(false);

  // Cửa hàng nhiều mặt hàng có thể ra hàng nghìn dòng cho 1 kỳ — render hết
  // một lúc làm đơ trang. Hiện trước một phần, phần còn lại bấm mới xem.
  const allProfitRows = profitReport?.by_product ?? [];
  const visibleProfitRows = showAllProfitRows
    ? allProfitRows
    : allProfitRows.slice(0, PROFIT_ROWS_PREVIEW);
  const hiddenProfitRows = allProfitRows.length - visibleProfitRows.length;

  useEffect(() => {
    // Chỉ cần lấy `total` để hiện số lượng — không giữ cả danh sách trong
    // state chung, tránh trang Báo cáo âm thầm tải nặng mỗi lần vào.
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
          hint="Doanh thu − giá vốn FIFO (đã trừ chiết khấu phiếu)"
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
              disabled={exporting === "products"}
              onClick={async () => {
                setExporting("products");
                try {
                  const { items } = await api.getProducts({
                    search: null,
                    limit: EXPORT_CAP,
                    offset: 0,
                  });
                  await exportProductsToExcel(items);
                  toast.success("Đã xuất báo cáo tồn kho");
                } finally {
                  setExporting(null);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "products" ? "Đang xuất..." : `Xuất Excel (${productsTotal})`}
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
              disabled={exporting === "imports"}
              onClick={async () => {
                setExporting("imports");
                try {
                  const { items } = await api.getImportReceipts({
                    search: null,
                    limit: EXPORT_CAP,
                    offset: 0,
                  });
                  await exportImportsToExcel(items);
                  toast.success("Đã xuất báo cáo nhập hàng");
                } finally {
                  setExporting(null);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "imports" ? "Đang xuất..." : `Xuất Excel (${importReceiptsTotal})`}
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
              disabled={exporting === "exports"}
              onClick={async () => {
                setExporting("exports");
                try {
                  const { items } = await api.getExportReceipts({
                    search: null,
                    limit: EXPORT_CAP,
                    offset: 0,
                  });
                  await exportExportsToExcel(items);
                  toast.success("Đã xuất báo cáo xuất hàng");
                } finally {
                  setExporting(null);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "exports" ? "Đang xuất..." : `Xuất Excel (${exportReceiptsTotal})`}
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
            <Button
              onClick={() => {
                setShowAllProfitRows(false); // kỳ mới thì thu gọn lại
                void fetchProfitReport(from, to);
              }}
            >
              Xem báo cáo
            </Button>
            <Button
              variant="secondary"
              disabled={!profitReport || profitReport.by_product.length === 0}
              onClick={async () => {
                if (!profitReport) return;
                await exportProfitReportToExcel(profitReport);
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
                      visibleProfitRows.map((row) => (
                        <TableRow key={row.product_id}>
                          <TableCell>{row.product_code}</TableCell>
                          <TableCell>
                            {row.product_name}
                            {row.quantity_sold <= 0 ? (
                              <Badge
                                variant="outline"
                                className="ml-2 text-muted-foreground"
                                title="Đây là hàng trả lại trong kỳ mà đơn bán gốc nằm ngoài khoảng thời gian đã chọn, không phải lợi nhuận âm thực sự."
                              >
                                Chỉ có hàng trả
                              </Badge>
                            ) : null}
                          </TableCell>
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
              {hiddenProfitRows > 0 ? (
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    Đang hiện {PROFIT_ROWS_PREVIEW} / {profitReport.by_product.length} sản
                    phẩm. Các số tổng phía trên vẫn tính trên toàn bộ.
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setShowAllProfitRows(true)}>
                    Xem tất cả ({hiddenProfitRows} dòng nữa)
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
