import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DashboardV2 from "./pages/DashboardV2";
import TeamManagement from "./pages/TeamManagement";
import Reports from "./pages/Reports";
import CompareProjects from "./pages/CompareProjects";
import NotFound from "./pages/NotFound";
import { MainLayout } from "@/components/Layout/MainLayout";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<DashboardV2 />} />
              <Route path="/projects" element={<Index />} />
              <Route path="/compare" element={<CompareProjects />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/team" element={<TeamManagement />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
