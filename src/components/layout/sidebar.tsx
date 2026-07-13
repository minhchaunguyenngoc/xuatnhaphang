"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CompanySettingsDialog } from "@/components/settings/company-settings-dialog";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/pos", label: "Bán hàng", icon: ShoppingCart },
      { href: "/products", label: "Hàng hóa", icon: Package },
      { href: "/inventory", label: "Kiểm kho", icon: ClipboardList },
    ],
  },
  {
    label: "Mua hàng",
    items: [
      { href: "/imports", label: "Nhập hàng", icon: ArrowDownToLine },
      { href: "/suppliers", label: "Nhà cung cấp", icon: Truck },
    ],
  },
  {
    label: "Đơn hàng",
    items: [{ href: "/exports", label: "Hóa đơn", icon: ReceiptText }],
  },
  {
    items: [
      { href: "/customers", label: "Khách hàng", icon: Users },
      { href: "/reports", label: "Báo cáo", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Xuất Nhập Hàng
        </p>
        <h1 className="mt-1 text-lg font-semibold">Quản lý bán hàng</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navSections.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className="flex flex-col gap-1">
            {section.label ? (
              <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Thiết lập công ty
        </button>
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          Dữ liệu lưu local · SQLite
        </p>
      </div>
      <CompanySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
