// src/components/sidebar/SidebarAdmin.tsx
import "./Sidebar.css";

import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Clock,
  FileText,
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound,
  ChevronDown,
  Radio, // ✅ NUEVO (Live)
} from "lucide-react";

function NavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        ["sb-item", isActive ? "sb-item--active" : "sb-item--idle"].join(" ")
      }
    >
      <span className="sb-ico">{icon}</span>
      <span className="sb-label">{label}</span>
    </NavLink>
  );
}

function GroupButton({
  icon,
  label,
  open,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="sb-groupBtn"
      aria-expanded={open}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span className="sb-ico">{icon}</span>
        <span className="sb-label">{label}</span>
      </span>

      <ChevronDown className={open ? "sb-chevron sb-chevron--open" : "sb-chevron"} />
    </button>
  );
}

function Submenu({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={open ? "sb-subWrap sb-subWrap--open" : "sb-subWrap"}>
      <div className="sb-sub">{children}</div>
    </div>
  );
}

export default function SidebarAdmin() {
  const { pathname } = useLocation();

  const isAdminRoute = useMemo(
    () =>
      pathname.startsWith("/dashboard/admin") ||
      pathname.startsWith("/dashboard/roles"),
    [pathname]
  );

  const isUsersRoute = useMemo(
    () => pathname.startsWith("/dashboard/usuarios"),
    [pathname]
  );

  const [openAdmin, setOpenAdmin] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);

  useEffect(() => {
    if (isAdminRoute) setOpenAdmin(true);
    if (isUsersRoute) setOpenUsers(true);
  }, [isAdminRoute, isUsersRoute]);

  return (
    <nav className="sb-nav">
      <NavItem
        to="/dashboard"
        end
        icon={<LayoutDashboard className="h-4 w-4" />}
        label="Dashboard"
      />

      <NavItem
        to="/dashboard/tareas"
        icon={<ListTodo className="h-4 w-4" />}
        label="Tareas"
      />

      <NavItem
        to="/dashboard/calendario"
        icon={<CalendarDays className="h-4 w-4" />}
        label="Calendario"
      />

      <NavItem
        to="/dashboard/asistencia"
        icon={<Clock className="h-4 w-4" />}
        label="Asistencia"
      />

      <NavItem
        to="/dashboard/extensiones"
        icon={<FileText className="h-4 w-4" />}
        label="Extensiones"
      />

      {/* ✅ NUEVO: LIVE */}
      <NavItem
        to="/dashboard/live"
        icon={<Radio className="h-4 w-4" />}
        label="Live"
      />

      <div className="sb-sep" />

      {/* ====== ADMIN (submenu) ====== */}
      <GroupButton
        icon={<ShieldCheck className="h-4 w-4" />}
        label="Admin"
        open={openAdmin}
        onToggle={() => setOpenAdmin((v) => !v)}
      />

      <Submenu open={openAdmin}>
        <NavItem
          to="/dashboard/admin"
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Asignar tarea"
        />
        <NavItem
          to="/dashboard/roles"
          icon={<KeyRound className="h-4 w-4" />}
          label="Roles"
        />
      </Submenu>

      {/* ====== USUARIOS (submenu) ====== */}
      <GroupButton
        icon={<Users className="h-4 w-4" />}
        label="Usuarios"
        open={openUsers}
        onToggle={() => setOpenUsers((v) => !v)}
      />

      <Submenu open={openUsers}>
        <NavItem
          to="/dashboard/usuarios"
          icon={<Users className="h-4 w-4" />}
          label="Lista de usuarios"
        />
        <NavItem
          to="/dashboard/usuarios/crear"
          icon={<UserPlus className="h-4 w-4" />}
          label="Crear usuario"
        />
      </Submenu>
    </nav>
  );
}
