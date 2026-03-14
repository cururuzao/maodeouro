import { useState, useEffect, useCallback } from "react";
import { Send, TrendingUp, RefreshCw, Wifi, Users, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import FinancialSection from "@/components/FinancialSection";
import { supabase } from "@/integrations/supabase/client";
import { listInstances, getStatus, type ZApiInstance } from "@/lib/z-api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays } from "date-fns";

interface DashboardData {
  totalDisparos: number;
  totalSent: number;
  totalFailed: number;
  totalLeads: number;
  totalLists: number;
  totalTemplates: number;
  instances: ZApiInstance[];
  instanceStatuses: Map<string, { connected: boolean; smartphoneConnected: boolean }>;
  recentDisparos: any[];
  chartData: { date: string; enviados: number; falhas: number }[];
  publicLeadsCount: number;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData>({
    totalDisparos: 0, totalSent: 0, totalFailed: 0,
    totalLeads: 0, totalLists: 0, totalTemplates: 0,
    instances: [], instanceStatuses: new Map(),
    recentDisparos: [], chartData: [], publicLeadsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [disparosRes, leadsRes, listsRes, templatesRes, instances, publicLeadsRes] = await Promise.all([
        supabase.from("disparos").select("*").order("started_at", { ascending: false }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("lead_lists").select("id", { count: "exact", head: true }),
        supabase.from("templates").select("id", { count: "exact", head: true }),
        listInstances().catch(() => [] as ZApiInstance[]),
        supabase.from("public_leads").select("id", { count: "exact", head: true }).eq("status", "connected"),
      ]);

      const disparos = disparosRes.data || [];
      const totalSent = disparos.reduce((a: number, d: any) => a + (d.sent || 0), 0);
      const totalFailed = disparos.reduce((a: number, d: any) => a + (d.failed || 0), 0);

      const last7 = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const dayStr = format(day, "dd/MM");
        const dayDisparos = disparos.filter((d: any) => {
          const dDate = new Date(d.started_at);
          return dDate.toDateString() === day.toDateString();
        });
        return {
          date: dayStr,
          enviados: dayDisparos.reduce((a: number, d: any) => a + (d.sent || 0), 0),
          falhas: dayDisparos.reduce((a: number, d: any) => a + (d.failed || 0), 0),
        };
      });

      const statusMap = new Map<string, { connected: boolean; smartphoneConnected: boolean }>();
      await Promise.all(
        instances.slice(0, 5).map(async (inst) => {
          try {
            const s = await getStatus(inst);
            statusMap.set(inst.id, { connected: s.connected, smartphoneConnected: s.smartphoneConnected });
          } catch {
            statusMap.set(inst.id, { connected: false, smartphoneConnected: false });
          }
        })
      );

      setData({
        totalDisparos: disparos.length,
        totalSent, totalFailed,
        totalLeads: leadsRes.count || 0,
        totalLists: listsRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        instances, instanceStatuses: statusMap,
        recentDisparos: disparos.slice(0, 5),
        chartData: last7,
        publicLeadsCount: publicLeadsRes.count || 0,
      });
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const connectedCount = Array.from(data.instanceStatuses.values()).filter(s => s.connected).length;
  const successRate = data.totalSent + data.totalFailed > 0
    ? ((data.totalSent / (data.totalSent + data.totalFailed)) * 100).toFixed(1)
    : "0.0";

  const stats = [
    {
      label: "Total Enviados", value: data.totalSent.toLocaleString("pt-BR"),
      icon: Send, sub: `${data.totalFailed} falhas`,
      trend: data.totalSent > 0 ? "up" : "neutral",
      color: "text-primary", bgColor: "bg-primary/10",
    },
    {
      label: "Taxa de Sucesso", value: `${successRate}%`,
      icon: TrendingUp, sub: `${data.totalDisparos} execuções`,
      trend: Number(successRate) > 90 ? "up" : Number(successRate) > 0 ? "down" : "neutral",
      color: "text-emerald-400", bgColor: "bg-emerald-400/10",
    },
    {
      label: "Leads Conectados", value: data.publicLeadsCount.toLocaleString("pt-BR"),
      icon: Users, sub: `${data.totalLeads} na base`,
      trend: data.publicLeadsCount > 0 ? "up" : "neutral",
      color: "text-blue-400", bgColor: "bg-blue-400/10",
    },
    {
      label: "Instâncias Online", value: `${connectedCount}/${data.instances.length}`,
      icon: Wifi, sub: `${data.totalTemplates} templates`,
      trend: connectedCount > 0 ? "up" : "neutral",
      color: "text-amber-400", bgColor: "bg-amber-400/10",
    },
  ];

  const formatPhone = (phone: string) => {
    const dg = phone.replace(/\D/g, "").slice(-11);
    return dg.length === 11 ? dg.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : dg || "—";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Concluído</span>;
      case "running":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Em andamento</span>;
      case "failed":
      case "cancelled":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">{status === "cancelled" ? "Cancelado" : "Falhou"}</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pendente</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral das suas operações</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${s.bgColor}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                {s.trend === "up" && <ArrowUpRight className="w-4 h-4 text-primary" />}
                {s.trend === "down" && <ArrowDownRight className="w-4 h-4 text-destructive" />}
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Section */}
        <FinancialSection
          totalDisparos={data.totalDisparos}
          totalSent={data.totalSent}
          publicLeadsCount={data.publicLeadsCount}
        />

        {/* Chart + Instances */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Enviados vs Falhas (7 dias)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="gradEnviados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFalhas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="enviados" stroke="hsl(var(--primary))" fill="url(#gradEnviados)" name="Enviados" strokeWidth={2} />
                <Area type="monotone" dataKey="falhas" stroke="hsl(var(--destructive))" fill="url(#gradFalhas)" name="Falhas" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" /> Instâncias
            </h2>
            {data.instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma instância cadastrada</p>
            ) : (
              <div className="space-y-3">
                {data.instances.slice(0, 5).map((inst) => {
                  const status = data.instanceStatuses.get(inst.id);
                  const isOnline = status?.connected;
                  return (
                    <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                        <span className="text-sm text-foreground truncate max-w-[140px]">{inst.instance_name}</span>
                      </div>
                      <span className={`text-xs font-medium ${isOnline ? "text-primary" : "text-muted-foreground"}`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Disparos */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Últimas Execuções
          </h2>
          {data.recentDisparos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Instância</th>
                    <th className="pb-3 font-medium">Número WhatsApp</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Enviados</th>
                    <th className="pb-3 font-medium text-right">Falhas</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                    <th className="pb-3 font-medium text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentDisparos.map((d) => (
                    <tr key={d.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 text-foreground">{d.instance_name}</td>
                      <td className="py-3 text-foreground font-mono font-medium">{d.phone_number ? formatPhone(d.phone_number) : "—"}</td>
                      <td className="py-3">{getStatusBadge(d.status)}</td>
                      <td className="py-3 text-right text-primary font-medium">{d.sent}</td>
                      <td className="py-3 text-right text-destructive font-medium">{d.failed}</td>
                      <td className="py-3 text-right text-foreground">{d.total}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {format(new Date(d.started_at), "dd/MM HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
