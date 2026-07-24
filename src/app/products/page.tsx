"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useInventoryStore } from "@/stores/inventory-store";

export default function ProductsPage() {
  const canManageProducts = useAuthStore((state) =>
    state.hasPermission("products.manage"),
  );
  const { products, fetchProducts, createProduct, updateProduct, deleteProduct } =
    useInventoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  return (
    <div>
      <PageHeader
        title="Hàng hóa"
        description="Quản lý danh mục hàng hóa và mức tồn tối thiểu"
        action={
          canManageProducts ? (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm hàng hóa
            </Button>
          ) : null
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              <TableHead className="text-right">Giá xuất</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.import_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.export_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {formatNumber(product.stock_quantity)}
                      {product.stock_quantity <= product.min_stock ? (
                        <Badge variant="destructive">Thấp</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{product.category ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {canManageProducts ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSubmit={async (values) => {
          try {
            if (editingProduct) {
              await updateProduct({
                id: editingProduct.id,
                ...values,
                code: values.code || editingProduct.code,
              });
              toast.success("Đã cập nhật sản phẩm");
            } else {
              await createProduct(values);
              toast.success("Đã thêm sản phẩm");
            }
          } catch {
            toast.error("Không thể lưu sản phẩm");
            throw new Error("save failed");
          }
        }}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sản phẩm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa sản phẩm &quot;{deleteTarget?.name}&quot;? Hành động này không
            thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  await deleteProduct(deleteTarget.id);
                  toast.success("Đã xóa sản phẩm");
                  setDeleteTarget(null);
                } catch {
                  toast.error(
                    "Không thể xóa: sản phẩm đã có phát sinh nhập/xuất kho",
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
