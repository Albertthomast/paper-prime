import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  client_name: string;
  total: number;
  status: string;
}

interface InvoiceListProps {
  onCreateInvoice: () => void;
  onEditInvoice: (id: string) => void;
  onViewSettings: () => void;
}

export const InvoiceList = ({ onCreateInvoice, onEditInvoice, onViewSettings }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      setInvoices(data || []);
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
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
              <p className="text-muted-foreground mb-6">Create your first invoice to get started</p>
              <Button onClick={onCreateInvoice}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                        {invoice.invoice_type === "quote" ? "Quote" : "Invoice"} #{invoice.invoice_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {invoice.client_name} • {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        ${invoice.total.toFixed(2)}
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
        )}
      </div>
    </div>
  );
};
