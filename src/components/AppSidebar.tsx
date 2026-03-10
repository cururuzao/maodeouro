import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
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
  Copy,
  Check,
} from "lucide-react";

const TEST_CODE = "F46f72bcf09804ebabf2b24ef8e4bd57dS";


const sections = [
  {
    label: "HOME",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Instâncias", path: "/instances", icon: Smartphone },
      { label: "Conectar", path: "/conectar", icon: Link2 },
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
  const { signOut, isAdmin } = useAuth();

  const handleDisconnect = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center bg-primary/10">
            <span className="text-lg">✋</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground">Mão de Ouro</h1>
            <p className="text-[11px] text-muted-foreground">Disparos</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-5 overflow-y-auto">
        {sections
          .filter((section) => section.label !== "ADMIN" || isAdmin)
          .map((section) => (
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

      {/* Test Code */}
      <div className="px-3 pb-2">
        <p className="text-[10px] font-semibold text-muted-foreground tracking-wider px-1 mb-1">CÓDIGO TESTE</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(TEST_CODE);
            toast({ title: "Código copiado!" });
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
          title="Clique para copiar"
        >
          <span className="truncate flex-1 text-left">{TEST_CODE}</span>
          <Copy className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
        </button>
      </div>

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
