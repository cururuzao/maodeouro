import { useState, useEffect } from "react";
import { FileText, Plus, FolderOpen, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  created_at: string;
}

const TemplatesPage = () => {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("Texto");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("templates").insert({ name, type, content });
    if (error) {
      toast({ title: "Erro ao criar template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template criado!" });
      setShowCreate(false);
      setName("");
      setContent("");
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template excluído" });
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
      fetchTemplates();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Templates de Mensagem</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os seus modelos de mensagem WhatsApp</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Template
          </Button>
        </div>

        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Criar Template</h3>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do template" className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tipo</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                <option>Texto</option>
                <option>Botões</option>
                <option>Lista</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Conteúdo</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo do template..." className="bg-secondary border-border min-h-[100px]" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">PASTAS</p>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary border-l-2 border-primary">
                  <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />Todos</span>
                  <span className="text-xs">{templates.length}</span>
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-3 px-4 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 font-medium">Tipo</th>
                    <th className="py-3 px-4 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Nenhum template</td></tr>
                  ) : (
                    templates.map((t) => (
                      <tr key={t.id} className="border-b border-border hover:bg-secondary/50 cursor-pointer" onClick={() => setSelectedTemplate(t)}>
                        <td className="py-3 px-4 text-foreground flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" />{t.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{t.type}</td>
                        <td className="py-3 px-4">
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

            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center min-h-[200px]">
              {selectedTemplate ? (
                <div className="w-full">
                  <h3 className="font-semibold text-foreground mb-2">{selectedTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">Tipo: {selectedTemplate.type}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTemplate.content}</p>
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
