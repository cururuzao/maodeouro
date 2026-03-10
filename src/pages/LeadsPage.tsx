import { useState } from "react";
import { Users, Plus, Upload, ClipboardPaste, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";

const LeadsPage = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [importMode, setImportMode] = useState<"upload" | "paste">("paste");
  const [hasCountryCode, setHasCountryCode] = useState<boolean | null>(null);

  // Saved lists (localStorage for now)
  const [lists, setLists] = useState<{ name: string; description: string; count: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lead_lists") || "[]");
    } catch { return []; }
  });

  const handleProcess = () => {
    if (!listName.trim() || !pasteData.trim()) return;
    const lines = pasteData.split("\n").filter((l) => l.trim());
    const newList = { name: listName, description, count: lines.length - 1 }; // -1 for header
    const updated = [...lists, newList];
    setLists(updated);
    localStorage.setItem("lead_lists", JSON.stringify(updated));
    setShowCreate(false);
    setListName("");
    setDescription("");
    setPasteData("");
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
            {/* Left */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Nome da Lista *</Label>
                <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Ex: Leads Qualificados 2025" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o contexto desta lista..." className="bg-secondary border-border min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Pasta</Label>
                <select className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
                  <option>Sem pasta</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Código do País</Label>
                <p className="text-xs text-muted-foreground">Você se certificou de adicionar o código 55 na frente de todos os números?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasCountryCode(true)}
                    className={`flex-1 py-4 rounded-xl border text-sm font-medium transition-colors ${hasCountryCode === true ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}
                  >
                    ✓ Sim, já adicionei
                  </button>
                  <button
                    onClick={() => setHasCountryCode(false)}
                    className={`flex-1 py-4 rounded-xl border text-sm font-medium transition-colors ${hasCountryCode === false ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}
                  >
                    Não, complemente pra mim
                  </button>
                </div>
              </div>
            </div>

            {/* Right */}
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

              <Button onClick={handleProcess} className="w-full h-11 bg-primary text-primary-foreground">
                Processar Dados
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

        {lists.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma lista de leads</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeira lista
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground text-sm">{list.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{list.description || "Sem descrição"}</p>
                <p className="text-xs text-primary mt-2">{list.count} contatos</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeadsPage;
