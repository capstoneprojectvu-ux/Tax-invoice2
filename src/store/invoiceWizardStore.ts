import { create } from 'zustand';
import type { Company, InvoiceItem, InventoryItem } from '@/data/mockData';
import type { InvoiceOptionsData } from '@/components/InvoiceOptions';

interface InvoiceWizardState {
  items: InvoiceItem[];
  company: Company | null;
  options: InvoiceOptionsData;
  setItems: (items: InvoiceItem[]) => void;
  setCompany: (company: Company | null) => void;
  setOptions: (options: InvoiceOptionsData) => void;
  reset: () => void;
}

const createDefaultOptions = (): InvoiceOptionsData => ({
  paymentTerms: '30days',
  dueDate: (() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  })(),
  notes: '',
  transportMode: 'road',
  vehicleNo: '',
});

export const useInvoiceWizardStore = create<InvoiceWizardState>((set) => ({
  items: [],
  company: null,
  options: createDefaultOptions(),
  setItems: (items) => set({ items }),
  setCompany: (company) => set({ company }),
  setOptions: (options) => set({ options }),
  reset: () =>
    set({
      items: [],
      company: null,
      options: createDefaultOptions(),
    }),
}));

