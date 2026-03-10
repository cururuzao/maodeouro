import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, Trash2, Loader2, X, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  listInstances, addInstance, removeInstance, getStatus,
  disconnect, type ZApiInstance, type ZApiStatus,
} from "@/lib/z-api";

interface InstanceWithStatus extends ZApiInstance {
  status?: ZApiStatus;
}

const InstancesPage = () => {
  const [instances, setInstances] = useState<InstanceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newInstanceId, setNewInstanceId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newClientToken, setNewClientToken] = useState("");

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listInstances();
      // Check status for each instance
      const withStatus = await Promise.all(
        list.map(async (inst) => {
          try {
            const status = await getStatus(inst);
            return { ...inst, status };
          } catch {
            return { ...inst, status: undefined };
          }
        })
      );
      setInstances(withStatus);
    } catch (err: any) {
      toast({ title: "Erro ao carregar instâncias", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  const handleCreate = async () => {
    if (!newName.trim() || !newInstanceId.trim() || !newToken.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await addInstance({
        instance_name: newName.trim(),
        instance_id: newInstanceId.trim(),
        instance_token: newToken.trim(),
        client_token: newClientToken.trim(),
      });
      toast({ title: `Instância "${newName}" adicionada!` });
      setNewName("");
      setNewInstanceId("");
      setNewToken("");
      setNewClientToken("");
      setShowCreate(false);
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (inst: InstanceWithStatus) => {
    if (!confirm(`Remover instância "${inst.instance_name}"?`)) return;
    try {
      await removeInstance(inst.id);
      toast({ title: `"${inst.instance_name}" removida` });
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async (inst: InstanceWithStatus) => {
    try {
      await disconnect(inst);
      toast({ title: `"${inst.instance_name}" desconectada` });
      loadInstances();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const connected = instances.filter((i) => i.status?.connected);
  const disconnected = instances.filter((i) => !i.status?.connected);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instâncias Z-API</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas conexões WhatsApp via Z-API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Instância
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Adicionar instância Z-API</h3>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha os dados em{" "}
            <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              app.z-api.io
            </a>{" "}
            → selecione sua instância → copie Instance ID, Token e Client-Token.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome (apelido)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Minha instância" className="h-10 bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instance ID *</Label>
              <Input value={newInstanceId} onChange={(e) => setNewInstanceId(e.target.value)} placeholder="3C2A7..." className="h-10 bg-secondary border-border font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Token *</Label>
              <Input value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="Token da instância" className="h-10 bg-secondary border-border font-mono text-xs" type="password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Client-Token (segurança)</Label>
              <Input value={newClientToken} onChange={(e) => setNewClientToken(e.target.value)} placeholder="Token de segurança da conta" className="h-10 bg-secondary border-border font-mono text-xs" type="password" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={creating} size="sm" className="h-10 px-5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20">
          <Wifi className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma instância adicionada</p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Adicionar primeira instância</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {connected.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
                <Wifi className="w-4 h-4" /> Conectadas ({connected.length})
              </h2>
              <div className="space-y-3">
                {connected.map((inst) => (
                  <div key={inst.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{inst.instance_name}</span>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Conectado</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{inst.instance_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDisconnect(inst)}>
                        <WifiOff className="w-3.5 h-3.5 mr-1.5" />Desconectar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(inst)}>
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
                <WifiOff className="w-4 h-4" /> Desconectadas ({disconnected.length})
              </h2>
              <div className="space-y-3">
                {disconnected.map((inst) => (
                  <div key={inst.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <WifiOff className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{inst.instance_name}</span>
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Desconectado</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{inst.instance_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(inst)}>
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
