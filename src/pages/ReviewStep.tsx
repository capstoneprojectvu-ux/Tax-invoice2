import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InvoicePdf from '@/components/InvoicePdf';
import { useInvoiceWizardStore } from '@/store/invoiceWizardStore';
import { generateInvoiceNumber, sellerInfo } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

const ReviewStep = () => {
  const navigate = useNavigate();
  const { items, company, options, setOptions, setCompany } = useInvoiceWizardStore();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/wizard/items');
    } else if (!company) {
      navigate('/wizard/company');
    }
  }, [company, items.length, navigate]);

  const invoiceNumber = useMemo(() => generateInvoiceNumber(), []);
  const invoiceDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [],
  );

  // ✅ CALCULATE TOTALS FIRST (BEFORE handleGeneratePdf function)
  const taxableTotal = items.reduce((sum, i) => {
    const base = i.item.rate * i.quantity;
    const discount = (base * i.discount) / 100;
    return sum + (base - discount);
  }, 0);

  const gstTotal = items.reduce((sum, i) => {
    const base = i.item.rate * i.quantity;
    const discount = (base * i.discount) / 100;
    const taxable = base - discount;
    return sum + (taxable * i.item.gstRate) / 100;
  }, 0);

  const grandTotal = taxableTotal + gstTotal;
  const previousBalance = company?.pendingAmount ?? 0;
  const totalPayable = previousBalance + grandTotal;

  // ✅ NOW grandTotal is defined and available for this function
  const handleGeneratePdf = async () => {
    if (!company || items.length === 0) return;

    const paymentDone = window.confirm(
      'Is payment received for this invoice?\n\nOK = Yes (payment done)\nCancel = No (add amount to customer balance)',
    );

    if (!paymentDone) {
      try {
        const currentBalance = company.pendingAmount ?? 0;
        const newBalance = currentBalance + grandTotal;

        const { data, error } = await supabase
          .from('companies')
          .update({ pending_amount: newBalance })
          .eq('id', company.id)
          .select('*')
          .single();

        if (!error && data) {
          const updatedCompany = {
            ...company,
            pendingAmount: Number(data.pending_amount || newBalance),
          };
          setCompany(updatedCompany);
        }
      } catch (e) {
        console.error('Error updating customer balance:', e);
      }
    }

    setIsGenerating(true);
    try {
      const blob = await pdf(
        <InvoicePdf
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          items={items}
          company={company}
          options={options}
        />,
      ).toBlob();

      if (!blob) throw new Error('PDF blob is empty');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error('Error generating PDF from review step:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">
            Invoice Wizard – Step 3 of 3: Review & Print
          </h1>
          <p className="text-xs text-muted-foreground">
            Press Enter on the primary button to print. You can still edit notes.
          </p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[2fr_1.2fr]">
          <section className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Seller: {sellerInfo.name} ({sellerInfo.gstNo})
                </p>
                {company && (
                  <div className="space-y-1 mt-2">
                    <p className="font-medium">Customer</p>
                    <p>{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {company.state} ({company.stateCode}) – GSTIN: {company.gstNo}
                    </p>
                  </div>
                )}
                <div className="mt-3 space-y-1">
                  <p className="font-medium">Items ({items.length})</p>
                  <ul className="text-xs space-y-1 max-h-[220px] overflow-y-auto border rounded p-2 bg-card">
                    {items.map((i) => {
                      const base = i.item.rate * i.quantity;
                      const discount = (base * i.discount) / 100;
                      const taxable = base - discount;
                      return (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span className="truncate max-w-[220px]">
                            {i.item.name} ({i.quantity} {i.item.unit} @{' '}
                            {i.item.rate.toFixed(2)})
                          </span>
                          <span className="font-mono">
                            ₹{taxable.toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Totals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable amount</span>
                  <span className="font-mono">₹{taxableTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total GST</span>
                  <span className="font-mono">₹{gstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Balance</span>
                  <span className="font-mono">₹{previousBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Payable</span>
                  <span className="font-mono font-bold text-primary">
                    ₹{totalPayable.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Notes / Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Transport Mode
                  </span>
                  <input
                    className="border rounded px-2 py-1 text-xs"
                    value={options.transportMode}
                    onChange={(e) =>
                      setOptions({ ...options, transportMode: e.target.value })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Vehicle No.
                  </span>
                  <input
                    className="border rounded px-2 py-1 text-xs uppercase"
                    value={options.vehicleNo}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        vehicleNo: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Additional Notes
                  </span>
                  <textarea
                    className="border rounded px-2 py-1 text-xs min-h-[70px] resize-none"
                    value={options.notes}
                    onChange={(e) =>
                      setOptions({ ...options, notes: e.target.value })
                    }
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <div className="space-y-0.5">
                  <p className="font-medium">Ready to print</p>
                  <p className="text-xs text-muted-foreground">
                    Press Enter on "Download PDF" to generate the invoice.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/wizard/company')}
                  >
                    Back to Customer
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={isGenerating || !company || items.length === 0}
                    autoFocus
                  >
                    {isGenerating ? 'Generating…' : 'Download PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ReviewStep;
