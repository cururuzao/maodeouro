import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, Play, BarChart3, Hash, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { fetchInstances, sendTextMessage, type Instance } from "@/lib/evolution-api";
import { useAuth } from "@/contexts/AuthContext";

interface LeadList {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

interface Disparo {
  id: string;
  instance_name: string;
  template_id: string | null;
  list_id: string | null;
  status: string;
  total: number;
  sent: number;
  failed: number;
  started_at: string;
  finished_at: string | null;
}

const DisparosPage = () => {
  const { user } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedInstance, setSelectedInstance] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [delay, setDelay] = useState("3");

  // Execution state
  const [running, setRunning] = useState(false);
  const [currentDisparo, setCurrentDisparo] = useState<string | null>(null);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const abortRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [instancesRes, listsRes, templatesRes, disparosRes] = await Promise.all([
      fetchInstances().catch(() => []),
      supabase.from("lead_lists").select("id, name").order("created_at", { ascending: false }),
      supabase.from("templates").select("id, name, content").order("created_at", { ascending: false }),
      supabase.from("disparos").select("*").order("started_at", { ascending: false }).limit(50),
    ]);

    const instList = (Array.isArray(instancesRes) ? instancesRes : []).map((item: any) => {
      const name = item?.instance?.instanceName || item?.name || "unknown";
      return { name };
    });
    setInstances(instList);
    if (instList.length > 0) setSelectedInstance(instList[0].name);

