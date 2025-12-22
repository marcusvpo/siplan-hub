import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DashboardV2 from "./pages/DashboardV2";
import TeamManagement from "./pages/admin/TeamManagement";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import CompareProjects from "./pages/CompareProjects";
import NotFound from "./pages/NotFound";
import Calendar from "./pages/Calendar";
import { MainLayout } from "@/components/Layout/MainLayout";
import NextDeployments from "@/pages/NextDeployments";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import { AdminSettings } from "@/components/Admin/Settings/AdminSettings";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="team" element={<TeamManagement />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Protected App Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="/" element={<DashboardV2 />} />
                        <Route path="/projects" element={<Index />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/compare" element={<CompareProjects />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route
                          path="/deployments"
                          element={<NextDeployments />}
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
