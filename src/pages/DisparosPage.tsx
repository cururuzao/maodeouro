import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, Play, BarChart3, Hash, Loader2, StopCircle, Zap, TestTube } from "lucide-react";
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
  removeInstance,
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

interface LeadList {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  metadata: Record<string, any> | null;
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
  z_api_instance_id: string | null;
}

const DisparosPage = () => {
  const { user } = useAuth();
  const [instances, setInstances] = useState<ZApiInstance[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [instList, listsRes, templatesRes, disparosRes] = await Promise.all([
      listInstances().catch(() => []),
      supabase.from("lead_lists").select("id, name").order("created_at", { ascending: false }),
      supabase.from("templates").select("id, name, type, content, metadata").order("created_at", { ascending: false }),
      supabase.from("disparos").select("*").order("started_at", { ascending: false }).limit(50),
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

    // If auto_start is on, create as pending and let the cron handle it
    if (autoStart) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .eq("list_id", selectedList);

      const { error: dErr } = await supabase
        .from("disparos")
        .insert({
          instance_name: inst.instance_name,
          template_id: selectedTemplate,
          list_id: selectedList,
          status: "pending",
          total: leads?.length || 0,
          sent: 0,
          failed: 0,
          user_id: user?.id,
          z_api_instance_id: inst.id,
          auto_start: true,
        } as any);

      if (dErr) {
        toast({ title: "Erro ao criar disparo", description: dErr.message, variant: "destructive" });
      } else {
        toast({ title: "Disparo agendado! ⏳", description: "Será iniciado automaticamente quando a instância conectar." });
        loadData();
      }
      return;
    }

    const { data: leads, error } = await supabase
      .from("leads")
      .select("phone, name, extra_data")
      .eq("list_id", selectedList);

    if (error || !leads || leads.length === 0) {
      toast({ title: "Nenhum lead encontrado nesta lista", variant: "destructive" });
      return;
    }

    // Update profile before sending
    const meta = template.metadata || {};
    if (meta.profileName) {
      try { await updateProfileName(inst, meta.profileName); } catch { /* ignore */ }
    }
    if (meta.profilePictureUrl) {
      try { await updateProfilePicture(inst, meta.profilePictureUrl); } catch { /* ignore */ }
    }
    if (meta.profileDescription) {
      try { await updateProfileDescription(inst, meta.profileDescription); } catch { /* ignore */ }
    }

    const { data: disparo, error: dErr } = await supabase
      .from("disparos")
      .insert({
        instance_name: inst.instance_name,
        template_id: selectedTemplate,
        list_id: selectedList,
        status: "running",
        total: leads.length,
        sent: 0,
        failed: 0,
        user_id: user?.id,
        z_api_instance_id: inst.id,
      } as any)
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

    let consecutiveFailures = 0;

    for (let i = 0; i < leads.length; i++) {
      if (abortRef.current) break;
      const lead = leads[i];

      // Check instance health every 5 leads or after consecutive failures
      if (i % 5 === 0 || consecutiveFailures >= 2) {
        try {
          const status = await getStatus(inst);
          console.log(`[Disparo] Status check:`, JSON.stringify(status));
          if (!status.connected || !status.smartphoneConnected) {
            toast({
              title: "⚠️ Instância desconectada!",
              description: "O número pode ter sido banido ou caiu. Disparo interrompido.",
              variant: "destructive",
            });
            // Disconnect the instance
            try { await disconnectInstance(inst); } catch { /* ignore */ }
            abortRef.current = true;
            break;
          }
        } catch (err) {
          console.warn("[Disparo] Erro ao verificar status:", err);
          // If we can't check status after failures, stop
          if (consecutiveFailures >= 2) {
            toast({
              title: "⚠️ Não foi possível verificar a instância",
              description: "Disparo interrompido por segurança.",
              variant: "destructive",
            });
            abortRef.current = true;
            break;
          }
        }
      }

      const text = replaceVariables(template.content, lead as any);

      try {
        await sendTemplateMessage(inst, lead.phone, text, template.type, template.metadata || {});
        sent++;
        consecutiveFailures = 0;

        // Post-send: Mute → Archive → Delete
        try {
          await muteChat(inst, lead.phone);
          await new Promise((r) => setTimeout(r, 300));
          await archiveChat(inst, lead.phone);
          await new Promise((r) => setTimeout(r, 300));
          await deleteChat(inst, lead.phone);
        } catch { /* ignore post-send errors */ }

      } catch (err: any) {
        failed++;
        consecutiveFailures++;
        console.error(`[Disparo] Falha ao enviar para ${lead.phone}:`, err?.message);
      }

      setProgress({ sent, failed, total: leads.length });

      if ((sent + failed) % 5 === 0 || sent + failed === leads.length) {
        await supabase.from("disparos").update({ sent, failed }).eq("id", disparo.id);
      }

      if (i < leads.length - 1 && !abortRef.current && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

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

  const sendTestMessage = async () => {
    const inst = instances.find((i) => i.id === selectedInstanceId);
    if (!inst) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }
    if (!selectedTemplate) {
      toast({ title: "Selecione um template", variant: "destructive" });
      return;
    }
    let phone = testPhone.replace(/\D/g, "");
    if (!phone || phone.length < 10) {
      toast({ title: "Digite um número válido (ex: 11999999999)", variant: "destructive" });
      return;
    }
    // Auto-add Brazil country code
    if (!phone.startsWith("55")) {
      phone = "55" + phone;
    }
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    setSendingTest(true);
    try {
      // Check instance status first
      const status = await getStatus(inst);
      console.log("[Teste] Status da instância:", JSON.stringify(status));
      if (!status.connected) {
        toast({ title: "⚠️ Instância desconectada", description: "Conecte a instância antes de enviar.", variant: "destructive" });
        setSendingTest(false);
        return;
      }

      console.log("[Teste] Enviando para:", phone, "Template:", template.name, "Tipo:", template.type);
      const text = replaceVariables(template.content, { name: "Teste", phone });
      console.log("[Teste] Texto:", text);
      const result = await sendTemplateMessage(inst, phone, text, template.type, template.metadata || {});
      console.log("[Teste] Resultado:", JSON.stringify(result));
      toast({ title: "✅ Mensagem de teste enviada!", description: `Enviada para ${phone}` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
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
              <select value={selectedInstanceId} onChange={(e) => setSelectedInstanceId(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                {instances.length === 0 && <option value="">Nenhuma instância</option>}
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.instance_name}</option>
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
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Intervalo (seg)</Label>
              <Input type="number" value={delay} onChange={(e) => setDelay(e.target.value)} min="1" max="30" className="h-10 bg-secondary border-border w-28" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch checked={autoStart} onCheckedChange={setAutoStart} id="auto-start" />
              <Label htmlFor="auto-start" className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer">
                <Zap className="w-3.5 h-3.5" />
                Auto-iniciar ao conectar
              </Label>
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

          {/* Test send */}
          <div className="flex items-end gap-3 pt-3 border-t border-border">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                <TestTube className="w-3.5 h-3.5" /> Enviar teste
              </Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999999999"
                className="h-10 bg-secondary border-border"
              />
            </div>
            <Button
              variant="outline"
              onClick={sendTestMessage}
              disabled={sendingTest || !selectedTemplate || !selectedInstanceId}
              className="h-10"
            >
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Teste
            </Button>
          </div>
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
