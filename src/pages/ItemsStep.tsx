import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryList from '@/components/InventoryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceItem, InventoryItem, inventoryItems } from '@/data/mockData';
import { useInvoiceWizardStore } from '@/store/invoiceWizardStore';

const ItemsStep = () => {
  const navigate = useNavigate();
  const { items, setItems, reset } = useInvoiceWizardStore();

  // Start fresh when entering the wizard
  useEffect(() => {
    if (items.length === 0) {
      reset();
    }
  }, [items.length, reset]);

  const handleAddItem = useCallback(
    (item: InventoryItem) => {
      const existing = items.find((i) => i.item.id === item.id);

      if (existing) {
        const nextItems = items.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
        setItems(nextItems);
      } else {
        const newItem: InvoiceItem = {
          id: `wizard-${Date.now()}`,
          item,
          quantity: 1,
          discount: 0,
        };
        setItems([...items, newItem]);
      }
    },
    [items, setItems],
  );

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0 || Number.isNaN(quantity)) quantity = 1;
    setItems(
      items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const goNext = () => {
    if (items.length === 0) {
      // Require at least one item before proceeding
      alert('Add at least one item before continuing (use search and Enter).');
      return;
    }
    navigate('/wizard/company');
  };

  const totalAmount = items.reduce((sum, i) => {
    const base = i.item.rate * i.quantity;
    return sum + base;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">
            Invoice Wizard – Step 1 of 3: Add Items
          </h1>
          <p className="text-xs text-muted-foreground">
            Use Tab / Shift+Tab and Enter. Mouse only for rare actions.
          </p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <InventoryList items={inventoryItems} onAddItem={handleAddItem} />
          </aside>

          <section className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Selected Items (no GST / discount here)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Search on the left, then press Enter on an item row to add it.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-1 text-left font-medium">Item</th>
                          <th className="py-1 text-center font-medium">Qty</th>
                          <th className="py-1 text-right font-medium">Rate</th>
                          <th className="py-1 text-right font-medium">Amount</th>
                          <th className="py-1" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((row) => {
                          const amount = row.item.rate * row.quantity;
                          return (
                            <tr key={row.id}>
                              <td className="py-1 pr-2">
                                <div className="truncate max-w-[220px]">
                                  <span className="font-medium">{row.item.name}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  HSN: {row.item.hsn}
                                </div>
                              </td>
                              <td className="py-1 text-center align-middle">
                                <input
                                  className="w-16 border rounded px-1 py-0.5 text-center text-xs font-mono"
                                  type="number"
                                  min={1}
                                  value={row.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(
                                      row.id,
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Delete') {
                                      e.preventDefault();
                                      handleRemoveItem(row.id);
                                    }
                                  }}
                                />
                              </td>
                              <td className="py-1 text-right font-mono">
                                {row.item.rate.toFixed(2)}
                              </td>
                              <td className="py-1 text-right font-mono">
                                {amount.toFixed(2)}
                              </td>
                              <td className="py-1 pl-2 text-right">
                                <button
                                  type="button"
                                  className="text-[11px] text-destructive underline-offset-2 hover:underline"
                                  onClick={() => handleRemoveItem(row.id)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Items count:</span>{' '}
                    <span className="font-mono">{items.length}</span>
                  </p>
                  <p>
                    <span className="font-medium">Total (before GST):</span>{' '}
                    <span className="font-mono">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                  >
                    Clear Items
                  </Button>
                  <Button
                    type="button"
                    onClick={goNext}
                  >
                    Next: Customer (Step 2 of 3)
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

export default ItemsStep;

