import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import InstancesPage from "./pages/InstancesPage";
import DisparosPage from "./pages/DisparosPage";
import ConexoesPage from "./pages/ConexoesPage";
import LeadsPage from "./pages/LeadsPage";
import TemplatesPage from "./pages/TemplatesPage";
import Messages from "./pages/Messages";
import SettingsPage from "./pages/SettingsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/instances" element={<InstancesPage />} />
          <Route path="/disparos" element={<DisparosPage />} />
          <Route path="/conexoes" element={<ConexoesPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/transacoes" element={<PlaceholderPage />} />
          <Route path="/integracoes" element={<PlaceholderPage />} />
          <Route path="/ferramentas" element={<PlaceholderPage />} />
          <Route path="/admin" element={<PlaceholderPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
