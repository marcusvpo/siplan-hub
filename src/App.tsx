import { Toaster } from "@/components/ui/toaster";
import { SonnerToaster } from "@/components/ui/sonner";
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
import { RequirePermission } from "@/components/auth/RequirePermission";
import Login from "@/pages/Login";

// Code Splitting: Lazy loading para rotas secundárias
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const Reports = lazy(() => import("./pages/Reports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CompareProjects = lazy(() => import("./pages/CompareProjects"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Calendar = lazy(() => import("./pages/Calendar"));
const AgendaAnalistas = lazy(() => import("./pages/AgendaAnalistas"));
const NextDeployments = lazy(() => import("./pages/NextDeployments"));
const LatestDeployments = lazy(() => import("./pages/LatestDeployments"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const TeamConfiguration = lazy(() => import("./pages/admin/TeamConfiguration"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLog"));

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
const DeploymentForms = lazy(
  () => import("./pages/commercial/DeploymentForms"),
);

// Conversion Pages (lazy)
const Conversion = lazy(() => import("./pages/conversion/Conversion"));
const ConversionEngines = lazy(
  () => import("./pages/conversion/ConversionEngines"),
);
const OrionTNModels = lazy(
  () => import("./pages/conversion/OrionTNModels"),
);
const OrionTNProjects = lazy(
  () => import("./pages/conversion/OrionTNProjects"),
);
const OrionTNDashboard = lazy(
  () => import("./pages/conversion/OrionTNDashboard"),
);

// Implantadores Pages (lazy)
const Implantadores = lazy(() => import("./pages/implantadores/Implantadores"));
const ImplantadoresAderencia = lazy(() =>
  import("./pages/implantadores/EditarFormAderencia"),
);
const AderenciasFinalizadas = lazy(() =>
  import("./pages/implantadores/AderenciasFinalizadas"),
);
const ImplantadoresHomologation = lazy(() =>
  import("./pages/implantadores/ImplantadoresHomologation"),
);
const CommercialChecklists = lazy(() =>
  import("./pages/commercial/CommercialChecklists"),
);
const EditarChecklistComercial = lazy(() =>
  import("./pages/commercial/EditarChecklistComercial"),
);
const PublicChecklist = lazy(() =>
  import("./pages/public/PublicChecklist"),
);
const PublicInfraCollection = lazy(() =>
  import("./pages/public/PublicInfraCollection"),
);
const TreinamentoPlaceholder = lazy(() =>
  import("./pages/implantadores/TreinamentoPlaceholder"),
);
const TransicaoPlaceholder = lazy(() =>
  import("./pages/implantadores/TransicaoPlaceholder"),
);

// Admin Pages (lazy)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const RolesManagement = lazy(() => import("./pages/admin/RolesManagement"));
const TeamManagement = lazy(() => import("./pages/admin/TeamManagement"));
const TeamAreasManagement = lazy(
  () => import("./pages/admin/TeamAreasManagement"),
);
const AdminSettings = lazy(() =>
  import("@/components/Admin/Settings/AdminSettings").then((m) => ({
    default: m.AdminSettings,
  })),
);
const VacationManagement = lazy(
  () => import("./pages/admin/VacationManagement"),
);
const SystemStorage = lazy(() => import("./pages/admin/SystemStorage"));
const InactiveUsers = lazy(() => import("./pages/admin/InactiveUsers"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const ProjectAdherenceForm = lazy(() => import("./pages/ProjectAdherenceForm"));
const ProjectsKanban = lazy(() => import("./pages/ProjectsKanban"));
const PosPanorama = lazy(() => import("./pages/PosPanorama"));
const Copilot = lazy(() => import("./pages/Copilot"));
const CopilotAccess = lazy(() => import("./pages/admin/CopilotAccess"));
const CopilotUsage = lazy(() => import("./pages/admin/CopilotUsage"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <SonnerToaster />
        <AuthProvider>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route
                path="/reset-password"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ResetPassword />
                  </Suspense>
                }
              />
              <Route
                path="/roadmap/:token"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RoadmapPage />
                  </Suspense>
                }
              />
              <Route
                path="/public/checklist/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PublicChecklist />
                  </Suspense>
                }
              />
              <Route
                path="/public/infra-coleta/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PublicInfraCollection />
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
                      <RequirePermission resource="admin_dashboard">
                        <AdminDashboard />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="users"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="users">
                        <UserManagement />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="roles">
                        <RolesManagement />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="teams-config"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="teams">
                        <TeamConfiguration />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="audit_logs">
                        <AuditLogPage />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="settings">
                        <AdminSettings />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="vacations"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="vacations">
                        <VacationManagement />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="storage"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="storage">
                        <SystemStorage />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="inactive-users"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="inactive_users">
                        <InactiveUsers />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="copilot"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="copilot_admin">
                        <CopilotAccess />
                      </RequirePermission>
                    </Suspense>
                  }
                />
                <Route
                  path="copilot-usage"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequirePermission resource="copilot_usage">
                        <CopilotUsage />
                      </RequirePermission>
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
                          <Route path="/" element={<Home />} />
                          <Route
                            path="/dashboard"
                            element={
                              <RequirePermission resource="dashboard_view">
                                <DashboardV2 />
                              </RequirePermission>
                            }
                          />
                          <Route path="/copilot" element={<Copilot />} />
                          <Route
                            path="/dashboard/kanban"
                            element={
                              <RequirePermission resource="kanban">
                                <ProjectsKanban />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/dashboard/pos-implantacao"
                            element={
                              <RequirePermission resource="pos_panorama">
                                <PosPanorama />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/projects"
                            element={
                              <RequirePermission resource="projects">
                                <Index />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/projects/:id"
                            element={
                              <RequirePermission resource="projects">
                                <ProjectDetails />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/projects/:id/adherence"
                            element={
                              <RequirePermission resource="projects">
                                <ProjectAdherenceForm />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/calendar"
                            element={
                              <RequirePermission resource="calendar_projects">
                                <Calendar />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/agenda-analistas"
                            element={
                              <RequirePermission resource="calendar_analysts">
                                <AgendaAnalistas />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/compare"
                            element={
                              <RequirePermission resource="compare_projects">
                                <CompareProjects />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/reports"
                            element={
                              <RequirePermission resource="reports">
                                <Reports />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/analytics"
                            element={
                              <RequirePermission resource="analytics">
                                <Analytics />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/deployments"
                            element={
                              <RequirePermission resource="deployments_next">
                                <NextDeployments />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/deployments/latest"
                            element={
                              <RequirePermission resource="deployments_latest">
                                <LatestDeployments />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/blockers"
                            element={
                              <RequirePermission resource="commercial_blockers">
                                <CommercialBlockers />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/contacts"
                            element={
                              <RequirePermission resource="commercial_contacts">
                                <CommercialContacts />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/customers"
                            element={
                              <RequirePermission resource="commercial_customers">
                                <CommercialCustomers />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/client/:id"
                            element={
                              <RequirePermission resource="commercial_customers">
                                <ClientOverview />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/client/:id/timeline"
                            element={
                              <RequirePermission resource="commercial_customers">
                                <CustomerTimeline />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/deployment-forms"
                            element={
                              <RequirePermission resource="commercial_deployment_forms">
                                <DeploymentForms />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/checklists"
                            element={
                              <RequirePermission resource="commercial_checklists">
                                <CommercialChecklists />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/commercial/checklists/questions"
                            element={
                              <RequirePermission
                                resource="commercial_checklist_questions"
                                action="manage"
                              >
                                <EditarChecklistComercial />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/conversion"
                            element={
                              <RequirePermission resource="conversion_home">
                                <Conversion />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/homologation"
                            element={
                              <RequirePermission resource="conversion_homologation">
                                <ImplantadoresHomologation />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/conversion/engines"
                            element={
                              <RequirePermission resource="conversion_engines">
                                <ConversionEngines />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/orion-tn-models/dashboard"
                            element={
                              <RequirePermission resource="orion_dashboard">
                                <OrionTNDashboard />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/orion-tn-models/projects"
                            element={
                              <RequirePermission resource="orion_projects">
                                <OrionTNProjects />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/orion-tn-models/:projectId?"
                            element={
                              <RequirePermission resource="orion_editor">
                                <OrionTNModels />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores"
                            element={
                              <RequirePermission resource="implantadores_home">
                                <Implantadores />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/aderencia"
                            element={
                              <RequirePermission resource="implantadores_aderencia">
                                <ImplantadoresAderencia />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/aderencia/finalizadas"
                            element={
                              <RequirePermission resource="implantadores_aderencia_finalizadas">
                                <AderenciasFinalizadas />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/aderencia/:systemType"
                            element={
                              <RequirePermission resource="implantadores_aderencia">
                                <ImplantadoresAderencia />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/treinamento"
                            element={
                              <RequirePermission resource="implantadores_treinamento">
                                <TreinamentoPlaceholder />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="/implantadores/transicao"
                            element={
                              <RequirePermission resource="implantadores_transicao">
                                <TransicaoPlaceholder />
                              </RequirePermission>
                            }
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
