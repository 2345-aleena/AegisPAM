import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import AccessRequests from "./pages/AccessRequests";
import Sessions from "./pages/Sessions";
import SecretsVault from "./pages/SecretsVault";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/access-requests" element={<AccessRequests />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route
                path="/secrets"
                element={
                  <ProtectedRoute roles={["admin", "approver"]}>
                    <SecretsVault />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-log"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route path="/account" element={<Profile />} />
            </Route>

            <Route path="*" element={<Dashboard />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
