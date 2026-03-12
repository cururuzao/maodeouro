import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import InstancesPage from "./pages/InstancesPage";
import DisparosPage from "./pages/DisparosPage";
import ConexoesPage from "./pages/ConexoesPage";
import LeadsPage from "./pages/LeadsPage";
import TemplatesPage from "./pages/TemplatesPage";
import Messages from "./pages/Messages";
import SettingsPage from "./pages/SettingsPage";
import ConectarPage from "./pages/ConectarPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import AdminPage from "./pages/AdminPage";
import PublicConnectPage from "./pages/PublicConnectPage";
import VipConnectPage from "./pages/VipConnectPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/connect" element={<PublicConnectPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/instances" element={<ProtectedRoute><InstancesPage /></ProtectedRoute>} />
            <Route path="/disparos" element={<ProtectedRoute><DisparosPage /></ProtectedRoute>} />
            <Route path="/conexoes" element={<ProtectedRoute><ConexoesPage /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/conectar" element={<ProtectedRoute><ConectarPage /></ProtectedRoute>} />
            <Route path="/transacoes" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
            <Route path="/integracoes" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
            <Route path="/ferramentas" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
