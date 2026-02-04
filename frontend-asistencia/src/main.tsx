import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Tareas from "./pages/Tareas";
import Asistencia from "./pages/Asistencia";
import Extensiones from "./pages/Extensiones";
import Calendario from "./pages/Calendario";
import AdminDashboard from "./pages/AdminDashboard";

import Usuarios from "./pages/Usuarios";
import UsuariosCrear from "./pages/UsuariosCrear";
import UsuarioShow from "./pages/UsuarioShow"; // ✅ NUEVO (ruta show)

// ✅ IMPORTACIÓN DE ROLES
import Roles from "./pages/Roles";

import "./index.css";

import { AuthProvider } from "./auth/AuthContext";

// ✅ NUEVO: Home pública
import PublicHome from "./pages/public/PublicHome";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* ✅ PUBLIC */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />

          {/* ✅ PROTECTED */}
          <Route element={<ProtectedRoute />}>
            {/* /dashboard layout */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />

              <Route path="tareas" element={<Tareas />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="asistencia" element={<Asistencia />} />
              <Route path="extensiones" element={<Extensiones />} />

              {/* ✅ ADMIN ONLY */}
              <Route element={<AdminRoute />}>
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="usuarios/crear" element={<UsuariosCrear />} />
                <Route path="usuarios/:id" element={<UsuarioShow />} /> {/* ✅ NUEVO */}
                <Route path="admin" element={<AdminDashboard />} />
                {/* ✅ NUEVA RUTA DE ROLES */}
                <Route path="roles" element={<Roles />} />
              </Route>

              {/* fallback dentro de dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* ✅ Global fallback (si no existe ruta, manda a home pública) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
