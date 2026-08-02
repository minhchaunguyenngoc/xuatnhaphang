"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Undo2,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CompanySettingsDialog } from "@/components/settings/company-settings-dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Cần ít nhất 1 quyền trong danh sách này (bỏ trống = ai cũng thấy). */
  permissions?: string[];
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/pos", label: "Bán hàng", icon: ShoppingCart, permissions: ["exports.create"] },
      { href: "/products", label: "Hàng hoá", icon: Package, permissions: ["products.manage"] },
      { href: "/inventory", label: "Kiểm kho", icon: ClipboardList },
    ],
  },
  {
    label: "Mua hàng",
    items: [
      {
        href: "/imports",
        label: "Nhập hàng",
        icon: ArrowDownToLine,
        permissions: ["imports.create", "imports.edit"],
      },
      { href: "/suppliers", label: "Nhà cung cấp", icon: Truck, permissions: ["suppliers.manage"] },
    ],
  },
  {
    label: "Đơn hàng",
    items: [
      { href: "/exports", label: "Hóa đơn", icon: ReceiptText, permissions: ["exports.create"] },
      {
        href: "/returns",
        label: "Trả hàng",
        icon: Undo2,
        permissions: ["returns.customer", "returns.supplier"],
      },
      { href: "/debts", label: "Công nợ", icon: Wallet, permissions: ["debts.manage"] },
    ],
  },
  {
    items: [
      { href: "/customers", label: "Khách hàng", icon: Users, permissions: ["customers.manage"] },
      { href: "/reports", label: "Báo cáo", icon: BarChart3, permissions: ["reports.view"] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const canSee = (item: NavItem) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    if (!user) return false;
    if (user.is_admin) return true;
    return item.permissions.some((key) => user.permissions.includes(key));
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Xuất Nhập Hàng
        </p>
        <h1 className="mt-1 text-lg font-semibold">Quản lý bán hàng</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navSections.map((section, index) => {
          const visibleItems = section.items.filter(canSee);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label ?? `section-${index}`} className="flex flex-col gap-1">
              {section.label ? (
                <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              ) : null}
              {visibleItems.map((item) => {
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
          );
        })}
        {user?.is_admin ? (
          <div className="flex flex-col gap-1">
            <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quản trị
            </p>
            <Link
              href="/users"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/users")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <UserCog className="h-4 w-4" />
              Người dùng
            </Link>
          </div>
        ) : null}
      </nav>
      <div className="border-t p-3">
        {user ? (
          <p className="px-3 pb-1 text-sm font-medium">{user.full_name}</p>
        ) : null}
        {!user || user.is_admin || user.permissions.includes("settings.manage") ? (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Thiết lập công ty
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          Dữ liệu lưu local · SQLite
        </p>
      </div>
      <CompanySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
