import { useState, useEffect } from "react";
import { Users, Plus, Upload, ClipboardPaste, ArrowLeft, Trash2, Loader2, Zap, FileText, Pencil, Check, X, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LeadList {
  id: string;
  name: string;
  description: string;
  created_at: string;
  lead_count?: number;
  dispatched_count?: number;
  auto_dispatch?: boolean;
  dispatch_template_id?: string | null;
}

interface Template {
  id: string;
  name: string;
}

const LeadsPage = () => {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [importMode, setImportMode] = useState<"upload" | "paste">("paste");
  const [hasCountryCode, setHasCountryCode] = useState<boolean | null>(null);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchLists = async () => {
    setLoading(true);
    const [listsRes, templatesRes] = await Promise.all([
      supabase.from("lead_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("templates").select("id, name").order("created_at", { ascending: false }),
    ]);

    if (listsRes.error) {
      toast({ title: "Erro ao carregar listas", description: listsRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setTemplates(templatesRes.data || []);

    const listsWithCounts: LeadList[] = [];
    for (const list of listsRes.data || []) {
      const [totalRes, dispatchedRes] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("list_id", list.id).eq("dispatched", true),
      ]);
      listsWithCounts.push({
        ...list,
        lead_count: totalRes.count || 0,
        dispatched_count: dispatchedRes.count || 0,
      });
    }
    setLists(listsWithCounts);
    setLoading(false);
  };

  useEffect(() => { fetchLists(); }, []);

  const handleProcess = async () => {
    if (!listName.trim() || !pasteData.trim()) return;
    setSaving(true);

    const { data: newList, error: listError } = await supabase
      .from("lead_lists")
      .insert({ name: listName, description, user_id: user?.id })
      .select()
      .single();

    if (listError || !newList) {
      toast({ title: "Erro ao criar lista", description: listError?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const lines = pasteData.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "Dados insuficientes", description: "Cole ao menos o cabeçalho e uma linha", variant: "destructive" });
      setSaving(false);
      return;
    }

    const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());
    const phoneCol = headers.findIndex((h) => h.includes("telefone") || h.includes("phone") || h.includes("número") || h.includes("numero") || h.includes("celular") || h.includes("whatsapp"));
    const nameCol = headers.findIndex((h) => h.includes("nome") || h.includes("name"));

    if (phoneCol === -1) {
      toast({ title: "Coluna de telefone não encontrada", description: "Certifique-se de ter uma coluna 'Telefone' no cabeçalho", variant: "destructive" });
      setSaving(false);
      return;
    }

    const leads = lines.slice(1).map((line) => {
      const cols = line.split("\t").map((c) => c.trim());
      let phone = cols[phoneCol]?.replace(/\D/g, "") || "";
      if (!hasCountryCode && phone && !phone.startsWith("55")) {
        phone = "55" + phone;
      }
      const extra: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (i !== phoneCol && i !== nameCol && cols[i]) extra[h] = cols[i];
      });
      return {
        list_id: newList.id,
        name: nameCol >= 0 ? cols[nameCol] || "" : "",
        phone,
        extra_data: extra,
      };
    }).filter((l) => l.phone);

    if (leads.length > 0) {
      const { error: leadsError } = await supabase.from("leads").insert(leads);
      if (leadsError) {
        toast({ title: "Erro ao importar leads", description: leadsError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Lista criada!", description: `${leads.length} contatos importados` });
    setShowCreate(false);
    setListName("");
    setDescription("");
    setPasteData("");
    setSaving(false);
    fetchLists();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lead_lists").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lista excluída" });
    fetchLists();
  };

  const startEditing = (list: LeadList) => {
    setEditingId(list.id);
    setEditName(list.name);
    setEditDescription(list.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase
      .from("lead_lists")
      .update({ name: editName.trim(), description: editDescription.trim() })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setLists((prev) =>
      prev.map((l) => l.id === editingId ? { ...l, name: editName.trim(), description: editDescription.trim() } : l)
    );
    toast({ title: "Lista atualizada ✓" });
    cancelEditing();
  };

  const toggleAutoDispatch = async (listId: string, enabled: boolean) => {
    const { error } = await supabase
      .from("lead_lists")
      .update({ auto_dispatch: enabled } as any)
      .eq("id", listId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setLists((prev) => prev.map((l) => l.id === listId ? { ...l, auto_dispatch: enabled } : l));
    toast({ title: enabled ? "Disparo automático ativado ⚡" : "Disparo automático desativado" });
  };

  const setDispatchTemplate = async (listId: string, templateId: string) => {
    const { error } = await supabase
      .from("lead_lists")
      .update({ dispatch_template_id: templateId || null } as any)
      .eq("id", listId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setLists((prev) => prev.map((l) => l.id === listId ? { ...l, dispatch_template_id: templateId || null } : l));
  };

  const resetDispatched = async (listId: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ dispatched: false, dispatched_at: null } as any)
      .eq("list_id", listId);
    if (error) {
      toast({ title: "Erro ao resetar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contadores resetados" });
    fetchLists();
  };

  if (showCreate) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nova Lista de Leads</h1>
              <p className="text-sm text-muted-foreground">Importe seus contatos via arquivo ou colando dados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Nome da Lista *</Label>
                <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Ex: Leads Qualificados 2025" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o contexto desta lista..." className="bg-secondary border-border min-h-[100px]" />
              </div>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Código do País</Label>
                <p className="text-xs text-muted-foreground">Você se certificou de adicionar o código 55 na frente de todos os números?</p>
                <div className="flex gap-3">
                  <button onClick={() => setHasCountryCode(true)} className={`flex-1 py-4 rounded-xl border text-sm font-medium transition-colors ${hasCountryCode === true ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                    ✓ Sim, já adicionei
                  </button>
                  <button onClick={() => setHasCountryCode(false)} className={`flex-1 py-4 rounded-xl border text-sm font-medium transition-colors ${hasCountryCode === false ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                    Não, complemente pra mim
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex bg-secondary rounded-lg border border-border">
                <button onClick={() => setImportMode("upload")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-l-lg ${importMode === "upload" ? "bg-card text-foreground" : "text-muted-foreground"}`}>
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button onClick={() => setImportMode("paste")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-r-lg ${importMode === "paste" ? "bg-card text-foreground" : "text-muted-foreground"}`}>
                  <ClipboardPaste className="w-4 h-4" /> Colar Tabela
                </button>
              </div>

              <div>
                <p className="text-sm text-foreground mb-2">Cole a tabela do Excel ou Google Sheets</p>
                <Textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={"Exemplo de formato correto:\n\nNome\t\tTelefone\t\tCPF\nJoão Silva\t\t11999998888\t\t123456789\nMaria Santos\t21988887777\t\t987654321\n\nA primeira linha deve conter os CABEÇALHOS"}
                  className="bg-secondary border-border min-h-[200px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-2">Copie as células da planilha (incluindo cabeçalhos) e cole aqui</p>
              </div>

              <Button onClick={handleProcess} disabled={saving} className="w-full h-11 bg-primary text-primary-foreground">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : "Processar Dados"}
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas listas de contatos</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nova Lista
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : lists.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma lista de leads</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeira lista
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => {
              const total = list.lead_count || 0;
              const dispatched = list.dispatched_count || 0;
              const pct = total > 0 ? (dispatched / total) * 100 : 0;
              const isEditing = editingId === list.id;

              return (
                <div key={list.id} className="bg-card border border-border rounded-xl p-5 group relative space-y-3">
                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                      <>
                        <button onClick={() => startEditing(list)} className="text-muted-foreground hover:text-foreground p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(list.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Name & Description - editable */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm bg-secondary border-border"
                        autoFocus
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descrição"
                        className="h-8 text-xs bg-secondary border-border"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="default" className="h-7 text-xs px-3" onClick={saveEdit}>
                          <Check className="w-3 h-3 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={cancelEditing}>
                          <X className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-foreground text-sm">{list.name}</h3>
                      <p className="text-xs text-muted-foreground">{list.description || "Sem descrição"}</p>
                    </>
                  )}

                  {/* Dispatched counter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{dispatched} / {total} disparados</span>
                      <span className="text-primary font-medium">{Math.round(pct)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>

                  {/* Template selector */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Template de disparo
                    </Label>
                    <select
                      value={list.dispatch_template_id || ""}
                      onChange={(e) => setDispatchTemplate(list.id, e.target.value)}
                      className="w-full h-8 rounded-md bg-secondary border border-border px-2 text-xs text-foreground"
                    >
                      <option value="">Selecione...</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Auto dispatch toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                      <Zap className="w-3 h-3" /> Disparo automático
                    </Label>
                    <Switch
                      checked={!!list.auto_dispatch}
                      onCheckedChange={(v) => {
                        if (v && !list.dispatch_template_id) {
                          toast({ title: "Selecione um template primeiro", variant: "destructive" });
                          return;
                        }
                        toggleAutoDispatch(list.id, v);
                      }}
                    />
                  </div>

                  {dispatched > 0 && (
                    <button
                      onClick={() => resetDispatched(list.id)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Resetar contadores
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeadsPage;
