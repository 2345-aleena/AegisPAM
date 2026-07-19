import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  ClipboardList,
  KeySquare,
  Clock,
  ScrollText,
  Menu,
  X,
  LogOut,
  UserCog,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./Badges";
import Seal from "./Seal";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "approver", "requester"] },
  { to: "/resources", label: "Resources", icon: Server, roles: ["admin", "approver", "requester"] },
  { to: "/access-requests", label: "Access Requests", icon: ClipboardList, roles: ["admin", "approver", "requester"] },
  { to: "/sessions", label: "Sessions", icon: Clock, roles: ["admin", "approver", "requester"] },
  { to: "/secrets", label: "Secret Vault", icon: KeySquare, roles: ["admin", "approver"] },
  { to: "/audit-log", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
  { to: "/account", label: "Account", icon: UserCog, roles: ["admin", "approver", "requester"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Mobile top bar */}
      <div className="sm:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-olive-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <Seal state="sealed" size={22} />
          <span className="font-display text-cream-soft text-lg">AegisPAM</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-cream-soft p-1" aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed sm:sticky top-0 sm:top-0 z-20 h-screen w-64 shrink-0 bg-olive-950 text-cream-soft flex flex-col
          transition-transform duration-200 sm:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="hidden sm:flex items-center gap-2 px-6 py-6">
          <Seal state="sealed" size={26} />
          <span className="font-display text-xl tracking-tight">AegisPAM</span>
        </div>

        <nav className="flex-1 px-3 py-4 mt-14 sm:mt-0 space-y-1 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-olive-700 text-cream-soft" : "text-olive-100 hover:bg-olive-900"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-olive-700/40 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-olive-700 flex items-center justify-center text-sm font-semibold uppercase">
              {user?.username?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <RoleBadge role={user?.role} />
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-olive-100 hover:bg-olive-900 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/30 sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 sm:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
