import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, Play, Hash, Loader2, StopCircle, Zap, TestTube, Calendar, CheckCircle2, XCircle, Clock, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  listInstances,
  getStatus,
  disconnect as disconnectInstance,
  type ZApiInstance,
  muteChat,
  archiveChat,
  deleteChat,
  updateProfileName,
  updateProfilePicture,
  updateProfileDescription,
} from "@/lib/z-api";
import { sendTemplateMessage, replaceVariables } from "@/lib/send-template-message";
import { useAuth } from "@/contexts/AuthContext";

interface LeadList { id: string; name: string; }
interface Template { id: string; name: string; type: string; content: string; metadata: Record<string, any> | null; }
interface Disparo {
  id: string; instance_name: string; template_id: string | null; list_id: string | null;
  status: string; total: number; sent: number; failed: number;
  started_at: string; finished_at: string | null; z_api_instance_id: string | null;
}

const DisparosPage = () => {
  const { user } = useAuth();
  const [instances, setInstances] = useState<ZApiInstance[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Date filter
  const [dateRange, setDateRange] = useState("7");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Form
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [delay, setDelay] = useState("3");
  const [autoStart, setAutoStart] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Execution state
  const [running, setRunning] = useState(false);
  const [currentDisparo, setCurrentDisparo] = useState<string | null>(null);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const abortRef = useRef(false);

  useEffect(() => { loadData(); }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDisparos();
    }, 5000);
    return () => clearInterval(interval);
  }, [dateRange, customStart, customEnd]);

  const getDateFilter = () => {
    if (dateRange === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const days = parseInt(dateRange) || 7;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start: start.toISOString(), end: new Date().toISOString() };
  };

  const refreshDisparos = async () => {
    const { start, end } = getDateFilter();
    const { data } = await supabase
      .from("disparos")
      .select("*")
      .gte("started_at", start)
      .lte("started_at", end)
      .order("started_at", { ascending: false })
      .limit(200);
    setDisparos((data as Disparo[]) || []);
  };

  const loadData = async () => {
    setLoading(true);
    const { start, end } = getDateFilter();
    const [instList, listsRes, templatesRes, disparosRes] = await Promise.all([
      listInstances().catch(() => []),
      supabase.from("lead_lists").select("id, name").order("created_at", { ascending: false }),
      supabase.from("templates").select("id, name, type, content, metadata").order("created_at", { ascending: false }),
      supabase.from("disparos").select("*").gte("started_at", start).lte("started_at", end).order("started_at", { ascending: false }).limit(200),
    ]);

    setInstances(instList);
    if (instList.length > 0) setSelectedInstanceId(instList[0].id);
    setLists(listsRes.data || []);
    setTemplates((templatesRes.data || []).map((t: any) => ({ ...t, metadata: t.metadata || {} })));
    setDisparos((disparosRes.data as Disparo[]) || []);
    setLoading(false);
  };

  const startDisparo = async () => {
    const inst = instances.find((i) => i.id === selectedInstanceId);
    if (!inst || !selectedList || !selectedTemplate) {
      toast({ title: "Selecione instância, lista e template", variant: "destructive" });
      return;
    }
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    if (autoStart) {
      const { data: leads } = await supabase.from("leads").select("id").eq("list_id", selectedList);
      const { error: dErr } = await supabase.from("disparos").insert({
        instance_name: inst.instance_name, template_id: selectedTemplate, list_id: selectedList,
        status: "pending", total: leads?.length || 0, sent: 0, failed: 0,
        user_id: user?.id, z_api_instance_id: inst.id, auto_start: true,
      } as any);
      if (dErr) toast({ title: "Erro", description: dErr.message, variant: "destructive" });
      else { toast({ title: "Disparo agendado! ⏳" }); loadData(); }
      return;
    }

    const { data: leads, error } = await supabase.from("leads").select("phone, name, extra_data").eq("list_id", selectedList);
    if (error || !leads || leads.length === 0) {
      toast({ title: "Nenhum lead encontrado", variant: "destructive" }); return;
    }

    const meta = template.metadata || {};
    if (meta.profileName) try { await updateProfileName(inst, meta.profileName); } catch {}
    if (meta.profilePictureUrl) try { await updateProfilePicture(inst, meta.profilePictureUrl); } catch {}
    if (meta.profileDescription) try { await updateProfileDescription(inst, meta.profileDescription); } catch {}

    const { data: disparo, error: dErr } = await supabase.from("disparos").insert({
      instance_name: inst.instance_name, template_id: selectedTemplate, list_id: selectedList,
      status: "running", total: leads.length, sent: 0, failed: 0,
      user_id: user?.id, z_api_instance_id: inst.id,
    } as any).select().single();

    if (dErr || !disparo) { toast({ title: "Erro", description: dErr?.message, variant: "destructive" }); return; }

    setRunning(true); setCurrentDisparo(disparo.id);
    setProgress({ sent: 0, failed: 0, total: leads.length }); abortRef.current = false;

    let sent = 0, failed = 0;
    const delayMs = Number(delay) * 1000;
    let consecutiveFailures = 0;

    for (let i = 0; i < leads.length; i++) {
      if (abortRef.current) break;
      const lead = leads[i];
      if (i % 5 === 0 || consecutiveFailures >= 2) {
        try {
          const status = await getStatus(inst);
          if (!status.connected || !status.smartphoneConnected) {
            toast({ title: "⚠️ Instância desconectada!", variant: "destructive" });
            try { await disconnectInstance(inst); } catch {}
            abortRef.current = true; break;
          }
        } catch { if (consecutiveFailures >= 2) { abortRef.current = true; break; } }
      }
      const text = replaceVariables(template.content, lead as any);
      try {
        await sendTemplateMessage(inst, lead.phone, text, template.type, template.metadata || {});
        sent++; consecutiveFailures = 0;
        try { await muteChat(inst, lead.phone); await new Promise(r => setTimeout(r, 300));
          await archiveChat(inst, lead.phone); await new Promise(r => setTimeout(r, 300));
          await deleteChat(inst, lead.phone); } catch {}
      } catch { failed++; consecutiveFailures++; }
      setProgress({ sent, failed, total: leads.length });
      if ((sent + failed) % 5 === 0) await supabase.from("disparos").update({ sent, failed }).eq("id", disparo.id);
      if (i < leads.length - 1 && !abortRef.current && delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    await supabase.from("disparos").update({ sent, failed, status: abortRef.current ? "cancelled" : "completed", finished_at: new Date().toISOString() }).eq("id", disparo.id);
    setRunning(false); setCurrentDisparo(null);
    toast({ title: abortRef.current ? "Disparo cancelado" : "Disparo concluído!", description: `${sent} enviados, ${failed} falharam` });
    loadData();
  };

  const stopDisparo = () => { abortRef.current = true; };

  const sendTestMessage = async () => {
    const inst = instances.find((i) => i.id === selectedInstanceId);
    if (!inst) { toast({ title: "Selecione uma instância", variant: "destructive" }); return; }
    if (!selectedTemplate) { toast({ title: "Selecione um template", variant: "destructive" }); return; }
    let phone = testPhone.replace(/\D/g, "");
    if (!phone || phone.length < 10) { toast({ title: "Número inválido", variant: "destructive" }); return; }
    if (!phone.startsWith("55")) phone = "55" + phone;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setSendingTest(true);
    try {
      const status = await getStatus(inst);
      if (!status.connected) { toast({ title: "⚠️ Instância desconectada", variant: "destructive" }); setSendingTest(false); return; }
      const text = replaceVariables(template.content, { name: "Teste", phone });
      await sendTemplateMessage(inst, phone, text, template.type, template.metadata || {});
      toast({ title: "✅ Teste enviado!", description: `Para ${phone}` });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setSendingTest(false); }
  };

  const getListName = (id: string | null) => lists.find((l) => l.id === id)?.name || "-";
  const getTemplateName = (id: string | null) => templates.find((t) => t.id === id)?.name || "-";
  const formatDT = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // Categorize disparos
  const runningDisparos = disparos.filter(d => d.status === "running" || d.status === "pending");
  const completedDisparos = disparos.filter(d => d.status === "completed");
  const failedDisparos = disparos.filter(d => d.status === "cancelled" || d.status === "failed");

  const totalSent = disparos.reduce((a, d) => a + d.sent, 0);
  const totalFailed = disparos.reduce((a, d) => a + d.failed, 0);

  const dateLabel = () => {
    const { start, end } = getDateFilter();
    const s = new Date(start); const e = new Date(end);
    return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  };

  const DisparoEntry = ({ d }: { d: Disparo }) => {
    const isRunning = d.status === "running";
    const isCompleted = d.status === "completed";
    const isCancelled = d.status === "cancelled" || d.status === "failed";

    return (
      <div className="flex items-start gap-3 py-3 border-b border-border last:border-0 px-4">
        <div className="mt-0.5">
          {isRunning ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          ) : isCompleted ? (
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          ) : (
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{d.instance_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Send className="w-3 h-3" /> {d.sent}/{d.total}
              {d.failed > 0 && <span className="text-destructive ml-1">({d.failed} falhas)</span>}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" /> {getListName(d.list_id)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              📝 {getTemplateName(d.template_id)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDT(d.started_at)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disparos</h1>
            <p className="text-sm text-muted-foreground">Histórico e acompanhamento de campanhas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showForm ? "default" : "outline"}
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="gap-1.5"
            >
              {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {showForm ? "Fechar" : "Novo Disparo"}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-500 font-medium">
            <Wifi className="w-4 h-4" /> Em execução <strong>{runningDisparos.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Concluídos <strong>{completedDisparos.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <XCircle className="w-4 h-4 text-destructive" /> Cancelados <strong>{failedDisparos.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <Send className="w-4 h-4 text-primary" /> Enviados <strong>{totalSent}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-destructive font-medium">
            Falhas <strong>{totalFailed}</strong>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); }}
              className="h-8 rounded-md bg-secondary border border-border px-2 text-xs text-foreground"
            >
              <option value="1">Hoje</option>
              <option value="3">3 dias</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {dateLabel()}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="flex items-center gap-3">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 w-40 text-xs bg-secondary border-border" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 w-40 text-xs bg-secondary border-border" />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={loadData}>Filtrar</Button>
          </div>
        )}

        {/* New Disparo Form (collapsible) */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4" /> Novo Disparo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Instância</Label>
                <select value={selectedInstanceId} onChange={(e) => setSelectedInstanceId(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                  {instances.length === 0 && <option value="">Nenhuma instância</option>}
                  {instances.map((inst) => <option key={inst.id} value={inst.id}>{inst.instance_name}</option>)}
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
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Intervalo (seg)</Label>
                <Input type="number" value={delay} onChange={(e) => setDelay(e.target.value)} min="1" max="30" className="h-10 bg-secondary border-border w-28" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={autoStart} onCheckedChange={setAutoStart} id="auto-start" />
                <Label htmlFor="auto-start" className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <Zap className="w-3.5 h-3.5" /> Auto-iniciar
                </Label>
              </div>
              {running ? (
                <Button variant="destructive" onClick={stopDisparo} className="h-10">
                  <StopCircle className="w-4 h-4 mr-2" /> Parar
                </Button>
              ) : (
                <Button onClick={startDisparo} disabled={loading} className="h-10">
                  <Play className="w-4 h-4 mr-2" /> Iniciar
                </Button>
              )}
            </div>

            {running && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.sent + progress.failed} / {progress.total}</span>
                  <span className="text-green-500">{progress.sent} enviados</span>
                  {progress.failed > 0 && <span className="text-destructive">{progress.failed} falharam</span>}
                </div>
                <Progress value={progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0} className="h-2" />
              </div>
            )}

            <div className="flex items-end gap-3 pt-3 border-t border-border">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <TestTube className="w-3.5 h-3.5" /> Enviar teste
                </Label>
                <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="5511999999999" className="h-10 bg-secondary border-border" />
              </div>
              <Button variant="outline" onClick={sendTestMessage} disabled={sendingTest || !selectedTemplate || !selectedInstanceId} className="h-10">
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar Teste
              </Button>
            </div>
          </div>
        )}

        {/* 3-column layout */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Em Execução */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-green-500 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4" /> Em Execução
                </h3>
                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">{runningDisparos.length}</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {runningDisparos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum disparo em execução</p>
                ) : (
                  runningDisparos.map((d) => <DisparoEntry key={d.id} d={d} />)
                )}
              </div>
            </div>

            {/* Column 2: Concluídos */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Concluídos
                </h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{completedDisparos.length}</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {completedDisparos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum disparo concluído</p>
                ) : (
                  completedDisparos.map((d) => <DisparoEntry key={d.id} d={d} />)
                )}
              </div>
            </div>

            {/* Column 3: Cancelados/Falhas */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Cancelados
                </h3>
                <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">{failedDisparos.length}</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {failedDisparos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum disparo cancelado</p>
                ) : (
                  failedDisparos.map((d) => <DisparoEntry key={d.id} d={d} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DisparosPage;
