// src/components/sidebar/SidebarAdmin.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Clock,
  FileText,
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound, // ✅ NUEVO
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
        [
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 font-extrabold transition",
          "focus:outline-none focus:ring-2 focus:ring-white/20",
          isActive
            ? "bg-[#FE003E] text-white shadow-[0_10px_30px_rgba(254,0,62,0.18)]"
            : "text-white/80 hover:text-white hover:bg-white/10",
        ].join(" ")
      }
    >
      <span
        className={[
          "h-9 w-9 rounded-2xl grid place-items-center",
          "border border-white/10",
          "bg-white/[0.06] group-hover:bg-white/[0.10] transition",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="px-3 pt-2 text-[11px] font-black tracking-widest text-white/45">
      {children}
    </div>
  );
}

export default function SidebarAdmin() {
  return (
    <nav className="p-3 space-y-2 flex-1 overflow-y-auto">
      <NavItem
        to="/dashboard"
        end
        icon={<LayoutDashboard className="h-5 w-5" />}
        label="Dashboard"
      />

      <NavItem
        to="/dashboard/tareas"
        icon={<ListTodo className="h-5 w-5" />}
        label="Tareas"
      />

      <NavItem
        to="/dashboard/calendario"
        icon={<CalendarDays className="h-5 w-5" />}
        label="Calendario"
      />

      <NavItem
        to="/dashboard/asistencia"
        icon={<Clock className="h-5 w-5" />}
        label="Asistencia"
      />

      <NavItem
        to="/dashboard/extensiones"
        icon={<FileText className="h-5 w-5" />}
        label="Extensiones"
      />

      <div className="pt-3 border-t border-white/10" />

      <SectionTitle>ADMIN</SectionTitle>
      <NavItem
        to="/dashboard/admin"
        icon={<ShieldCheck className="h-5 w-5" />}
        label="Asignar tarea"
      />

      {/* ✅ NUEVO: Roles */}
      <NavItem
        to="/dashboard/roles"
        icon={<KeyRound className="h-5 w-5" />}
        label="Roles"
      />

      <SectionTitle>USUARIOS</SectionTitle>
      <NavItem
        to="/dashboard/usuarios"
        icon={<Users className="h-5 w-5" />}
        label="Lista de usuarios"
      />
      <NavItem
        to="/dashboard/usuarios/crear"
        icon={<UserPlus className="h-5 w-5" />}
        label="Crear usuario"
      />
    </nav>
  );
}
