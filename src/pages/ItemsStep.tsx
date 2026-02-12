import { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceItem, InventoryItem, inventoryItems } from '@/data/mockData';
import { useInvoiceWizardStore } from '@/store/invoiceWizardStore';
import AddInventoryItemDialog from '@/components/AddInventoryItemDialog';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

const ItemsStep = () => {
  const navigate = useNavigate();
  const { items, setItems, reset } = useInvoiceWizardStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryItems);

  // Start fresh when entering the wizard
  useEffect(() => {
    if (items.length === 0) {
      reset();
    }
  }, [items.length, reset]);

  // Load inventory items from Supabase for this user so new items persist across browsers
  useEffect(() => {
    const loadInventory = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading inventory items for wizard:', error);
          return;
        }

        if (data && data.length > 0) {
          const mapped: InventoryItem[] = data.map((row: any) => ({
            id: row.id as string,
            name: row.name as string,
            hsn: row.hsn as string,
            rate: Number(row.rate || 0),
            stock: Number(row.stock || 0),
            unit: row.unit as string,
            gstRate: Number(row.gst_rate || 0),
          }));
          setInventory(mapped);
        }
      } catch (err) {
        console.error('Unexpected error loading inventory items for wizard:', err);
      }
    };

    void loadInventory();
  }, [user]);

  const handleAddItem = useCallback(
    (item: InventoryItem, focusQuantity: boolean = false) => {
      const existing = items.find((i) => i.item.id === item.id);

      if (existing) {
        const nextItems = items.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
        setItems(nextItems);
      } else {
        const newId = `wizard-${Date.now()}`;
        // Clone inventory item so we can override rate per invoice line
        const itemCopy: InventoryItem = { ...item, rate: 0 };
        const newItem: InvoiceItem = {
          id: newId,
          item: itemCopy,
          quantity: 1,
          discount: 0,
        };
        setItems([...items, newItem]);

        if (focusQuantity) {
          // Focus the quantity field for this new row after render
          setTimeout(() => {
            const el = document.querySelector<HTMLInputElement>(
              `[data-qty-for="${newId}"]`,
            );
            el?.focus();
            el?.select();
          }, 0);
        }
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

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventory;
    return inventory.filter(
      (it) =>
        it.name.toLowerCase().includes(term) ||
        it.hsn.toLowerCase().includes(term),
    );
  }, [inventory, search]);

  const handleCreateInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    // If not logged in for some reason, keep items only in this session
    if (!user) {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        ...item,
      };
      setInventory((prev) => [...prev, newItem]);
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .insert({
            user_id: user.id,
            name: item.name,
            hsn: item.hsn,
            rate: item.rate,
            stock: item.stock,
            unit: item.unit,
            gst_rate: item.gstRate,
          })
          .select('*')
          .single();

        if (error || !data) {
          console.error('Error saving inventory item for wizard:', error);
          // Fallback: store locally only
          const newItem: InventoryItem = {
            id: `inv-${Date.now()}`,
            ...item,
          };
          setInventory((prev) => [...prev, newItem]);
          return;
        }

        const saved: InventoryItem = {
          id: data.id as string,
          name: data.name as string,
          hsn: data.hsn as string,
          rate: Number(data.rate || 0),
          stock: Number(data.stock || 0),
          unit: data.unit as string,
          gstRate: Number(data.gst_rate || 0),
        };

        setInventory((prev) => [...prev, saved]);
      } catch (err) {
        console.error('Unexpected error saving inventory item for wizard:', err);
        const fallback: InventoryItem = {
          id: `inv-${Date.now()}`,
          ...item,
        };
        setInventory((prev) => [...prev, fallback]);
      }
    })();
  };

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
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">
                    Search & add items
                  </CardTitle>
                  <AddInventoryItemDialog onAddItem={handleCreateInventoryItem} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  id="item-search"
                  autoFocus
                  placeholder="Type item name, press Enter to add first match"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      goNext();
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const first = filteredItems[0];
                      if (first) {
                        handleAddItem(first, true);
                      }
                    }
                  }}
                />
                <div className="max-h-[420px] overflow-y-auto border rounded bg-card">
                  {filteredItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No matching items.
                    </p>
                  ) : (
                    <ul className="text-xs">
                      {filteredItems.map((item) => (
                        <li
                          key={item.id}
                          tabIndex={0}
                          className="px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-primary/10 focus:outline-none focus:bg-primary/10"
                          onClick={() => handleAddItem(item, true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItem(item, true);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                HSN: {item.hsn}
                              </p>
                            </div>
                            <div className="text-right text-[11px] text-muted-foreground font-mono">
                              <div>
                                {item.rate.toFixed(2)}/{item.unit}
                              </div>
                              <div>GST {item.gstRate}%</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
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
                                  data-qty-for={row.id}
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
                                      return;
                                    }
                                    if (e.key === 'Enter' && e.shiftKey) {
                                      e.preventDefault();
                                      goNext();
                                      return;
                                    }
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const rateEl =
                                        document.querySelector<HTMLInputElement>(
                                          `[data-rate-for="${row.id}"]`,
                                        );
                                      rateEl?.focus();
                                      rateEl?.select();
                                    }
                                  }}
                                />
                              </td>
                              <td className="py-1 text-right align-middle">
                                <input
                                  className="w-20 border rounded px-1 py-0.5 text-right text-xs font-mono"
                                  type="number"
                                  min={0}
                                  data-rate-for={row.id}
                                  value={
                                    Number.isNaN(row.item.rate)
                                      ? ''
                                      : row.item.rate
                                  }
                                  onChange={(e) => {
                                    const nextRate = parseFloat(e.target.value);
                                    setItems(
                                      items.map((i) =>
                                        i.id === row.id
                                          ? {
                                              ...i,
                                              item: {
                                                ...i.item,
                                                rate: Number.isNaN(nextRate)
                                                  ? 0
                                                  : nextRate,
                                              },
                                            }
                                          : i,
                                      ),
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.shiftKey) {
                                      e.preventDefault();
                                      goNext();
                                      return;
                                    }
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const searchEl =
                                        document.getElementById('item-search');
                                      searchEl?.focus();
                                      (searchEl as HTMLInputElement | null)?.select?.();
                                    }
                                  }}
                                />
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

