"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import {
  downloadProductTemplate,
  parseProductsFromExcel,
} from "@/lib/import-excel";
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
import { useInventoryStore } from "@/stores/inventory-store";

export default function ProductsPage() {
  const {
    products,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    importProducts,
  } = useInventoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const { products: parsed, skipped } = await parseProductsFromExcel(file);
      if (parsed.length === 0) {
        toast.error("Không đọc được dòng hợp lệ nào (cần cột Mã SP và Tên SP)");
        return;
      }
      const { ok, failed } = await importProducts(parsed);
      const parts = [`Đã nhập ${ok} sản phẩm`];
      if (failed > 0) parts.push(`${failed} lỗi/trùng mã`);
      if (skipped > 0) parts.push(`${skipped} dòng thiếu mã/tên`);
      toast.success(parts.join(" · "));
    } catch {
      toast.error("Không thể đọc file Excel");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Hàng hóa"
        description="Quản lý danh mục hàng hóa và mức tồn tối thiểu"
        action={
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => downloadProductTemplate()}>
              <Download className="mr-2 h-4 w-4" />
              Tải file mẫu
            </Button>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importing ? "Đang nhập..." : "Nhập Excel"}
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm hàng hóa
            </Button>
          </div>
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
              await updateProduct({ id: editingProduct.id, ...values });
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