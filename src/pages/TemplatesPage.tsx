import { useState, useEffect, useMemo } from "react";
import { FileText, Plus, FolderOpen, Trash2, Loader2, X, Image, Video, File, MapPin, Contact, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TEMPLATE_TYPES = [
  { value: "text", label: "Texto" },
  { value: "buttons", label: "Botões" },
  { value: "list", label: "Lista" },
  { value: "media", label: "Mídia" },
  { value: "contact", label: "Contato" },
  { value: "location", label: "Localização" },
];

const VARIABLES = [
  { tag: "{{nome}}", label: "Nome", sample: "João Silva" },
  { tag: "{{telefone}}", label: "Telefone", sample: "5511999999999" },
  { tag: "{{email}}", label: "Email", sample: "joao@email.com" },
  { tag: "{{empresa}}", label: "Empresa", sample: "Acme Ltda" },
  { tag: "{{data}}", label: "Data", sample: new Date().toLocaleDateString("pt-BR") },
  { tag: "{{hora}}", label: "Hora", sample: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
];

interface TemplateButton {
  id: string;
  text: string;
  type: "reply" | "url" | "call";
  url?: string;
  phoneNumber?: string;
}

interface TemplateMetadata {
  footer?: string;
  buttons?: TemplateButton[];
  listButtonText?: string;
  listSections?: { title: string; rows: { id: string; title: string; description: string }[] }[];
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  fileName?: string;
  contactName?: string;
  contactNumber?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  locationAddress?: string;
  // Profile customization (applied when disparo starts)
  profileName?: string;
  profilePictureUrl?: string;
  profileDescription?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  metadata: TemplateMetadata;
  created_at: string;
}

const TemplatesPage = () => {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState<TemplateMetadata>({});

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates((data || []).map((t: any) => ({ ...t, metadata: t.metadata || {} })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => {
    setName("");
    setType("text");
    setContent("");
    setMeta({});
    setEditingTemplate(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (t: Template) => {
    setName(t.name);
    setType(t.type);
    setContent(t.content);
    setMeta(t.metadata || {});
    setEditingTemplate(t);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);

    const payload = { name, type, content, metadata: meta as any, user_id: user?.id };

    if (editingTemplate) {
      const { error } = await supabase.from("templates").update(payload).eq("id", editingTemplate.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("templates").insert([payload]);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Template criado!" });
    }

    setShowCreate(false);
    resetForm();
    fetchTemplates();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Template excluído" });
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
      fetchTemplates();
    }
  };

  const insertVariable = (tag: string) => {
    setContent((prev) => prev + tag);
  };

  // Live preview with sample data
  const previewContent = useMemo(() => {
    let text = content;
    VARIABLES.forEach((v) => {
      text = text.split(v.tag).join(v.sample);
    });
    return text;
  }, [content]);

  const previewTemplate = selectedTemplate
    ? (() => {
        let text = selectedTemplate.content;
        VARIABLES.forEach((v) => { text = text.split(v.tag).join(v.sample); });
        return { ...selectedTemplate, previewContent: text };
      })()
    : null;

  // Button helpers
  const addButton = (btnType: "reply" | "url" | "call" = "reply") => {
    const buttons = meta.buttons || [];
    if (buttons.length >= 3) return;
    setMeta({ ...meta, buttons: [...buttons, { id: `btn_${Date.now()}`, text: "", type: btnType }] });
  };
  const updateButton = (index: number, field: string, value: string) => {
    const buttons = [...(meta.buttons || [])];
    buttons[index] = { ...buttons[index], [field]: value };
    setMeta({ ...meta, buttons });
  };
  const removeButton = (index: number) => {
    const buttons = [...(meta.buttons || [])];
    buttons.splice(index, 1);
    setMeta({ ...meta, buttons });
  };

  // List helpers
  const addSection = () => {
    const sections = meta.listSections || [];
    setMeta({ ...meta, listSections: [...sections, { title: "", rows: [{ id: `row_${Date.now()}`, title: "", description: "" }] }] });
  };
  const updateSection = (si: number, title: string) => {
    const sections = [...(meta.listSections || [])];
    sections[si] = { ...sections[si], title };
    setMeta({ ...meta, listSections: sections });
  };
  const addRow = (si: number) => {
    const sections = [...(meta.listSections || [])];
    sections[si].rows.push({ id: `row_${Date.now()}`, title: "", description: "" });
    setMeta({ ...meta, listSections: sections });
  };
  const updateRow = (si: number, ri: number, field: "title" | "description", value: string) => {
    const sections = [...(meta.listSections || [])];
    sections[si].rows[ri] = { ...sections[si].rows[ri], [field]: value };
    setMeta({ ...meta, listSections: sections });
  };
  const removeRow = (si: number, ri: number) => {
    const sections = [...(meta.listSections || [])];
    sections[si].rows.splice(ri, 1);
    if (sections[si].rows.length === 0) sections.splice(si, 1);
    setMeta({ ...meta, listSections: sections });
  };

  // ─── Render ──────────────────────────────────────────────

  const renderTypeFields = () => {
    switch (type) {
      case "buttons":
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Rodapé (footer)</Label>
            <Input value={meta.footer || ""} onChange={(e) => setMeta({ ...meta, footer: e.target.value })} placeholder="Texto do rodapé" className="bg-secondary border-border" />

            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Botões (máx. 3)</Label>
              {(meta.buttons?.length || 0) < 3 && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => addButton("reply")}><Plus className="w-3 h-3 mr-1" />Resposta</Button>
                  <Button variant="ghost" size="sm" onClick={() => addButton("url")}><Plus className="w-3 h-3 mr-1" />Link</Button>
                  <Button variant="ghost" size="sm" onClick={() => addButton("call")}><Plus className="w-3 h-3 mr-1" />Ligar</Button>
                </div>
              )}
            </div>
            {(meta.buttons || []).map((btn, i) => (
              <div key={i} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {btn.type === "url" ? "🔗 Link" : btn.type === "call" ? "📞 Ligar" : "💬 Resposta"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeButton(i)}><X className="w-3 h-3" /></Button>
                </div>
                <Input value={btn.text} onChange={(e) => updateButton(i, "text", e.target.value)} placeholder="Texto do botão" className="bg-secondary border-border" />
                {btn.type === "url" && (
                  <Input value={btn.url || ""} onChange={(e) => updateButton(i, "url", e.target.value)} placeholder="https://seusite.com" className="bg-secondary border-border" />
                )}
                {btn.type === "call" && (
                  <Input value={btn.phoneNumber || ""} onChange={(e) => updateButton(i, "phoneNumber", e.target.value)} placeholder="5511999999999" className="bg-secondary border-border" />
                )}
              </div>
            ))}
          </div>
        );

      case "list":
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Rodapé (footer)</Label>
            <Input value={meta.footer || ""} onChange={(e) => setMeta({ ...meta, footer: e.target.value })} placeholder="Texto do rodapé" className="bg-secondary border-border" />

            <Label className="text-sm text-muted-foreground">Texto do botão da lista</Label>
            <Input value={meta.listButtonText || ""} onChange={(e) => setMeta({ ...meta, listButtonText: e.target.value })} placeholder="Ver opções" className="bg-secondary border-border" />

            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Seções</Label>
              <Button variant="ghost" size="sm" onClick={addSection}><Plus className="w-3 h-3 mr-1" />Seção</Button>
            </div>
            {(meta.listSections || []).map((section, si) => (
              <div key={si} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                <Input value={section.title} onChange={(e) => updateSection(si, e.target.value)} placeholder="Título da seção" className="bg-secondary border-border text-sm" />
                {section.rows.map((row, ri) => (
                  <div key={ri} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input value={row.title} onChange={(e) => updateRow(si, ri, "title", e.target.value)} placeholder="Título da opção" className="bg-secondary border-border text-xs h-8" />
                      <Input value={row.description} onChange={(e) => updateRow(si, ri, "description", e.target.value)} placeholder="Descrição (opcional)" className="bg-secondary border-border text-xs h-8" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeRow(si, ri)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addRow(si)} className="text-xs"><Plus className="w-3 h-3 mr-1" />Opção</Button>
              </div>
            ))}
          </div>
        );

      case "media":
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Tipo de mídia</Label>
            <select value={meta.mediaType || "image"} onChange={(e) => setMeta({ ...meta, mediaType: e.target.value as any })} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="document">Documento</option>
              <option value="audio">Áudio</option>
            </select>
            <Label className="text-sm text-muted-foreground">URL da mídia</Label>
            <Input value={meta.mediaUrl || ""} onChange={(e) => setMeta({ ...meta, mediaUrl: e.target.value })} placeholder="https://..." className="bg-secondary border-border" />
            {(meta.mediaType === "document") && (
              <>
                <Label className="text-sm text-muted-foreground">Nome do arquivo</Label>
                <Input value={meta.fileName || ""} onChange={(e) => setMeta({ ...meta, fileName: e.target.value })} placeholder="documento.pdf" className="bg-secondary border-border" />
              </>
            )}
            <Label className="text-sm text-muted-foreground">Rodapé (footer)</Label>
            <Input value={meta.footer || ""} onChange={(e) => setMeta({ ...meta, footer: e.target.value })} placeholder="Texto do rodapé" className="bg-secondary border-border" />
          </div>
        );

      case "contact":
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Nome do contato</Label>
            <Input value={meta.contactName || ""} onChange={(e) => setMeta({ ...meta, contactName: e.target.value })} placeholder="João Silva" className="bg-secondary border-border" />
            <Label className="text-sm text-muted-foreground">Número do contato</Label>
            <Input value={meta.contactNumber || ""} onChange={(e) => setMeta({ ...meta, contactNumber: e.target.value })} placeholder="5511999999999" className="bg-secondary border-border" />
          </div>
        );

      case "location":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input value={meta.latitude || ""} onChange={(e) => setMeta({ ...meta, latitude: e.target.value })} placeholder="-23.5505" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input value={meta.longitude || ""} onChange={(e) => setMeta({ ...meta, longitude: e.target.value })} placeholder="-46.6333" className="bg-secondary border-border" />
              </div>
            </div>
            <Label className="text-sm text-muted-foreground">Nome do local</Label>
            <Input value={meta.locationName || ""} onChange={(e) => setMeta({ ...meta, locationName: e.target.value })} placeholder="Escritório" className="bg-secondary border-border" />
            <Label className="text-sm text-muted-foreground">Endereço</Label>
            <Input value={meta.locationAddress || ""} onChange={(e) => setMeta({ ...meta, locationAddress: e.target.value })} placeholder="Av. Paulista, 1000" className="bg-secondary border-border" />
          </div>
        );

      default: // text
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Rodapé (footer)</Label>
            <Input value={meta.footer || ""} onChange={(e) => setMeta({ ...meta, footer: e.target.value })} placeholder="Texto do rodapé (opcional)" className="bg-secondary border-border" />
          </div>
        );
    }
  };

  // ─── Phone Preview ──────────────────────────────────────

  const renderPhonePreview = (text: string, m: TemplateMetadata, tType: string) => (
    <div className="w-full max-w-[280px] mx-auto">
      {/* Phone frame */}
      <div className="bg-[hsl(var(--secondary))] rounded-2xl p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs text-primary font-bold">W</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">WhatsApp Preview</p>
            <p className="text-[10px] text-muted-foreground">online</p>
          </div>
        </div>

        {/* Message bubble */}
        <div className="bg-card rounded-xl rounded-tl-sm p-3 space-y-2 shadow-sm">
          {tType === "media" && m.mediaUrl && (
            <div className="bg-secondary rounded-lg h-32 flex items-center justify-center">
              {m.mediaType === "image" ? <Image className="w-8 h-8 text-muted-foreground" /> :
               m.mediaType === "video" ? <Video className="w-8 h-8 text-muted-foreground" /> :
               <File className="w-8 h-8 text-muted-foreground" />}
            </div>
          )}
          {tType === "location" && (
            <div className="bg-secondary rounded-lg h-24 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {tType === "contact" && (
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
              <Contact className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground">{m.contactName || "Contato"}</span>
            </div>
          )}

          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>

          {m.footer && (
            <p className="text-[10px] text-muted-foreground italic">{m.footer}</p>
          )}

          <p className="text-[9px] text-muted-foreground text-right">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Buttons */}
        {tType === "buttons" && (m.buttons || []).length > 0 && (
          <div className="space-y-1 mt-1">
            {(m.buttons || []).map((btn: any, i: number) => (
              <div key={i} className="bg-card rounded-lg py-2 text-center text-xs text-primary font-medium shadow-sm flex items-center justify-center gap-1">
                {btn.type === "url" && <span>🔗</span>}
                {btn.type === "call" && <span>📞</span>}
                {btn.text || `Botão ${i + 1}`}
              </div>
            ))}
          </div>
        )}

        {/* List button */}
        {tType === "list" && (
          <div className="mt-1">
            <div className="bg-card rounded-lg py-2 text-center text-xs text-primary font-medium shadow-sm">
              ☰ {m.listButtonText || "Ver opções"}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Create/Edit Form ──────────────────────────────────

  if (showCreate) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure o tipo, conteúdo e variáveis dinâmicas
              </p>
            </div>
            <Button variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - Form */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Nome do template</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas Lead" className="bg-secondary border-border" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Tipo de mensagem</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATE_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          type === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Conteúdo da mensagem</Label>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={type === "media" ? "Legenda da mídia..." : "Digite sua mensagem... Use {{nome}} para variáveis"}
                    className="bg-secondary border-border min-h-[120px]"
                  />
                </div>

                {/* Variable chips */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Variable className="w-3 h-3" /> Variáveis dinâmicas (clique para inserir)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        onClick={() => insertVariable(v.tag)}
                        className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type-specific fields */}
                {renderTypeFields()}

                {/* Profile customization */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <Label className="text-sm font-medium text-foreground">Personalização do Perfil (ao disparar)</Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nome do perfil</Label>
                    <Input value={meta.profileName || ""} onChange={(e) => setMeta({ ...meta, profileName: e.target.value })} placeholder="Nome que aparecerá no WhatsApp" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">URL da foto de perfil</Label>
                    <Input value={meta.profilePictureUrl || ""} onChange={(e) => setMeta({ ...meta, profilePictureUrl: e.target.value })} placeholder="https://... (URL da imagem)" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Recado (sobre)</Label>
                    <Input value={meta.profileDescription || ""} onChange={(e) => setMeta({ ...meta, profileDescription: e.target.value })} placeholder="Recado do perfil" className="bg-secondary border-border" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-11">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTemplate ? "Salvar alterações" : "Criar template"}
              </Button>
            </div>

            {/* Right - Live Preview */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Preview em tempo real</h3>
                {renderPhonePreview(previewContent, meta, type)}

                {/* List sections preview */}
                {type === "list" && (meta.listSections || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Seções da lista:</p>
                    {(meta.listSections || []).map((section, si) => (
                      <div key={si} className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-foreground">{section.title || "Sem título"}</p>
                        {section.rows.map((row, ri) => (
                          <div key={ri} className="ml-2 mt-1">
                            <p className="text-xs text-foreground">• {row.title || "Opção"}</p>
                            {row.description && <p className="text-[10px] text-muted-foreground ml-3">{row.description}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variables reference */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Referência de variáveis</h3>
                <div className="space-y-1.5">
                  {VARIABLES.map((v) => (
                    <div key={v.tag} className="flex items-center justify-between text-xs">
                      <code className="text-primary font-mono bg-primary/5 px-1.5 py-0.5 rounded">{v.tag}</code>
                      <span className="text-muted-foreground">{v.label} → <span className="text-foreground">{v.sample}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── List View ──────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Templates de Mensagem</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os seus modelos de mensagem WhatsApp</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Template
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Folders */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">PASTAS</p>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary border-l-2 border-primary">
                  <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />Todos</span>
                  <span className="text-xs">{templates.length}</span>
                </button>
              </div>
              {/* Type breakdown */}
              <div className="mt-4 space-y-1">
                {TEMPLATE_TYPES.map((tt) => {
                  const count = templates.filter((t) => t.type === tt.value).length;
                  if (count === 0) return null;
                  return (
                    <div key={tt.value} className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground">
                      <span>{tt.label}</span>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Templates list */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-3 px-4 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 font-medium">Tipo</th>
                    <th className="py-3 px-4 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Nenhum template</td></tr>
                  ) : (
                    templates.map((t) => (
                      <tr key={t.id} className="border-b border-border hover:bg-secondary/50 cursor-pointer" onClick={() => setSelectedTemplate(t)}>
                        <td className="py-3 px-4 text-foreground flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" />{t.name}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{TEMPLATE_TYPES.find((tt) => tt.value === t.type)?.label || t.type}</td>
                        <td className="py-3 px-4 flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="text-muted-foreground hover:text-primary text-xs">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Preview */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center min-h-[300px]">
              {previewTemplate ? (
                <div className="w-full">
                  <h3 className="font-semibold text-foreground mb-1">{previewTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {TEMPLATE_TYPES.find((t) => t.value === previewTemplate.type)?.label || previewTemplate.type}
                  </p>
                  {renderPhonePreview(previewTemplate.previewContent, previewTemplate.metadata, previewTemplate.type)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione um template para visualizar</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TemplatesPage;
