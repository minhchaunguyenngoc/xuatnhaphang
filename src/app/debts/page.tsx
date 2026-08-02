"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

import { DebtPaymentDialog } from "@/components/debts/debt-payment-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer, CustomerDebtInvoice } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useDebtsStore } from "@/stores/debts-store";

export default function DebtsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission("debts.manage");

  const { customersWithDebt, fetchCustomersWithDebt, fetchCustomerDebtInvoices } = useDebtsStore(
    useShallow((s) => ({
      customersWithDebt: s.customersWithDebt,
      fetchCustomersWithDebt: s.fetchCustomersWithDebt,
      fetchCustomerDebtInvoices: s.fetchCustomerDebtInvoices,
    })),
  );

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<CustomerDebtInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<CustomerDebtInvoice | null>(null);

  useEffect(() => {
    if (canManage) void fetchCustomersWithDebt();
  }, [canManage, fetchCustomersWithDebt]);

  async function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setLoadingInvoices(true);
    try {
      const list = await fetchCustomerDebtInvoices(customer.id);
      setInvoices(list);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải hoá đơn còn nợ"));
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function refreshAfterChange() {
    await fetchCustomersWithDebt();
    if (!selectedCustomer) return;
    const list = await fetchCustomerDebtInvoices(selectedCustomer.id);
    setInvoices(list);
    setPayingInvoice((prev) =>
      prev ? (list.find((i) => i.export_receipt_id === prev.export_receipt_id) ?? null) : null,
    );
  }

  if (!canManage) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Bạn không có quyền quản lý công nợ.
      </div>
    );
  }

  const totalRemaining = invoices.reduce((sum, i) => sum + i.remaining, 0);

  return (
    <div>
      <PageHeader
        title="Công nợ"
        description="Khách hàng còn nợ, tách theo từng hoá đơn — ghi nhận trả nợ cho đúng hoá đơn khách đang trả."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng</TableHead>
                <TableHead className="text-right">Còn nợ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersWithDebt.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    Không có khách hàng nào đang nợ.
                  </TableCell>
                </TableRow>
              ) : (
                customersWithDebt.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className={cn(
                      "cursor-pointer",
                      selectedCustomer?.id === customer.id && "bg-muted",
                    )}
                    onClick={() => void openCustomer(customer)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(customer.debt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          {!selectedCustomer ? (
            <p className="py-10 text-center text-muted-foreground">
              Chọn 1 khách hàng bên trái để xem từng hoá đơn còn nợ.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="text-sm font-medium">{selectedCustomer.name}</span>
                <span className="text-lg font-semibold text-destructive">
                  {formatCurrency(totalRemaining)}
                </span>
              </div>
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số phiếu</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead className="text-right">Đã trả</TableHead>
                      <TableHead className="text-right">Còn nợ</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingInvoices ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Đang tải...
                        </TableCell>
                      </TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Khách hàng này không còn nợ.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.export_receipt_id}>
                          <TableCell className="font-medium">{invoice.receipt_number}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount_paid)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(invoice.remaining)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => setPayingInvoice(invoice)}>
                              Ghi nhận trả nợ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <DebtPaymentDialog
        key={payingInvoice ? payingInvoice.export_receipt_id : "closed"}
        open={!!payingInvoice}
        invoice={payingInvoice}
        onOpenChange={(open) => {
          if (!open) setPayingInvoice(null);
        }}
        onChanged={refreshAfterChange}
      />
    </div>
  );
}
