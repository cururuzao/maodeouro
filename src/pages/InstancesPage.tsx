import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, Trash2, WifiOff, Loader2, X, Link2, User, Phone, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchInstances, createInstance, deleteInstance, connectInstance,
  logoutInstance,
} from "@/lib/evolution-api";

interface NormalizedInstance {
  name: string;
  owner: string;
  connectionStatus: string;
}

function normalizeInstances(data: any[]): NormalizedInstance[] {
  return data
    .map((item: any) => {
      const name = item?.instance?.instanceName || item?.name;
      if (!name) return null;
      const status = item?.instance?.status || item?.connectionStatus || "close";
      const owner = item?.instance?.owner || item?.ownerJid || "";
      return { name, owner, connectionStatus: status };
    })
    .filter(Boolean) as NormalizedInstance[];
}

const InstancesPage = () => {
  const [instances, setInstances] = useState<NormalizedInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newIntegration, setNewIntegration] = useState<"WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS">("WHATSAPP-BAILEYS");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInstances();
      const list = normalizeInstances(Array.isArray(data) ? data : []);
      setInstances(list);
    } catch (err: any) {
      toast({ title: "Erro ao carregar instâncias", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createInstance(newName.trim(), newIntegration);
      toast({ title: `Instância "${newName}" criada!`, description: `Tipo: ${newIntegration === "WHATSAPP-BUSINESS" ? "Cloud API (Oficial)" : "Baileys"}` });
      setNewName("");
      setNewIntegration("WHATSAPP-BAILEYS");
      setShowCreate(false);
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Deletar instância "${name}"?`)) return;
    try {
      await deleteInstance(name);
      toast({ title: `Instância "${name}" removida` });
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro ao deletar", description: err.message, variant: "destructive" });
    }
  };

  const handleConnect = (name: string) => {
    setConnectingInstance(name);
    setPhoneNumber("");
    setPairingCode(null);
  };

  const handlePairWithPhone = async () => {
    if (!connectingInstance || !phoneNumber.trim()) return;
    try {
      const result = await connectInstance(connectingInstance, phoneNumber.trim());
      if (result?.pairingCode) {
        setPairingCode(result.pairingCode);
      } else {
        toast({ title: "Código não disponível", description: "Tente novamente", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async (name: string) => {
    try {
      await logoutInstance(name);
      toast({ title: `"${name}" desconectada` });
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const connected = instances.filter((i) => i.connectionStatus === "open");
  const disconnected = instances.filter((i) => i.connectionStatus !== "open");

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instâncias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas conexões WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Criar instância</h3>
          <div className="flex gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da instância" className="h-10 bg-secondary border-border" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Tipo de conexão</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewIntegration("WHATSAPP-BAILEYS")}
                className={`rounded-lg border p-3 text-left transition-all ${newIntegration === "WHATSAPP-BAILEYS" ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground/30"}`}
              >
                <p className="text-sm font-semibold text-foreground">Baileys</p>
                <p className="text-xs text-muted-foreground mt-0.5">Conexão via QR Code / código de pareamento. Gratuito, sem custos da Meta.</p>
              </button>
              <button
                onClick={() => setNewIntegration("WHATSAPP-BUSINESS")}
                className={`rounded-lg border p-3 text-left transition-all ${newIntegration === "WHATSAPP-BUSINESS" ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground/30"}`}
              >
                <p className="text-sm font-semibold text-foreground">Cloud API (Oficial)</p>
                <p className="text-xs text-muted-foreground mt-0.5">API oficial da Meta. Suporte a botões com link, templates aprovados.</p>
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={creating} size="sm" className="h-10 px-5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Pairing Code modal */}
      {connectingInstance && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full relative">
            <button onClick={() => { setConnectingInstance(null); setPairingCode(null); }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">Conectar "{connectingInstance}"</h3>
            
            {!pairingCode ? (
              <>
                <p className="text-sm text-muted-foreground text-center mb-4">Digite seu número de telefone com código do país</p>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="5511999999999"
                  className="h-10 bg-secondary border-border mb-3"
                  onKeyDown={(e) => e.key === "Enter" && handlePairWithPhone()}
                />
                <Button onClick={handlePairWithPhone} className="w-full h-11">
                  <Phone className="w-4 h-4 mr-2" />
                  Gerar código de pareamento
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center mb-2">Digite este código no seu WhatsApp:</p>
                <p className="text-sm text-muted-foreground text-center mb-4">Configurações → Aparelhos conectados → Conectar com número</p>
                <div className="bg-secondary rounded-lg p-4 text-center mb-4">
                  <p className="font-mono text-2xl font-bold text-foreground tracking-widest">{pairingCode}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setConnectingInstance(null); setPairingCode(null); loadInstances(); }}>Fechar</Button>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20">
          <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma instância encontrada</p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Criar primeira instância</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {connected.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
                <span className="text-primary">▲</span> Conectadas ({connected.length})
              </h2>
              <div className="space-y-3">
                {connected.map((inst) => (
                  <div key={inst.name} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{inst.name}</span>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Conectado</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{inst.owner || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-primary text-primary-foreground text-xs" disabled>
                        ⚡ Disparando
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleLogout(inst.name)}>
                        <WifiOff className="w-3.5 h-3.5 mr-1.5" />Desconectar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(inst.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {disconnected.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-destructive mb-3 flex items-center gap-2">
                <span className="text-destructive">▼</span> Desconectadas ({disconnected.length})
              </h2>
              <div className="space-y-3">
                {disconnected.map((inst) => (
                  <div key={inst.name} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{inst.name}</span>
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Desconectado</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleConnect(inst.name)}>
                        <Link2 className="w-3.5 h-3.5 mr-1.5" />Conectar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(inst.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default InstancesPage;
