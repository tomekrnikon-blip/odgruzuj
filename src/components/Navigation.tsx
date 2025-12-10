import { Home, History, BarChart3, Settings, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.jpg";

const navItems = [
  { to: "/", icon: Home, label: "Główna" },
  { to: "/history", icon: History, label: "Historia" },
  { to: "/stats", icon: BarChart3, label: "Statystyki" },
  { to: "/settings", icon: Settings, label: "Ustawienia" },
];

export function Navigation() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Top notification bar */}
      <div className="fixed top-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-2">
          <NavLink to="/" className="flex items-center gap-2">
            <img src={logo} alt="odgruzuj.pl" className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-foreground">odgruzuj.pl</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Wyloguj"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border safe-area-pb z-40">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
