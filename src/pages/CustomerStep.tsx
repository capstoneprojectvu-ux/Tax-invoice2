import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Company, companies as defaultCompanies } from '@/data/mockData';
import { useInvoiceWizardStore } from '@/store/invoiceWizardStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import AddCompanyDialog from '@/components/AddCompanyDialog';

const CustomerStep = () => {
  const navigate = useNavigate();
  const { items, company, setCompany } = useInvoiceWizardStore();
  const { user } = useAuthStore();
  const [allCompanies, setAllCompanies] = useState<Company[]>(defaultCompanies);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error || !data) return;

        setAllCompanies(
          data.map((row) => ({
            id: row.id as string,
            gstNo: row.gst_no as string,
            name: row.name as string,
            address: (row.address as string) || '',
            state: (row.state as string) || '',
            stateCode: (row.state_code as string) || '',
            pendingAmount: Number(row.pending_amount || 0),
            lastTransaction: row.last_transaction as string | undefined,
            phone: (row.phone as string) || undefined,
          })),
        );
      } catch {
        // Ignore; fall back to defaults
      }
    };

    void load();
  }, [user]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/wizard/items');
    }
  }, [items.length, navigate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allCompanies;
    return allCompanies.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.gstNo.toLowerCase().includes(term),
    );
  }, [allCompanies, search]);

  const handleSelect = (c: Company) => {
    setCompany(c);
  };

  const handleAddCompanyWizard = (c: Company) => {
    // Persist to Supabase if user is logged in, otherwise only keep in memory
    if (!user) {
      setAllCompanies((prev) => [...prev, c]);
      setCompany(c);
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            gst_no: c.gstNo,
            name: c.name,
            address: c.address,
            state: c.state,
            state_code: c.stateCode,
            pending_amount: c.pendingAmount ?? 0,
            last_transaction: c.lastTransaction
              ? new Date(c.lastTransaction).toISOString()
              : null,
          })
          .select('*')
          .single();

        if (error || !data) {
          // Fallback: keep only in memory
          setAllCompanies((prev) => [...prev, c]);
          setCompany(c);
          return;
        }

        const saved: Company = {
          id: data.id as string,
          gstNo: data.gst_no as string,
          name: data.name as string,
          address: (data.address as string) || '',
          state: (data.state as string) || '',
          stateCode: (data.state_code as string) || '',
          pendingAmount: Number(data.pending_amount || 0),
          lastTransaction: data.last_transaction as string | undefined,
        };

        setAllCompanies((prev) => [...prev, saved]);
        setCompany(saved);
      } catch {
        setAllCompanies((prev) => [...prev, c]);
        setCompany(c);
      }
    })();
  };

  const goNext = () => {
    if (!company) {
      alert('Select a customer first (use arrow keys + Enter).');
      return;
    }
    navigate('/wizard/review');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">
            Invoice Wizard – Step 2 of 3: Select Customer
          </h1>
          <p className="text-xs text-muted-foreground">
            Search by name or GST number. Navigate list with keyboard.
          </p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <section className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">
                    Search Customer
                  </CardTitle>
                  <AddCompanyDialog onAddCompany={handleAddCompanyWizard} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  autoFocus
                  placeholder="Type customer name or GST number, then use ↓ / ↑ and Enter"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const first = filtered[0];
                      if (first) {
                        handleSelect(first);
                      }
                    }
                  }}
                />
                <div className="max-h-[360px] overflow-y-auto rounded border bg-card">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No matching companies.
                    </p>
                  ) : (
                    <ul className="text-sm">
                      {filtered.map((c) => (
                        <li
                          key={c.id}
                          tabIndex={0}
                          className={`px-3 py-2 border-b last:border-b-0 cursor-pointer focus:outline-none focus:bg-primary/10 hover:bg-primary/10 ${
                            company?.id === c.id ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => handleSelect(c)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSelect(c);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium truncate">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {c.address}
                              </p>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {c.gstNo}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {c.state} ({c.stateCode})
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Selected Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!company ? (
                  <p className="text-sm text-muted-foreground">
                    Select a customer from the list on the left.
                  </p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">{company.name}</p>
                    <p className="text-muted-foreground">
                      Contact:{' '}
                      <span className="font-mono text-xs">
                        {company.phone || 'N/A'}
                      </span>
                    </p>
                    <p className="text-muted-foreground">{company.address}</p>
                    <p className="text-xs text-muted-foreground">
                      Previous Balance:{' '}
                      <span className="font-mono">
                        ₹{(company.pendingAmount ?? 0).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">Items selected</p>
                  <p className="text-xs text-muted-foreground">
                    {items.length} item{items.length !== 1 ? 's' : ''} in current invoice
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/wizard/items')}
                  >
                    Back to Items
                  </Button>
                  <Button
                    type="button"
                    onClick={goNext}
                  >
                    Next: Review & Print (Step 3 of 3)
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

export default CustomerStep;

