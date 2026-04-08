import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { PrivateRoute } from "@/components/layout/private-route";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { MetricDetailPage } from "@/pages/metric-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AppRoutes() {
  useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="dashboard/metrics/:id"
          element={<MetricDetailPage />}
        />
        <Route
          path="okrs"
          element={
            <div className="text-gray-500">OKRs (em breve)</div>
          }
        />
        <Route
          path="settings"
          element={
            <div className="text-gray-500">Configurações (em breve)</div>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
