import { useEffect, useState } from "react";
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
  const [invoiceType, setInvoiceType] = useState<"invoice" | "quote">("invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(10);
  const [paymentTerms, setPaymentTerms] = useState("Due within 30 days");
  const [notes, setNotes] = useState("");
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanySettings();
    if (invoiceId) {
      loadInvoice();
    } else {
      generateInvoiceNumber();
    }
  }, [invoiceId]);

  const loadCompanySettings = async () => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    if (data) {
      setCompanySettings(data);
      setGstEnabled(data.gst_enabled);
      setGstRate(data.gst_rate);
      setPaymentTerms(data.default_payment_terms);
    }
  };

  const generateInvoiceNumber = async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("next_invoice_number")
      .single();

    if (data) {
      setInvoiceNumber(`INV-${String(data.next_invoice_number).padStart(4, "0")}`);
    }
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
      setInvoiceType(invoice.invoice_type as "invoice" | "quote");
      setInvoiceNumber(invoice.invoice_number);
      setInvoiceDate(invoice.invoice_date);
      setDueDate(invoice.due_date || "");
      setStatus(invoice.status);
      setClientName(invoice.client_name);
      setClientEmail(invoice.client_email || "");
      setClientAddress(invoice.client_address || "");
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

        // Update next invoice number
        if (companySettings) {
          await supabase
            .from("company_settings")
            .update({ next_invoice_number: companySettings.next_invoice_number + 1 })
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

      onBack();
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
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Preview & Export PDF
            </Button>
            <Button onClick={saveInvoice} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
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
                  <Select value={invoiceType} onValueChange={(val) => setInvoiceType(val as "invoice" | "quote")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
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
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
              <div>
                <Label>Client Name *</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Company or individual name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
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
                      <Label>Rate ($)</Label>
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
                      <Input value={`$${item.amount.toFixed(2)}`} disabled />
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
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                    <span>GST ({gstRate}%):</span>
                  </div>
                  <span className="font-semibold">${calculateGst().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">${calculateTotal().toFixed(2)}</span>
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
                <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
