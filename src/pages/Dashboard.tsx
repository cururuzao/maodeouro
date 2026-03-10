import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchInstances,
  createInstance,
  deleteInstance,
  connectInstance,
  getConnectionState,
  logoutInstance,
  type Instance,
  type QRCodeResponse,
} from "@/lib/evolution-api";

const Dashboard = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [qrData, setQrData] = useState<{ name: string; data: QRCodeResponse } | null>(null);
  const [states, setStates] = useState<Record<string, string>>({});

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInstances();
      setInstances(Array.isArray(data) ? data : []);

      // Fetch connection states
      const stateMap: Record<string, string> = {};
      for (const inst of data) {
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

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createInstance(newName.trim());
      toast({ title: `Instância "${newName}" criada!` });
      setNewName("");
      setShowCreate(false);

      // If QR code returned, show it
      if (result?.qrcode?.base64) {
        setQrData({
          name: newName.trim(),
          data: result.qrcode,
        });
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
      if (result?.base64) {
        setQrData({ name, data: result });
      } else if (result?.pairingCode) {
        toast({ title: `Código: ${result.pairingCode}` });
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

  const getStatusColor = (state: string) => {
    switch (state) {
      case "open":
        return "text-primary";
      case "connecting":
        return "text-warning";
      default:
        return "text-destructive";
    }
  };

  const getStatusLabel = (state: string) => {
    switch (state) {
      case "open":
        return "Conectado";
      case "connecting":
        return "Conectando";
      case "close":
        return "Desconectado";
      default:
        return "Desconhecido";
    }
  };

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
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova instância
          </Button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Criar instância</h3>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da instância"
              className="h-10 bg-secondary border-border"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={creating} size="sm" className="h-10 px-5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* QR Code modal */}
      {qrData && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => setQrData(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">
              Conectar "{qrData.name}"
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Escaneie o QR Code no WhatsApp
            </p>
            {qrData.data.base64 ? (
              <div className="flex justify-center mb-4">
                <img
                  src={qrData.data.base64}
                  alt="QR Code"
                  className="w-64 h-64 rounded-lg"
                />
              </div>
            ) : null}
            {qrData.data.pairingCode && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Ou use o código:</p>
                <p className="font-mono text-lg font-bold text-foreground">
                  {qrData.data.pairingCode}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setQrData(null);
                loadInstances();
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Instances grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20">
          <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma instância encontrada</p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira instância
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((inst) => {
            const name = inst.instance.instanceName;
            const state = states[name] || "unknown";
            return (
              <div
                key={name}
                className="bg-card border border-border rounded-xl p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {state === "open" ? (
                      <Wifi className="w-4 h-4 text-primary" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-destructive" />
                    )}
                    <h3 className="font-semibold text-foreground text-sm">{name}</h3>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(state)}`}>
                    {getStatusLabel(state)}
                  </span>
                </div>

                <div className="flex gap-2 mt-auto pt-3">
                  {state !== "open" ? (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleConnect(name)}>
                      <QrCode className="w-3.5 h-3.5 mr-1.5" />
                      Conectar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleLogout(name)}>
                      <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                      Desconectar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(name)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
