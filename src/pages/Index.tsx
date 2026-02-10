import { useState, useCallback, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import InventoryList from '@/components/InventoryList';
import GstLookup from '@/components/GstLookup';
import InvoiceItems from '@/components/InvoiceItems';
import InvoiceSummary from '@/components/InvoiceSummary';
import InvoiceOptions, { InvoiceOptionsData } from '@/components/InvoiceOptions';
import InvoicePdf from '@/components/InvoicePdf';
import AddCompanyDialog from '@/components/AddCompanyDialog';
import {
  inventoryItems,
  companies as defaultCompanies,
  InventoryItem,
  Company,
  InvoiceItem,
  generateInvoiceNumber,
} from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FileDown, RotateCcw, Receipt, Sparkles } from 'lucide-react';

const Index = () => {
  const { user } = useAuthStore();
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return defaultCompanies;

    try {
      const stored = window.localStorage.getItem('tax-invoice-companies');
      if (!stored) return defaultCompanies;

      const parsed = JSON.parse(stored) as Company[];
      // Basic validation: ensure each has gstNo and name
      if (Array.isArray(parsed) && parsed.every(c => c && typeof c.gstNo === 'string' && typeof c.name === 'string')) {
        return parsed;
      }

      return defaultCompanies;
    } catch {
      return defaultCompanies;
    }
  });

  // Persist companies list so added companies survive page refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('tax-invoice-companies', JSON.stringify(companies));
    } catch {
      // Ignore storage errors (e.g., private mode / quota exceeded)
    }
  }, [companies]);

  // Load companies from Supabase for the logged-in user
  useEffect(() => {
    const loadCompaniesFromSupabase = async () => {
      if (!user) {
        // If somehow not logged in, fall back to defaults/local storage
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading companies from Supabase:', error);
          return;
        }

        if (!data || data.length === 0) {
          // Optional: seed Supabase with default companies for first-time use
          const { data: seeded, error: seedError } = await supabase
            .from('companies')
            .insert(
              defaultCompanies.map((c) => ({
                user_id: user.id,
                gst_no: c.gstNo,
                name: c.name,
                address: c.address,
                state: c.state,
                state_code: c.stateCode,
                pending_amount: c.pendingAmount,
                last_transaction: c.lastTransaction
                  ? new Date(c.lastTransaction).toISOString()
                  : null,
              })),
            )
            .select('*');

          if (seedError || !seeded) {
            console.error('Error seeding default companies to Supabase:', seedError);
            return;
          }

          setCompanies(
            seeded.map((row) => ({
              id: row.id as string,
              gstNo: row.gst_no as string,
              name: row.name as string,
              address: (row.address as string) || '',
              state: (row.state as string) || '',
              stateCode: (row.state_code as string) || '',
              pendingAmount: Number(row.pending_amount || 0),
              lastTransaction: row.last_transaction as string | undefined,
            })),
          );
          return;
        }

        // Map Supabase rows into Company type
        setCompanies(
          data.map((row) => ({
            id: row.id as string,
            gstNo: row.gst_no as string,
            name: row.name as string,
            address: (row.address as string) || '',
            state: (row.state as string) || '',
            stateCode: (row.state_code as string) || '',
            pendingAmount: Number(row.pending_amount || 0),
            lastTransaction: row.last_transaction as string | undefined,
          })),
        );
      } catch (err) {
        console.error('Unexpected error loading companies from Supabase:', err);
      }
    };

    void loadCompaniesFromSupabase();
  }, [user]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOptionsData>({
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

  const handleAddItem = useCallback((item: InventoryItem) => {
    const existingItem = invoiceItems.find(i => i.item.id === item.id);
    
    if (existingItem) {
      if (existingItem.quantity >= item.stock) {
        toast({
          title: "Maximum stock reached",
          description: `Cannot add more ${item.name}. Available: ${item.stock} ${item.unit}`,
          variant: "destructive",
        });
        return;
      }
      setInvoiceItems(prev => 
        prev.map(i => 
          i.item.id === item.id 
            ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
            : i
        )
      );
    } else {
      setInvoiceItems(prev => [...prev, {
        id: `invoice-${Date.now()}`,
        item,
        quantity: 1,
        discount: 0,
      }]);
    }
    
    toast({
      title: "Item added",
      description: `${item.name} added to invoice`,
    });
  }, [invoiceItems]);

  const handleUpdateQuantity = useCallback((id: string, quantity: number) => {
    setInvoiceItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  }, []);

  const handleUpdateDiscount = useCallback((id: string, discount: number) => {
    setInvoiceItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, discount } : item
      )
    );
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Item removed",
      description: "Item removed from invoice",
    });
  }, []);

  const handleAddCompany = (company: Company) => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in again to save companies.',
        variant: 'destructive',
      });
      return;
    }

    // Save company to Supabase so it is shared across devices for this user
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            gst_no: company.gstNo,
            name: company.name,
            address: company.address,
            state: company.state,
            state_code: company.stateCode,
            pending_amount: company.pendingAmount,
            last_transaction: company.lastTransaction
              ? new Date(company.lastTransaction).toISOString()
              : null,
          })
          .select('*')
          .single();

        if (error || !data) {
          console.error('Error saving company to Supabase:', error);
          toast({
            title: 'Error saving company',
            description: error?.message || 'Could not save company to database.',
            variant: 'destructive',
          });
          return;
        }

        const savedCompany: Company = {
          id: data.id as string,
          gstNo: data.gst_no as string,
          name: data.name as string,
          address: (data.address as string) || '',
          state: (data.state as string) || '',
          stateCode: (data.state_code as string) || '',
          pendingAmount: Number(data.pending_amount || 0),
          lastTransaction: data.last_transaction as string | undefined,
        };

        setCompanies((prev) => [...prev, savedCompany]);
        setSelectedCompany(savedCompany);
      } catch (err: any) {
        console.error('Unexpected error saving company to Supabase:', err);
        toast({
          title: 'Error saving company',
          description: err?.message || 'Unexpected error while saving company.',
          variant: 'destructive',
        });
      }
    })();
  };

  const handleClearInvoice = () => {
    setInvoiceItems([]);
    setSelectedCompany(null);
    setInvoiceOptions({
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
    toast({
      title: "Invoice cleared",
      description: "All items and customer details have been cleared",
    });
  };

  const handleGeneratePdf = async () => {
    if (!selectedCompany) {
      toast({
        title: "Customer required",
        description: "Please select a customer by entering their GST number",
        variant: "destructive",
      });
      return;
    }

    if (invoiceItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one item to the invoice",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const invoiceNumber = generateInvoiceNumber();
      const invoiceDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Log for debugging
      console.log('Starting PDF generation for invoice:', invoiceNumber);

      const blob = await pdf(
        <InvoicePdf
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          items={invoiceItems}
          company={selectedCompany}
          options={invoiceOptions}
        />
      ).toBlob();

      if (!blob) {
        throw new Error('PDF blob is null or undefined');
      }

      console.log('PDF blob created successfully, size:', blob.size, 'bytes');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup with slight delay to ensure download starts
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Invoice generated!",
        description: `Invoice ${invoiceNumber} has been downloaded`,
      });
      
      console.log('PDF download completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('PDF generation error:', error);
      console.error('Error details:', errorMessage);
      
      toast({
        title: "Error generating PDF",
        description: errorMessage || "Failed to generate PDF. Please try again. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Tax Invoice Generator</h1>
              <p className="text-xs text-muted-foreground">Create GST-compliant invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddCompanyDialog onAddCompany={handleAddCompany} />
            <Button variant="outline" size="sm" onClick={handleClearInvoice}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button 
              size="sm" 
              onClick={handleGeneratePdf}
              disabled={isGenerating || invoiceItems.length === 0 || !selectedCompany}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-1" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Left Sidebar - Inventory */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <InventoryList items={inventoryItems} onAddItem={handleAddItem} />
          </aside>

          {/* Right Content */}
          <div className="space-y-6">
            {/* Customer Details */}
            <GstLookup 
              selectedCompany={selectedCompany} 
              onSelectCompany={setSelectedCompany}
              companies={companies}
            />

            {/* Invoice Items */}
            <InvoiceItems
              items={invoiceItems}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
            />

            {/* Invoice Options */}
            <InvoiceOptions
              options={invoiceOptions}
              onChange={setInvoiceOptions}
            />

            {/* Summary */}
            <InvoiceSummary 
              items={invoiceItems} 
              company={selectedCompany}
            />

            {/* Action Buttons - Mobile */}
            <div className="lg:hidden space-y-2">
              <AddCompanyDialog onAddCompany={handleAddCompany} />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClearInvoice}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleGeneratePdf}
                  disabled={isGenerating || invoiceItems.length === 0 || !selectedCompany}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-1" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
