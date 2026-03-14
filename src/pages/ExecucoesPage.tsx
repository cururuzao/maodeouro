import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw, ChevronRight } from "lucide-react";
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
  const [dateRange, setDateRange] = useState("30");

  const getDateFilter = () => {
    const days = parseInt(dateRange) || 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start: start.toISOString(), end: new Date().toISOString() };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateFilter();
    const [disparosRes, listsRes, templatesRes] = await Promise.all([
      supabase
        .from("disparos")
        .select("id, instance_name, phone_number, sent, failed, total, status, started_at, finished_at, list_id, template_id")
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
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
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
