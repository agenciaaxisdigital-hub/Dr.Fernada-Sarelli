import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import TrackingProvider from "@/components/TrackingProvider";
import Index from "./pages/Index";
import Sobre from "./pages/Sobre";
import Agenda from "./pages/Agenda";
import RedesSociais from "./pages/RedesSociais";
import Integracao from "./pages/Integracao";
import Contato from "./pages/Contato";
import AdminLoginPage from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Gallery from "./pages/admin/Gallery";
import Forms from "./pages/admin/Forms";
import SettingsPage from "./pages/admin/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TrackingProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/redes-sociais" element={<RedesSociais />} />
            <Route path="/integracao" element={<Integracao />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/galeria" element={<Gallery />} />
            <Route path="/admin/formularios" element={<Forms />} />
            <Route path="/admin/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TrackingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
