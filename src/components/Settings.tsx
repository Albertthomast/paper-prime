import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Upload, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { currencies } from "@/lib/currency";

interface SettingsProps {
  onBack: () => void;
}

export const Settings = ({ onBack }: SettingsProps) => {
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGstNumber, setCompanyGstNumber] = useState("");
  const [companyPanNumber, setCompanyPanNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState(10);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("Due within 30 days");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientGstNumber, setNewClientGstNumber] = useState("");
  const [newClientPanNumber, setNewClientPanNumber] = useState("");
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    loadSettings();
    loadClients();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .single();

    if (data) {
      setSettingsId(data.id);
      setCompanyName(data.company_name);
      setCompanyEmail(data.company_email || "");
      setCompanyPhone(data.company_phone || "");
      setCompanyAddress(data.company_address || "");
      setCompanyGstNumber(data.gst_number || "");
      setCompanyPanNumber(data.pan_number || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setBankName(data.bank_name || "");
      setCurrency(data.currency || "USD");
      setLogoUrl(data.logo_url);
      setGstEnabled(data.gst_enabled);
      setGstRate(data.gst_rate);
      setDefaultPaymentTerms(data.default_payment_terms);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  const addClient = async () => {
    if (!newClientName) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: newClientName,
          email: newClientEmail,
          phone: newClientPhone,
          address: newClientAddress,
          gst_number: newClientGstNumber,
          pan_number: newClientPanNumber,
        })
        .select()
        .single();

      if (error) throw error;

      setClients([...clients, data]);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientAddress("");
      setNewClientGstNumber("");
      setNewClientPanNumber("");
      setAddingClient(false);

      toast({
        title: "Success",
        description: "Client added successfully",
      });
    } catch (error) {
      console.error("Error adding client:", error);
      toast({
        title: "Error",
        description: "Failed to add client",
        variant: "destructive",
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setClients(clients.filter((c) => c.id !== id));
      
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    if (!companyName) {
      toast({
        title: "Validation Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const settingsData = {
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_address: companyAddress,
        gst_number: companyGstNumber,
        pan_number: companyPanNumber,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        bank_name: bankName,
        currency: currency,
        logo_url: logoUrl,
        gst_enabled: gstEnabled,
        gst_rate: gstRate,
        default_payment_terms: defaultPaymentTerms,
      };

      const { error } = await supabase
        .from("company_settings")
        .update(settingsData)
        .eq("id", settingsId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="company@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="123 Business St, City, State, ZIP"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GST Number</Label>
                  <Input
                    value={companyGstNumber}
                    onChange={(e) => setCompanyGstNumber(e.target.value)}
                    placeholder="e.g., 22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input
                    value={companyPanNumber}
                    onChange={(e) => setCompanyPanNumber(e.target.value)}
                    placeholder="e.g., AAAAA0000A"
                  />
                </div>
              </div>
              
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Company Logo</Label>
                {logoUrl ? (
                  <div className="space-y-2">
                    <img src={logoUrl} alt="Company logo" className="h-20 object-contain" />
                    <Button variant="outline" size="sm" onClick={removeLogo}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {uploading ? "Uploading..." : "Upload PNG, JPG, or WEBP"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable GST</Label>
                  <p className="text-sm text-muted-foreground">Apply GST to invoices by default</p>
                </div>
                <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
              </div>
              
              {gstEnabled && (
                <div>
                  <Label>GST Rate (%)</Label>
                  <Input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <Label>Default Payment Terms</Label>
                <Input
                  value={defaultPaymentTerms}
                  onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                  placeholder="Due within 30 days"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., State Bank of India"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g., 1234567890"
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="e.g., SBIN0001234"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clients Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Saved Clients</CardTitle>
                <Button size="sm" onClick={() => setAddingClient(!addingClient)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {addingClient && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div>
                      <Label>Client Name *</Label>
                      <Input
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Company or individual name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Textarea
                        value={newClientAddress}
                        onChange={(e) => setNewClientAddress(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>GST Number</Label>
                        <Input
                          value={newClientGstNumber}
                          onChange={(e) => setNewClientGstNumber(e.target.value)}
                          placeholder="e.g., 22AAAAA0000A1Z5"
                        />
                      </div>
                      <div>
                        <Label>PAN Number</Label>
                        <Input
                          value={newClientPanNumber}
                          onChange={(e) => setNewClientPanNumber(e.target.value)}
                          placeholder="e.g., AAAAA0000A"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addClient} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Save Client
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setAddingClient(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved clients yet</p>
                ) : (
                  clients.map((client) => (
                    <div key={client.id} className="flex justify-between items-start p-3 border rounded">
                      <div>
                        <p className="font-semibold">{client.name}</p>
                        {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                        {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteClient(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
