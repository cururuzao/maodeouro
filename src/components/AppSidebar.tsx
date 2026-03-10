import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Smartphone,
  Send,
  Link2,
  DollarSign,
  Users,
  FileText,
  Puzzle,
  Wrench,
  Shield,
  LogOut,
} from "lucide-react";
import { clearCachedConfig } from "@/lib/evolution-api";

const sections = [
  {
    label: "HOME",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Instâncias", path: "/instances", icon: Smartphone },
    ],
  },
  {
    label: "MONITORAMENTO",
    items: [
      { label: "Disparos", path: "/disparos", icon: Send },
      { label: "Conexões", path: "/conexoes", icon: Link2 },
      { label: "Transações", path: "/transacoes", icon: DollarSign },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { label: "Leads", path: "/leads", icon: Users },
      { label: "Templates", path: "/templates", icon: FileText },
      { label: "Integrações", path: "/integracoes", icon: Puzzle },
      { label: "Ferramentas", path: "/ferramentas", icon: Wrench },
    ],
  },
  {
    label: "ADMIN",
    items: [{ label: "Admin", path: "/admin", icon: Shield }],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDisconnect = async () => {
    clearCachedConfig();
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground">Blacksender</h1>
            <p className="text-[11px] text-muted-foreground">Instance Automator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-primary"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Desconectar
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
