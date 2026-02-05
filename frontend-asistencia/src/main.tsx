import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

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
import UsuarioShow from "./pages/UsuarioShow";

// ✅ IMPORTACIÓN DE ROLES
import Roles from "./pages/Roles";

// ✅ NUEVO: LIVE
import Live from "./pages/Live";

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
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />

              <Route path="tareas" element={<Tareas />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="asistencia" element={<Asistencia />} />
              <Route path="extensiones" element={<Extensiones />} />

              {/* ✅ LIVE (si quieres que sea para TODOS los logueados, déjalo aquí) */}
              <Route path="live" element={<Live />} />

              {/* ✅ ADMIN ONLY */}
              <Route element={<AdminRoute />}>
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="usuarios/crear" element={<UsuariosCrear />} />
                <Route path="usuarios/:id" element={<UsuarioShow />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="roles" element={<Roles />} />

                // ✅ SI prefieres que LIVE sea SOLO admin, mueve la línea:
                // <Route path="live" element={<Live />} />
                // aquí adentro y borra la de arriba.
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
