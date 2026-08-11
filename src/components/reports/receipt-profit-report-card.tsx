"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { PartnerPicker } from "@/components/shared/partner-picker";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer, ReceiptProfitRow } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

import { ReceiptProfitDetailDialog } from "./receipt-profit-detail-dialog";

/** Số hoá đơn hiện sẵn trước khi bấm "Xem tất cả" — cùng lý do với bảng lợi
 * nhuận theo sản phẩm: một kỳ bận có thể ra hàng nghìn phiếu. */
const ROWS_PREVIEW = 200;

const SORT_LABELS = {
  date_desc: "Mới nhất",
  date_asc: "Cũ nhất",
  profit_desc: "Lợi nhuận cao nhất",
  profit_asc: "Lợi nhuận thấp nhất",
  margin_desc: "Biên LN cao nhất",
} as const;

type SortKey = keyof typeof SORT_LABELS;

function sortRows(rows: ReceiptProfitRow[], sort: SortKey): ReceiptProfitRow[] {
  // Backend đã trả sẵn theo ngày giảm dần; các kiểu khác sắp lại trên bản sao
  // để không đụng vào mảng trong store.
  if (sort === "date_desc") return rows;
  const sorted = [...rows];
  switch (sort) {
    case "date_asc":
      return sorted.reverse();
    case "profit_desc":
      return sorted.sort((a, b) => b.profit - a.profit);
    case "profit_asc":
      return sorted.sort((a, b) => a.profit - b.profit);
    case "margin_desc":
      return sorted.sort((a, b) => b.margin_percent - a.margin_percent);
  }
}

interface ReceiptProfitReportCardProps {
  /** Kỳ mặc định, dùng chung mốc ngày với báo cáo theo sản phẩm ở trên. */
  defaultFrom: string;
  defaultTo: string;
}

/** Báo cáo lợi nhuận GOM THEO HOÁ ĐƠN — bổ sung cho báo cáo theo sản phẩm.
 * Cùng một kỳ, tổng của hai báo cáo luôn khớp nhau. */
export function ReceiptProfitReportCard({
  defaultFrom,
  defaultTo,
}: ReceiptProfitReportCardProps) {
  const { report, fetchReport, searchCustomers } = useInventoryStore(
    useShallow((s) => ({
      report: s.receiptProfitReport,
      fetchReport: s.fetchReceiptProfitReport,
      searchCustomers: s.searchCustomers,
    })),
  );

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [showAll, setShowAll] = useState(false);
  const [detailRow, setDetailRow] = useState<ReceiptProfitRow | null>(null);

  // Nạp kỳ mặc định một lần khi vào trang, giống bảng theo sản phẩm — vào là
  // thấy số ngay, không phải bấm thêm.
  useEffect(() => {
    void fetchReport(defaultFrom, defaultTo, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allRows = useMemo(
    () => sortRows(report?.by_receipt ?? [], sort),
    [report, sort],
  );
  const visibleRows = showAll ? allRows : allRows.slice(0, ROWS_PREVIEW);
  const hiddenRows = allRows.length - visibleRows.length;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Báo cáo lợi nhuận theo hoá đơn</CardTitle>
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
          <div className="w-56 space-y-1">
            <Label>Khách hàng</Label>
            <PartnerPicker<Customer>
              value={customer}
              onSelect={setCustomer}
              search={searchCustomers}
              placeholder="Tất cả khách hàng"
            />
          </div>
          <div className="w-44 space-y-1">
            <Label>Sắp xếp</Label>
            <Select
              items={SORT_LABELS}
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setShowAll(false); // kỳ mới thì thu gọn lại
              void fetchReport(from, to, customer?.id ?? null);
            }}
          >
            Xem báo cáo
          </Button>
        </div>

        {report ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="Doanh thu" value={formatCurrency(report.total_revenue)} />
              <StatCard title="Giá vốn" value={formatCurrency(report.total_cost)} />
              <StatCard
                title="Lợi nhuận"
                value={formatCurrency(report.total_profit)}
                hint={`Biên lợi nhuận ${report.margin_percent.toFixed(1)}%`}
              />
              <StatCard
                title="Chiết khấu & trả hàng"
                value={formatCurrency(report.total_discount + report.total_returned)}
                hint={`Chiết khấu ${formatCurrency(report.total_discount)} · Trả hàng ${formatCurrency(report.total_returned)}`}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã HĐ</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Tiền hàng</TableHead>
                    <TableHead className="text-right">Chiết khấu</TableHead>
                    <TableHead className="text-right">Trả hàng</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Giá vốn</TableHead>
                    <TableHead className="text-right">Lợi nhuận</TableHead>
                    <TableHead className="text-right">Biên LN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        Không có hoá đơn nào trong khoảng thời gian này
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row) => (
                      <TableRow
                        key={row.receipt_id}
                        className="cursor-pointer"
                        title="Bấm để xem chi tiết từng sản phẩm"
                        onClick={() => setDetailRow(row)}
                      >
                        <TableCell className="font-medium">{row.receipt_number}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>{row.customer ?? "Khách lẻ"}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.items_total)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.discount > 0 ? `−${formatCurrency(row.discount)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.returned_revenue > 0
                            ? `−${formatCurrency(row.returned_revenue)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.cost)}</TableCell>
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

            {hiddenRows > 0 ? (
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  Đang hiện {ROWS_PREVIEW} / {allRows.length} hoá đơn. Các số tổng phía
                  trên vẫn tính trên toàn bộ.
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
                  Xem tất cả ({hiddenRows} dòng nữa)
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Hàng khách trả lại được trừ vào chính hoá đơn gốc, kể cả khi phiếu trả
              lập ở kỳ khác — mỗi dòng là kết quả cuối cùng của hoá đơn đó.
            </p>
          </>
        ) : null}
      </CardContent>

      <ReceiptProfitDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
    </Card>
  );
}
