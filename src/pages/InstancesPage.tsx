import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, Trash2, QrCode, Wifi, WifiOff, Loader2, X, Link2, User, Phone, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchInstances, createInstance, deleteInstance, connectInstance,
  getConnectionState, logoutInstance, type Instance, type QRCodeResponse,
} from "@/lib/evolution-api";

const InstancesPage = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [qrData, setQrData] = useState<{ name: string; data: QRCodeResponse } | null>(null);
  const [states, setStates] = useState<Record<string, string>>({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInstances();
      const list = (Array.isArray(data) ? data : []).filter((item: any) => item?.instance?.instanceName);
      setInstances(list);
      const stateMap: Record<string, string> = {};
      for (const inst of list) {
        try {
          const cs = await getConnectionState(inst.instance.instanceName);
          stateMap[inst.instance.instanceName] = cs.instance.state;
        } catch {
          stateMap[inst.instance.instanceName] = "unknown";
        }
      }
      setStates(stateMap);
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
      const result = await createInstance(newName.trim());
      toast({ title: `Instância "${newName}" criada!` });
      setNewName("");
      setShowCreate(false);
      if (result?.qrcode?.base64) {
        setQrData({ name: newName.trim(), data: result.qrcode });
      }
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

  const handleConnect = async (name: string) => {
    try {
      const result = await connectInstance(name);
      if (result?.base64) setQrData({ name, data: result });
      else if (result?.pairingCode) toast({ title: `Código: ${result.pairingCode}` });
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

  const connected = instances.filter((i) => i?.instance?.instanceName && states[i.instance.instanceName] === "open");
  const disconnected = instances.filter((i) => i?.instance?.instanceName && states[i.instance.instanceName] !== "open");

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
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Criar instância</h3>
          <div className="flex gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da instância" className="h-10 bg-secondary border-border" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <Button onClick={handleCreate} disabled={creating} size="sm" className="h-10 px-5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* QR Code modal */}
      {qrData && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full relative">
            <button onClick={() => setQrData(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">Conectar "{qrData.name}"</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">Escaneie o QR Code no WhatsApp</p>
            {qrData.data.base64 && <div className="flex justify-center mb-4"><img src={qrData.data.base64} alt="QR Code" className="w-64 h-64 rounded-lg" /></div>}
            {qrData.data.pairingCode && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Ou use o código:</p>
                <p className="font-mono text-lg font-bold text-foreground">{qrData.data.pairingCode}</p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" onClick={() => { setQrData(null); loadInstances(); }}>Fechar</Button>
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
          {/* Connected */}
          {connected.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
                <span className="text-primary">▲</span> Conectadas ({connected.length})
              </h2>
              <div className="space-y-3">
                {connected.map((inst) => {
                  const name = inst.instance.instanceName;
                  return (
                    <div key={name} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{name}</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Conectado</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{inst.instance.owner || "—"}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{inst.instance.owner || "—"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-primary text-primary-foreground text-xs" disabled>
                          ⚡ Disparando
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleLogout(name)}>
                          <WifiOff className="w-3.5 h-3.5 mr-1.5" />Desconectar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disconnected */}
          {disconnected.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-destructive mb-3 flex items-center gap-2">
                <span className="text-destructive">▼</span> Desconectadas ({disconnected.length})
              </h2>
              <div className="space-y-3">
                {disconnected.map((inst) => {
                  const name = inst.instance.instanceName;
                  return (
                    <div key={name} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{name}</span>
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Desconectado</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleConnect(name)}>
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />Conectar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default InstancesPage;