    setLists(listsRes.data || []);
    setTemplates(templatesRes.data || []);
    setDisparos((disparosRes.data as Disparo[]) || []);
    setLoading(false);
  };

  const startDisparo = async () => {
    if (!selectedInstance || !selectedList || !selectedTemplate) {
      toast({ title: "Selecione instância, lista e template", variant: "destructive" });
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Fetch leads for the list
    const { data: leads, error } = await supabase
      .from("leads")
      .select("phone, name, extra_data")
      .eq("list_id", selectedList);

    if (error || !leads || leads.length === 0) {
      toast({ title: "Nenhum lead encontrado nesta lista", variant: "destructive" });
      return;
    }

    // Create disparo record
    const { data: disparo, error: dErr } = await supabase
      .from("disparos")
      .insert({
        instance_name: selectedInstance,
        template_id: selectedTemplate,
        list_id: selectedList,
        status: "running",
        total: leads.length,
        sent: 0,
        failed: 0,
        user_id: user?.id,
      })
      .select()
      .single();

    if (dErr || !disparo) {
      toast({ title: "Erro ao criar disparo", description: dErr?.message, variant: "destructive" });
      return;
    }

    setRunning(true);
    setCurrentDisparo(disparo.id);
    setProgress({ sent: 0, failed: 0, total: leads.length });
    abortRef.current = false;

    let sent = 0;
    let failed = 0;
    const delayMs = Number(delay) * 1000;

    for (const lead of leads) {
      if (abortRef.current) break;

      // Replace all dynamic variables
      const extra = (lead as any).extra_data || {};
      let text = template.content
        .replace(/\{\{nome\}\}/gi, lead.name || "")
        .replace(/\{\{telefone\}\}/gi, lead.phone || "")
        .replace(/\{\{email\}\}/gi, extra.email || "")
        .replace(/\{\{empresa\}\}/gi, extra.empresa || "")
        .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString("pt-BR"))
        .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

      try {
        await sendTextMessage(selectedInstance, lead.phone, text);
        sent++;
      } catch {
        failed++;
      }

      setProgress({ sent, failed, total: leads.length });

      // Update DB periodically (every 5 messages)
      if ((sent + failed) % 5 === 0 || sent + failed === leads.length) {
        await supabase
          .from("disparos")
          .update({ sent, failed })
          .eq("id", disparo.id);
      }

      if (sent + failed < leads.length && !abortRef.current && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // Finalize
    const finalStatus = abortRef.current ? "cancelled" : "completed";
    await supabase
      .from("disparos")
      .update({ sent, failed, status: finalStatus, finished_at: new Date().toISOString() })
      .eq("id", disparo.id);

    setRunning(false);
    setCurrentDisparo(null);
    toast({
      title: finalStatus === "cancelled" ? "Disparo cancelado" : "Disparo concluído!",
      description: `${sent} enviados, ${failed} falharam`,
    });
    loadData();
  };

  const stopDisparo = () => {
    abortRef.current = true;
  };

  const getListName = (id: string | null) => lists.find((l) => l.id === id)?.name || "-";
  const getTemplateName = (id: string | null) => templates.find((t) => t.id === id)?.name || "-";

  const stats = [
    { label: "Total Disparos", value: disparos.reduce((a, d) => a + d.sent + d.failed, 0).toString(), sub: "mensagens enviadas", icon: Send },
    { label: "Números Únicos", value: disparos.reduce((a, d) => a + d.total, 0).toString(), sub: "números utilizados", icon: Hash },
    { label: "Execuções", value: disparos.length.toString(), sub: "campanhas executadas", icon: Play },
    { label: "Média de Disparos", value: disparos.length > 0 ? Math.round(disparos.reduce((a, d) => a + d.sent, 0) / disparos.length).toString() : "0", sub: "média por execução", icon: BarChart3 },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: "bg-green-500/10 text-green-400",
      running: "bg-yellow-500/10 text-yellow-400",
      cancelled: "bg-red-500/10 text-red-400",
      pending: "bg-muted text-muted-foreground",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || map.pending}`}>{s}</span>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disparos</h1>
            <p className="text-sm text-muted-foreground">Execute e acompanhe campanhas de mensagens</p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* New Disparo Form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4" /> Novo Disparo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Instância</Label>
              <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                {instances.length === 0 && <option value="">Nenhuma instância</option>}
                {instances.map((inst: any) => (
                  <option key={inst.name} value={inst.name}>{inst.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Lista de Leads</Label>
              <select value={selectedList} onChange={(e) => setSelectedList(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                <option value="">Selecione...</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Template</Label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                <option value="">Selecione...</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Intervalo (seg)</Label>
              <Input type="number" value={delay} onChange={(e) => setDelay(e.target.value)} min="1" max="30" className="h-10 bg-secondary border-border w-28" />
            </div>
            {running ? (
              <Button variant="destructive" onClick={stopDisparo} className="h-10">
                <StopCircle className="w-4 h-4 mr-2" /> Parar
              </Button>
            ) : (
              <Button onClick={startDisparo} disabled={loading} className="h-10">
                <Play className="w-4 h-4 mr-2" /> Iniciar Disparo
              </Button>
            )}
          </div>

          {/* Progress */}
          {running && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.sent + progress.failed} / {progress.total}</span>
                <span className="text-green-400">{progress.sent} enviados</span>
                {progress.failed > 0 && <span className="text-red-400">{progress.failed} falharam</span>}
              </div>
              <Progress value={progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0} className="h-2" />
            </div>
          )}
        </div>

        {/* Executions table */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Play className="w-4 h-4" /> Execuções Recentes
            </h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-3 px-3 font-medium">Início</th>
                      <th className="text-left py-3 px-3 font-medium">Status</th>
                      <th className="text-left py-3 px-3 font-medium">Enviados</th>
                      <th className="text-left py-3 px-3 font-medium">Falharam</th>
                      <th className="text-left py-3 px-3 font-medium">Instância</th>
                      <th className="text-left py-3 px-3 font-medium">Lista</th>
                      <th className="text-left py-3 px-3 font-medium">Template</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disparos.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma execução encontrada</td></tr>
                    ) : (
                      disparos.map((d) => (
                        <tr key={d.id} className="border-b border-border">
                          <td className="py-3 px-3 text-foreground">{new Date(d.started_at).toLocaleString("pt-BR")}</td>
                          <td className="py-3 px-3">{statusBadge(d.status)}</td>
                          <td className="py-3 px-3 text-green-400">{d.sent}</td>
                          <td className="py-3 px-3 text-red-400">{d.failed}</td>
                          <td className="py-3 px-3 text-foreground">{d.instance_name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{getListName(d.list_id)}</td>
                          <td className="py-3 px-3 text-muted-foreground">{getTemplateName(d.template_id)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisparosPage;
