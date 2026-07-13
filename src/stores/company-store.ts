import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Thông tin cửa hàng/công ty (bên bán) — in lên đầu phiếu/hoá đơn. */
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  taxCode: string;
}

interface CompanyState extends CompanyInfo {
  setCompany: (info: CompanyInfo) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      name: "",
      address: "",
      phone: "",
      taxCode: "",
      setCompany: (info) => set(info),
    }),
    { name: "company-info" },
  ),
);
