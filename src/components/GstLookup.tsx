import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Company } from '@/data/mockData';
import { Building2, Search, AlertCircle, CheckCircle, Clock, IndianRupee } from 'lucide-react';

interface GstLookupProps {
  selectedCompany: Company | null;
  onSelectCompany: (company: Company | null) => void;
  companies: Company[];
}

const GstLookup = ({ selectedCompany, onSelectCompany, companies }: GstLookupProps) => {
  const [gstNo, setGstNo] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const validateGstFormat = (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  const handleSearch = () => {
    const formattedGst = gstNo.toUpperCase().trim();
    setError('');
    
    if (!formattedGst) {
      setError('Please enter a GST number');
      return;
    }

    if (!validateGstFormat(formattedGst)) {
      setError('Invalid GST format. Please check and try again.');
      return;
    }

    setIsSearching(true);

    // Simulate API call
    setTimeout(() => {
      const company = companies.find((c) => c.gstNo === formattedGst);

      if (company) {
        onSelectCompany(company);
      } else {
        setError('Company not found. Please verify the GST number.');
        onSelectCompany(null);
      }

      setIsSearching(false);
    }, 500);
  };

  const handleClear = () => {
    setGstNo('');
    setError('');
    onSelectCompany(null);
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5 text-primary" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Enter GST Number (e.g., 27AABCU9603R1ZM)"
              value={gstNo}
              onChange={(e) => {
                setGstNo(e.target.value.toUpperCase());
                setError('');
              }}
              className="font-mono uppercase"
              maxLength={15}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            <Search className="h-4 w-4 mr-1" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          {selectedCompany && (
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {selectedCompany && (
          <div className="rounded-lg border bg-secondary/30 p-4 space-y-3 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{selectedCompany.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedCompany.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCompany.state} ({selectedCompany.stateCode})
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                <CheckCircle className="h-3 w-3 mr-1 text-success" />
                Verified
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 pt-2 border-t">
              {selectedCompany.pendingAmount > 0 ? (
                <div className="flex items-center gap-2 text-warning">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Pending: ₹{selectedCompany.pendingAmount.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No pending dues</span>
                </div>
              )}
              
              {selectedCompany.lastTransaction && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Last: {new Date(selectedCompany.lastTransaction).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Sample GST Numbers for testing:</p>
          {companies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {companies.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setGstNo(c.gstNo);
                    setError('');
                  }}
                  className="font-mono text-primary hover:underline"
                >
                  {c.gstNo}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GstLookup;
