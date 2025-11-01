import { useState } from "react";
import { InvoiceList } from "@/components/InvoiceList";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Settings } from "@/components/Settings";

type View = "list" | "form" | "settings";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("list");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | undefined>();

  const handleCreateInvoice = () => {
    setEditingInvoiceId(undefined);
    setCurrentView("form");
  };

  const handleEditInvoice = (id: string) => {
    setEditingInvoiceId(id);
    setCurrentView("form");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setEditingInvoiceId(undefined);
  };

  const handleViewSettings = () => {
    setCurrentView("settings");
  };

  return (
    <>
      {currentView === "list" && (
        <InvoiceList
          onCreateInvoice={handleCreateInvoice}
          onEditInvoice={handleEditInvoice}
          onViewSettings={handleViewSettings}
        />
      )}
      {currentView === "form" && (
        <InvoiceForm invoiceId={editingInvoiceId} onBack={handleBackToList} />
      )}
      {currentView === "settings" && <Settings onBack={handleBackToList} />}
    </>
  );
};

export default Index;
