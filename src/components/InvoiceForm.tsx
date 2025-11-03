import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { InvoicePreview } from "./InvoicePreview";
import { currencies, getCurrencySymbol } from "@/lib/currency";
import { format } from "date-fns";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormProps {
  invoiceId?: string;
  onBack: () => void;
}

export const InvoiceForm = ({ invoiceId, onBack }: InvoiceFormProps) => {
  const [invoiceType, setInvoiceType] = useState<"invoice" | "quote" | "proforma">("invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstNumber, setClientGstNumber] = useState("");
  const [clientPanNumber, setClientPanNumber] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(10);
  const [paymentTerms, setPaymentTerms] = useState("Due within 30 days");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadCompanySettings();
    loadClients();
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId && companySettings) {
      generateInvoiceNumber();
    }
  }, [invoiceType, companySettings]);

  // Auto-save functionality
  useEffect(() => {
    if (hasChanges && invoiceId) {
      const timer = setTimeout(() => {
        autoSave();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasChanges, invoiceId, clientName, lineItems, status, invoiceDate, dueDate, currency, notes, paymentTerms]);

  const loadCompanySettings = async () => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    if (data) {
      setCompanySettings(data);
      setCurrency(data.currency || "USD");
      setGstEnabled(data.gst_enabled);
      setGstRate(data.gst_rate);
      setPaymentTerms(data.default_payment_terms);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (data) {
      setClients(data);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientEmail(client.email || "");
      setClientAddress(client.address || "");
      setClientGstNumber(client.gst_number || "");
      setClientPanNumber(client.pan_number || "");
      setHasChanges(true);
    }
  };

  const generateInvoiceNumber = async () => {
    if (!companySettings) return;
    
    let prefix = "INV";
    let number = companySettings.next_invoice_number;
    
    if (invoiceType === "quote") {
      prefix = "EQ";
      number = companySettings.next_quotation_number;
    } else if (invoiceType === "proforma") {
      prefix = "PI";
      number = companySettings.next_proforma_number;
    }
    
    const dateStr = format(new Date(), "yyMMdd");
    
    setInvoiceNumber(`${prefix}${String(number).padStart(4, "0")}${dateStr}`);
  };

  const loadInvoice = async () => {
    if (!invoiceId) return;

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*, line_items(*)")
      .eq("id", invoiceId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice",
        variant: "destructive",
      });
      return;
    }

    if (invoice) {
      setInvoiceType(invoice.invoice_type as "invoice" | "quote" | "proforma");
      setInvoiceNumber(invoice.invoice_number);
      setInvoiceDate(invoice.invoice_date);
      setDueDate(invoice.due_date || "");
      setStatus(invoice.status);
      setClientName(invoice.client_name);
      setClientEmail(invoice.client_email || "");
      setClientAddress(invoice.client_address || "");
      setClientGstNumber(invoice.client_gst_number || "");
      setClientPanNumber(invoice.client_pan_number || "");
      setCurrency(invoice.currency || "USD");
      setGstEnabled(invoice.gst_enabled);
      setPaymentTerms(invoice.payment_terms || "");
      setNotes(invoice.notes || "");
      setLineItems(invoice.line_items || [{ description: "", quantity: 1, rate: 0, amount: 0 }]);
    }
  };

  const calculateLineItem = (quantity: number, rate: number) => quantity * rate;

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      updated[index].amount = calculateLineItem(
        updated[index].quantity,
        updated[index].rate
      );
    }
    
    setLineItems(updated);
    setHasChanges(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateGst = () => {
    return gstEnabled ? (calculateSubtotal() * gstRate) / 100 : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGst();
  };

  const autoSave = useCallback(async () => {
    if (!invoiceId || !clientName) return;

    try {
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        status,
        client_name: clientName,
        client_email: clientEmail,
        client_address: clientAddress,
        client_gst_number: clientGstNumber,
        client_pan_number: clientPanNumber,
        currency: currency,
        subtotal: calculateSubtotal(),
        gst_enabled: gstEnabled,
        gst_amount: calculateGst(),
        total: calculateTotal(),
        payment_terms: paymentTerms,
        notes,
      };

      await supabase
        .from("invoices")
        .update(invoiceData)
        .eq("id", invoiceId);

      await supabase.from("line_items").delete().eq("invoice_id", invoiceId);

      const lineItemsData = lineItems.map((item, index) => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        sort_order: index,
      }));

      await supabase.from("line_items").insert(lineItemsData);

      setHasChanges(false);
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  }, [invoiceId, clientName, invoiceNumber, invoiceType, invoiceDate, dueDate, status, clientEmail, clientAddress, clientGstNumber, clientPanNumber, currency, gstEnabled, paymentTerms, notes, lineItems]);

  const deleteInvoice = async () => {
    if (!invoiceId) return;

    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      await supabase.from("line_items").delete().eq("invoice_id", invoiceId);
      await supabase.from("invoices").delete().eq("id", invoiceId);

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      onBack();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const saveInvoice = async () => {
    if (!clientName) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        status,
        client_name: clientName,
        client_email: clientEmail,
        client_address: clientAddress,
        client_gst_number: clientGstNumber,
        client_pan_number: clientPanNumber,
        currency: currency,
        subtotal: calculateSubtotal(),
        gst_enabled: gstEnabled,
        gst_amount: calculateGst(),
        total: calculateTotal(),
        payment_terms: paymentTerms,
        notes,
      };

      let savedInvoiceId = invoiceId;

      if (invoiceId) {
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoiceId);

        if (error) throw error;

        // Delete existing line items
        await supabase.from("line_items").delete().eq("invoice_id", invoiceId);
      } else {
        const { data, error } = await supabase
          .from("invoices")
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        savedInvoiceId = data.id;

        // Update next invoice/quotation/proforma number
        if (companySettings) {
          let updateField = {};
          if (invoiceType === "invoice") {
            updateField = { next_invoice_number: companySettings.next_invoice_number + 1 };
          } else if (invoiceType === "quote") {
            updateField = { next_quotation_number: companySettings.next_quotation_number + 1 };
          } else if (invoiceType === "proforma") {
            updateField = { next_proforma_number: companySettings.next_proforma_number + 1 };
          }
          
          await supabase
            .from("company_settings")
            .update(updateField)
            .eq("id", companySettings.id);
        }
      }

      // Insert line items
      const lineItemsData = lineItems.map((item, index) => ({
        invoice_id: savedInvoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from("line_items")
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      toast({
        title: "Success",
        description: invoiceId ? "Invoice updated successfully" : "Invoice created successfully",
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (showPreview) {
    return (
      <InvoicePreview
        invoice={{
          invoice_number: invoiceNumber,
          invoice_type: invoiceType,
          invoice_date: invoiceDate,
          due_date: dueDate,
          status,
          client_name: clientName,
          client_email: clientEmail,
          client_address: clientAddress,
          client_gst_number: clientGstNumber,
          client_pan_number: clientPanNumber,
          currency: currency,
          subtotal: calculateSubtotal(),
          gst_enabled: gstEnabled,
          gst_amount: calculateGst(),
          gst_rate: gstRate,
          total: calculateTotal(),
          payment_terms: paymentTerms,
          notes,
        }}
        lineItems={lineItems}
        companySettings={companySettings}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          <div className="flex gap-3">
            {invoiceId && (
              <Button variant="destructive" onClick={deleteInvoice}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={async () => {
              if (!invoiceId && clientName) {
                await saveInvoice();
              } else if (invoiceId && hasChanges) {
                await autoSave();
              }
              setShowPreview(true);
            }}>
              <FileDown className="mr-2 h-4 w-4" />
              Preview & Export PDF
            </Button>
            <Button onClick={saveInvoice} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : invoiceId ? "Save" : "Create"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={invoiceType} onValueChange={(val) => {
                    setInvoiceType(val as "invoice" | "quote" | "proforma");
                    setHasChanges(true);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="proforma">Proforma Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(val) => {
                    setStatus(val);
                    setHasChanges(true);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input value={invoiceNumber} onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setHasChanges(true);
                  }} />
                </div>
                <div>
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => {
                    setInvoiceDate(e.target.value);
                    setHasChanges(true);
                  }} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => {
                    setDueDate(e.target.value);
                    setHasChanges(true);
                  }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {clients.length > 0 && (
                <div>
                  <Label>Select Saved Client</Label>
                  <Select value={selectedClientId} onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client or enter manually" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label>Client Name *</Label>
                <Input 
                  value={clientName} 
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setHasChanges(true);
                  }} 
                  placeholder="Company or individual name" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    value={clientEmail} 
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setHasChanges(true);
                    }} 
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input 
                    value={clientAddress} 
                    onChange={(e) => {
                      setClientAddress(e.target.value);
                      setHasChanges(true);
                    }} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GST Number</Label>
                  <Input 
                    value={clientGstNumber} 
                    onChange={(e) => {
                      setClientGstNumber(e.target.value);
                      setHasChanges(true);
                    }} 
                    placeholder="e.g., 22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input 
                    value={clientPanNumber} 
                    onChange={(e) => {
                      setClientPanNumber(e.target.value);
                      setHasChanges(true);
                    }} 
                    placeholder="e.g., AAAAA0000A"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Line Items</CardTitle>
                <Button size="sm" onClick={addLineItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Rate ({getCurrencySymbol(currency)})</Label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Amount</Label>
                      <Input value={`${getCurrencySymbol(currency)}${item.amount.toFixed(2)}`} disabled />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Currency:</span>
                  <Select value={currency} onValueChange={(val) => {
                    setCurrency(val);
                    setHasChanges(true);
                  }}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{getCurrencySymbol(currency)}{calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Switch checked={gstEnabled} onCheckedChange={(val) => {
                      setGstEnabled(val);
                      setHasChanges(true);
                    }} />
                    <span>GST ({gstRate}%):</span>
                  </div>
                  <span className="font-semibold">{getCurrencySymbol(currency)}{calculateGst().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{getCurrencySymbol(currency)}{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label>Payment Terms</Label>
                <Input value={paymentTerms} onChange={(e) => {
                  setPaymentTerms(e.target.value);
                  setHasChanges(true);
                }} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Additional notes or terms..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
