import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// Imports críticos (imediatos - usados no first load)
import DashboardV2 from "./pages/DashboardV2";
import { MainLayout } from "@/components/Layout/MainLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";

// Code Splitting: Lazy loading para rotas secundárias
const Index = lazy(() => import("./pages/Index"));
const Reports = lazy(() => import("./pages/Reports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CompareProjects = lazy(() => import("./pages/CompareProjects"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Calendar = lazy(() => import("./pages/Calendar"));
const NextDeployments = lazy(() => import("./pages/NextDeployments"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));

// Commercial Pages (lazy)
const CommercialBlockers = lazy(
  () => import("./pages/commercial/CommercialBlockers"),
);
const CommercialContacts = lazy(
  () => import("./pages/commercial/CommercialContacts"),
);
const ClientOverview = lazy(() => import("./pages/commercial/ClientOverview"));
const CommercialCustomers = lazy(
  () => import("./pages/commercial/CommercialCustomers"),
);
const CustomerTimeline = lazy(
  () => import("./pages/commercial/CustomerTimeline"),
);

// Conversion Pages (lazy)
const Conversion = lazy(() => import("./pages/conversion/Conversion"));
const ConversionMappings = lazy(
  () => import("./pages/conversion/ConversionMappings"),
);
const ConversionIssues = lazy(
  () => import("./pages/conversion/ConversionIssues"),
);
const ConversionHomologation = lazy(
  () => import("./pages/conversion/ConversionHomologation"),
);

// Admin Pages (lazy)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const TeamManagement = lazy(() => import("./pages/admin/TeamManagement"));
const TeamAreasManagement = lazy(
  () => import("./pages/admin/TeamAreasManagement"),
);
const AdminSettings = lazy(() =>
  import("@/components/Admin/Settings/AdminSettings").then((m) => ({
    default: m.AdminSettings,
  })),
);

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
              <Route
                path="/roadmap/:token"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RoadmapPage />
                  </Suspense>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminLayout />
                  </Suspense>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="users"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <UserManagement />
                    </Suspense>
                  }
                />
                <Route
                  path="team"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TeamManagement />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminSettings />
                    </Suspense>
                  }
                />
                <Route
                  path="areas"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TeamAreasManagement />
                    </Suspense>
                  }
                />
              </Route>

              {/* Protected App Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<DashboardV2 />} />
                          <Route path="/projects" element={<Index />} />
                          <Route path="/calendar" element={<Calendar />} />
                          <Route
                            path="/compare"
                            element={<CompareProjects />}
                          />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route
                            path="/deployments"
                            element={<NextDeployments />}
                          />
                          <Route
                            path="/commercial/blockers"
                            element={<CommercialBlockers />}
                          />
                          <Route
                            path="/commercial/contacts"
                            element={<CommercialContacts />}
                          />
                          <Route
                            path="/commercial/customers"
                            element={<CommercialCustomers />}
                          />
                          <Route
                            path="/commercial/client/:id"
                            element={<ClientOverview />}
                          />
                          <Route
                            path="/commercial/client/:id/timeline"
                            element={<CustomerTimeline />}
                          />
                          <Route path="/conversion" element={<Conversion />} />
                          <Route
                            path="/conversion/mappings"
                            element={<ConversionMappings />}
                          />
                          <Route
                            path="/conversion/issues"
                            element={<ConversionIssues />}
                          />
                          <Route
                            path="/conversion/homologation"
                            element={<ConversionHomologation />}
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
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
