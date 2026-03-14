import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw, ChevronRight, Send, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Disparo {
  id: string;
  instance_name: string;
  phone_number: string | null;
  sent: number;
  failed: number;
  delivered?: number;
  total: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  list_id: string | null;
  template_id: string | null;
}

interface LeadList {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
}

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

const ExecucoesPage = () => {
  const navigate = useNavigate();
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");

  const getDateFilter = () => {
    if (dateRange === "all") return { start: "1970-01-01T00:00:00Z", end: new Date().toISOString() };
    const now = new Date();
    if (dateRange === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    if (dateRange === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const end = new Date(y);
      end.setHours(23, 59, 59, 999);
      return { start: y.toISOString(), end: end.toISOString() };
    }
    const days = parseInt(dateRange) || 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start: start.toISOString(), end: now.toISOString() };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateFilter();
    const [disparosRes, listsRes, templatesRes] = await Promise.all([
      supabase
        .from("disparos")
        .select("*")
        .gte("started_at", start)
        .lte("started_at", end)
        .order("started_at", { ascending: false })
        .limit(200),
      supabase.from("lead_lists").select("id, name").order("created_at", { ascending: false }),
      supabase.from("templates").select("id, name").order("created_at", { ascending: false }),
    ]);
    setDisparos((disparosRes.data as Disparo[]) || []);
    setLists(listsRes.data || []);
    setTemplates(templatesRes.data || []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getListName = (id: string | null) => lists.find((l) => l.id === id)?.name || "—";
  const getTemplateName = (id: string | null) => templates.find((t) => t.id === id)?.name || "—";

  // Totais
  const totalEnviados = disparos.reduce((a, d) => a + d.sent, 0);
  const totalFalhas = disparos.reduce((a, d) => a + d.failed, 0);
  const totalRealmenteEnviados = disparos.reduce((a, d) => a + (d.delivered ?? 0), 0);
  const concluidos = disparos.filter((d) => d.status === "completed").length;
  const emExecucao = disparos.filter((d) => d.status === "running" || d.status === "pending").length;
  const cancelados = disparos.filter((d) => d.status === "cancelled" || d.status === "failed").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Execuções</h1>
            <p className="text-sm text-muted-foreground">Histórico detalhado de disparos por instância e número</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Últimos 12 meses</option>
              <option value="all">Todo o histórico</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => navigate("/disparos")} className="gap-1.5">
              Disparos <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!loading && disparos.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <Send className="w-4 h-4" /> Enviados <strong>{totalEnviados.toLocaleString("pt-BR")}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <XCircle className="w-4 h-4" /> Falhas <strong>{totalFalhas.toLocaleString("pt-BR")}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Realmente enviados <strong>{(totalRealmenteEnviados || 0).toLocaleString("pt-BR")}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-green-500 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Concluídas <strong>{concluidos}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-blue-500 font-medium">
              <Wifi className="w-4 h-4" /> Em execução <strong>{emExecucao}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <XCircle className="w-4 h-4" /> Canceladas <strong>{cancelados}</strong>
            </span>
            <span className="text-xs text-muted-foreground ml-auto self-center border-l border-border pl-4" title="Enviados = API retornou sucesso. Para saber se chegou no celular do destinatário, seria necessário configurar webhook de status da Z-API (RECEIVED, READ).">
              Enviados = aceitos pela API
            </span>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <h2 className="text-base font-semibold text-foreground p-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Execuções detalhadas
          </h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : disparos.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhuma execução no período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                    <th className="py-3 px-4 font-medium">Instância</th>
                    <th className="py-3 px-4 font-medium">Número WhatsApp</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Enviados</th>
                    <th className="py-3 px-4 font-medium text-right">Falhas</th>
                    <th className="py-3 px-4 font-medium text-right">Realmente enviados</th>
                    <th className="py-3 px-4 font-medium text-right">Total</th>
                    <th className="py-3 px-4 font-medium">Lista</th>
                    <th className="py-3 px-4 font-medium">Template</th>
                    <th className="py-3 px-4 font-medium">Início</th>
                    <th className="py-3 px-4 font-medium">Término</th>
                  </tr>
                </thead>
                <tbody>
                  {disparos.map((d) => (
                    <tr key={d.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 text-foreground font-medium">{d.instance_name}</td>
                      <td className="py-3 px-4 text-foreground font-mono">{d.phone_number ? formatPhone(d.phone_number) : "—"}</td>
                      <td className="py-3 px-4">{getStatusBadge(d.status)}</td>
                      <td className="py-3 px-4 text-right text-primary font-medium">{d.sent}</td>
                      <td className="py-3 px-4 text-right text-destructive font-medium">{d.failed}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">{d.delivered ?? 0}</td>
                      <td className="py-3 px-4 text-right text-foreground">{d.total}</td>
                      <td className="py-3 px-4 text-muted-foreground">{getListName(d.list_id)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{getTemplateName(d.template_id)}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{format(new Date(d.started_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {d.finished_at ? format(new Date(d.finished_at), "dd/MM/yyyy HH:mm") : "—"}
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

export default ExecucoesPage;
