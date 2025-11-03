import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/currency";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  client_name: string;
  total: number;
  status: string;
  currency: string;
}

interface InvoiceListProps {
  onCreateInvoice: () => void;
  onEditInvoice: (id: string) => void;
  onViewSettings: () => void;
}

export const InvoiceList = ({ onCreateInvoice, onEditInvoice, onViewSettings }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [proformas, setProformas] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const allInvoices = data || [];
      setInvoices(allInvoices.filter(inv => inv.invoice_type === "invoice"));
      setQuotations(allInvoices.filter(inv => inv.invoice_type === "quote"));
      setProformas(allInvoices.filter(inv => inv.invoice_type === "proforma"));
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-accent text-accent-foreground";
      case "sent":
        return "bg-primary text-primary-foreground";
      case "overdue":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Invoice Manager</h1>
            <p className="text-muted-foreground">Create and manage your invoices and quotes</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onViewSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button onClick={onCreateInvoice}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : invoices.length === 0 && quotations.length === 0 && proformas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No invoices or quotes yet</h3>
              <p className="text-muted-foreground mb-6">Create your first document to get started</p>
              <Button onClick={onCreateInvoice}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Invoices Section */}
            {invoices.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Invoices</h2>
                <div className="grid gap-4">
                  {invoices.map((invoice) => (
                    <Card
                      key={invoice.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => onEditInvoice(invoice.id)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl mb-2">
                              Invoice #{invoice.invoice_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {invoice.client_name} • {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              {getCurrencySymbol(invoice.currency)}{invoice.total.toFixed(2)}
                            </p>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Quotations Section */}
            {quotations.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Quotations</h2>
                <div className="grid gap-4">
                  {quotations.map((quote) => (
                    <Card
                      key={quote.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => onEditInvoice(quote.id)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl mb-2">
                              Quote #{quote.invoice_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {quote.client_name} • {format(new Date(quote.invoice_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              {getCurrencySymbol(quote.currency)}{quote.total.toFixed(2)}
                            </p>
                            <Badge className={getStatusColor(quote.status)}>
                              {quote.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Proforma Invoices Section */}
            {proformas.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Proforma Invoices</h2>
                <div className="grid gap-4">
                  {proformas.map((proforma) => (
                    <Card
                      key={proforma.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => onEditInvoice(proforma.id)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl mb-2">
                              Proforma Invoice #{proforma.invoice_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {proforma.client_name} • {format(new Date(proforma.invoice_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              {getCurrencySymbol(proforma.currency)}{proforma.total.toFixed(2)}
                            </p>
                            <Badge className={getStatusColor(proforma.status)}>
                              {proforma.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
