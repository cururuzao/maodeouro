import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Users, Smartphone, Send, FileText, List,
  RefreshCw, Crown, Eye, Trash2, AlertTriangle,
  Activity, Database, BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface AdminStats {
  total_users: number;
  total_instances: number;
  total_disparos: number;
  total_sent: number;
  total_failed: number;
  total_leads: number;
  total_lists: number;
  total_templates: number;
}

type TabKey = "overview" | "users" | "instances" | "disparos" | "templates" | "leads";

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [disparos, setDisparos] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [leadLists, setLeadLists] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/dashboard");
      toast({ title: "Acesso negado", description: "Você não tem permissão de administrador.", variant: "destructive" });
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [statsRes, profilesRes, instancesRes, disparosRes, templatesRes, listsRes] = await Promise.all([
        supabase.rpc("admin_get_stats"),
        supabase.rpc("admin_get_all_profiles"),
        supabase.rpc("admin_get_all_z_api_instances"),
        supabase.rpc("admin_get_all_disparos"),
        supabase.rpc("admin_get_all_templates"),
        supabase.rpc("admin_get_all_lead_lists"),
      ]);
      if (statsRes.data) setStats(statsRes.data as any);
      setProfiles(profilesRes.data || []);
      setInstances(instancesRes.data || []);
      setDisparos(disparosRes.data || []);
      setTemplates(templatesRes.data || []);
      setLeadLists(listsRes.data || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dados", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin, fetchAll]);

  if (authLoading || !isAdmin) return null;

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Visão Geral", icon: BarChart3 },
    { key: "users", label: "Usuários", icon: Users },
    { key: "instances", label: "Instâncias", icon: Smartphone },
    { key: "disparos", label: "Disparos", icon: Send },
    { key: "templates", label: "Templates", icon: FileText },
    { key: "leads", label: "Listas/Leads", icon: List },
  ];

  const statCards = stats ? [
    { label: "Usuários", value: stats.total_users, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Instâncias", value: stats.total_instances, icon: Smartphone, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Disparos", value: stats.total_disparos, icon: Send, color: "text-primary", bg: "bg-primary/10" },
    { label: "Enviados", value: stats.total_sent, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Falhas", value: stats.total_failed, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Leads", value: stats.total_leads, icon: Database, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Listas", value: stats.total_lists, icon: List, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Templates", value: stats.total_templates, icon: FileText, color: "text-pink-400", bg: "bg-pink-400/10" },
  ] : [];

  const fmtDate = (d: string) => {
    try { return format(new Date(d), "dd/MM/yy HH:mm"); } catch { return d; }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
              <p className="text-sm text-muted-foreground">Painel onisciente — veja tudo e todos</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${s.bg}`}>
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{s.value.toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Todos os Usuários ({profiles.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">ID</th>
                    <th className="p-3 font-medium">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((p: any) => (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                            {(p.display_name || "?")[0]?.toUpperCase()}
                          </div>
                          {p.display_name || "Sem nome"}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}...</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nenhum usuário</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "instances" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" /> Todas as Instâncias ({instances.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Instance ID</th>
                    <th className="p-3 font-medium">Dono (user_id)</th>
                    <th className="p-3 font-medium">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {instances.map((i: any) => (
                    <tr key={i.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground font-medium">{i.instance_name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{i.instance_id}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{i.user_id.slice(0, 8)}...</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(i.created_at)}</td>
                    </tr>
                  ))}
                  {instances.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma instância</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "disparos" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Todos os Disparos ({disparos.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Instância</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Enviados</th>
                    <th className="p-3 font-medium text-right">Falhas</th>
                    <th className="p-3 font-medium text-right">Total</th>
                    <th className="p-3 font-medium">Dono</th>
                    <th className="p-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {disparos.map((d: any) => (
                    <tr key={d.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground">{d.instance_name}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.status === "completed" ? "bg-primary/15 text-primary" :
                          d.status === "running" ? "bg-blue-500/15 text-blue-400" :
                          d.status === "failed" ? "bg-destructive/15 text-destructive" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-primary font-medium">{d.sent}</td>
                      <td className="p-3 text-right text-destructive font-medium">{d.failed}</td>
                      <td className="p-3 text-right text-foreground">{d.total}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{d.user_id?.slice(0, 8)}...</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(d.started_at)}</td>
                    </tr>
                  ))}
                  {disparos.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum disparo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Todos os Templates ({templates.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Dono</th>
                    <th className="p-3 font-medium">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {templates.map((t: any) => (
                    <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground font-medium">{t.name}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t.type}</span>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{t.user_id?.slice(0, 8)}...</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(t.created_at)}</td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum template</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <List className="w-4 h-4 text-primary" /> Todas as Listas ({leadLists.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Descrição</th>
                    <th className="p-3 font-medium">Dono</th>
                    <th className="p-3 font-medium">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leadLists.map((l: any) => (
                    <tr key={l.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-foreground font-medium">{l.name}</td>
                      <td className="p-3 text-muted-foreground">{l.description || "—"}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{l.user_id?.slice(0, 8)}...</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
                  {leadLists.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma lista</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
