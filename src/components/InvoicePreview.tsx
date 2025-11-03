import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/currency";

interface InvoicePreviewProps {
  invoice: any;
  lineItems: any[];
  companySettings: any;
  onBack: () => void;
}

export const InvoicePreview = ({ invoice, lineItems, companySettings, onBack }: InvoicePreviewProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${invoice.invoice_type === "quote" ? "Quote" : invoice.invoice_type === "proforma" ? "Proforma-Invoice" : "Invoice"}-${invoice.invoice_number}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Invoice Preview */}
        <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
          <div ref={printRef} className="p-16" style={{ width: "210mm", minHeight: "297mm" }}>
            {/* Header with company info on left, invoice details on right */}
            <div className="flex justify-between mb-12">
              {/* Left side - Company info */}
              <div className="flex-1">
                {companySettings?.logo_url && (
                  <img 
                    src={companySettings.logo_url} 
                    alt="Company logo" 
                    className="h-16 mb-4 object-contain" 
                  />
                )}
                <div className="text-gray-600">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill From</h2>
                  {companySettings && (
                    <>
                      <p className="font-semibold text-lg text-gray-900">{companySettings.company_name}</p>
                      {companySettings.company_email && <p>{companySettings.company_email}</p>}
                      {companySettings.company_phone && <p>{companySettings.company_phone}</p>}
                      {companySettings.company_address && <p className="whitespace-pre-line">{companySettings.company_address}</p>}
                      {companySettings.gst_number && <p>GST: {companySettings.gst_number}</p>}
                      {companySettings.pan_number && <p>PAN: {companySettings.pan_number}</p>}
                    </>
                  )}
                </div>
              </div>
              
              {/* Right side - Invoice details */}
              <div className="text-right">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                  {invoice.invoice_type === "quote" ? "QUOTE" : invoice.invoice_type === "proforma" ? "PROFORMA INVOICE" : "INVOICE"}
                </h1>
                <p className="text-3xl font-bold text-blue-600 mb-2">#{invoice.invoice_number}</p>
                <div className="text-gray-600 space-y-1">
                  <p><span className="font-semibold">Date:</span> {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}</p>
                  {invoice.due_date && (
                    <p><span className="font-semibold">Due:</span> {format(new Date(invoice.due_date), "MMM dd, yyyy")}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill To</h2>
              <div className="text-gray-900">
                <p className="font-semibold text-lg">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-gray-600">{invoice.client_email}</p>}
                {invoice.client_address && <p className="text-gray-600 whitespace-pre-line">{invoice.client_address}</p>}
                {invoice.client_gst_number && <p className="text-gray-600">GST: {invoice.client_gst_number}</p>}
                {invoice.client_pan_number && <p className="text-gray-600">PAN: {invoice.client_pan_number}</p>}
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-3 text-sm font-semibold text-gray-700 uppercase">Description</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-24">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-32">Rate</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-4 text-gray-900">{item.description}</td>
                    <td className="py-4 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-4 text-right text-gray-700">{getCurrencySymbol(invoice.currency)}{item.rate.toFixed(2)}</td>
                    <td className="py-4 text-right font-semibold text-gray-900">{getCurrencySymbol(invoice.currency)}{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12">
              <div className="w-80">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{getCurrencySymbol(invoice.currency)}{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.gst_enabled && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-700">GST ({invoice.gst_rate}%):</span>
                    <span className="font-semibold text-gray-900">{getCurrencySymbol(invoice.currency)}{invoice.gst_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-4 border-t-2 border-gray-900">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">{getCurrencySymbol(invoice.currency)}{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Terms & Notes */}
            <div className="space-y-6">
              {companySettings?.bank_name && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bank Details</h3>
                  <div className="text-gray-700">
                    <p><span className="font-semibold">Bank:</span> {companySettings.bank_name}</p>
                    {companySettings.account_number && <p><span className="font-semibold">Account:</span> {companySettings.account_number}</p>}
                    {companySettings.ifsc_code && <p><span className="font-semibold">IFSC:</span> {companySettings.ifsc_code}</p>}
                  </div>
                </div>
              )}
              {invoice.payment_terms && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Payment Terms</h3>
                  <p className="text-gray-700">{invoice.payment_terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
