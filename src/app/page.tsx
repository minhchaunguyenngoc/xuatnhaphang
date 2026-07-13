"use client";

import { useEffect } from "react";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useInventoryStore } from "@/stores/inventory-store";

export default function DashboardPage() {
  const {
    dashboardStats,
    inventoryHistory,
    products,
    fetchDashboard,
    fetchInventoryHistory,
    fetchProducts,
  } = useInventoryStore();

  useEffect(() => {
    void fetchDashboard();
    void fetchInventoryHistory();
    void fetchProducts();
  }, [fetchDashboard, fetchInventoryHistory, fetchProducts]);

  const lowStockProducts = products.filter(
    (product) => product.stock_quantity <= product.min_stock,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tổng quan tồn kho và hoạt động nhập xuất tháng này"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng sản phẩm"
          value={formatNumber(dashboardStats?.total_products ?? 0)}
          hint="Danh mục đang quản lý"
        />
        <StatCard
          title="Giá trị tồn kho"
          value={formatCurrency(dashboardStats?.total_stock_value ?? 0)}
          hint="Tính theo giá nhập"
        />
        <StatCard
          title="Nhập tháng này"
          value={formatCurrency(dashboardStats?.import_total_month ?? 0)}
          hint="Tổng phiếu nhập"
        />
        <StatCard
          title="Xuất tháng này"
          value={formatCurrency(dashboardStats?.export_total_month ?? 0)}
          hint={`Lợi nhuận: ${formatCurrency(dashboardStats?.profit_month ?? 0)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Sản phẩm sắp hết hàng</CardTitle>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {dashboardStats?.low_stock_count ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có sản phẩm nào dưới mức tồn tối thiểu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn</TableHead>
                    <TableHead className="text-right">Tối thiểu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.slice(0, 5).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatNumber(product.stock_quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(product.min_stock)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lịch sử tồn kho gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có giao dịch nhập/xuất nào.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Thay đổi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryHistory.slice(0, 6).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.movement_type === "import" ? "default" : "secondary"
                          }
                          className="gap-1"
                        >
                          {item.movement_type === "import" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {item.movement_type === "import" ? "Nhập" : "Xuất"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity_change > 0 ? "+" : ""}
                        {formatNumber(item.quantity_change)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Hướng dẫn nhanh</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <p>1. Thêm sản phẩm tại mục Sản phẩm</p>
          <p>2. Tạo phiếu nhập để tăng tồn kho</p>
          <p>3. Tạo phiếu xuất để giảm tồn kho và xuất báo cáo Excel</p>
        </CardContent>
      </Card>
    </div>
  );
}