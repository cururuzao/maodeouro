import { useState, useEffect, useCallback } from "react";
import { Link2, RefreshCw, Loader2, Wifi, WifiOff, Ban, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { listInstances, getStatus, type ZApiInstance, type ZApiStatus } from "@/lib/z-api";

interface InstanceWithStatus extends ZApiInstance {
  status: "loading" | "online" | "offline" | "banned" | "error";
  statusDetail?: string;
}

const ConexoesPage = () => {
  const [instances, setInstances] = useState<InstanceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listInstances();
      const withStatus: InstanceWithStatus[] = list.map((i) => ({
        ...i,
        status: "loading" as const,
      }));
      setInstances(withStatus);
      setLoading(false);

      // Check status in parallel
      const results = await Promise.allSettled(
        list.map(async (inst) => {
          try {
            const s = await getStatus(inst);
            return { id: inst.id, status: s };
          } catch (err: any) {
            return { id: inst.id, error: err.message };
          }
        })
      );

      setInstances((prev) =>
        prev.map((inst) => {
          const result = results.find((_, idx) => list[idx].id === inst.id);
          if (!result || result.status === "rejected") {
            return { ...inst, status: "error", statusDetail: "Erro ao verificar" };
          }
          const val = result.value as any;
          if (val.error) {
            return { ...inst, status: "error", statusDetail: val.error };
          }
          const s: ZApiStatus = val.status;
          if (s.connected && s.smartphoneConnected) {
            return { ...inst, status: "online" };
          }
          if (s.error?.toLowerCase().includes("ban")) {
            return { ...inst, status: "banned", statusDetail: s.error };
          }
          return {
            ...inst,
            status: "offline",
            statusDetail: s.error || (!s.smartphoneConnected ? "Celular desconectado" : "Desconectada"),
          };
        })
      );
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const onlineCount = instances.filter((i) => i.status === "online").length;
  const offlineCount = instances.filter((i) => i.status === "offline" || i.status === "error").length;
  const bannedCount = instances.filter((i) => i.status === "banned").length;

  const statusConfig = {
    loading: { icon: Loader2, label: "Verificando...", classes: "text-muted-foreground", dot: "bg-muted-foreground", iconClass: "animate-spin" },
    online: { icon: Wifi, label: "Online", classes: "text-green-400", dot: "bg-green-400", iconClass: "" },
    offline: { icon: WifiOff, label: "Offline", classes: "text-yellow-400", dot: "bg-yellow-400", iconClass: "" },
    banned: { icon: Ban, label: "Banido", classes: "text-destructive", dot: "bg-destructive", iconClass: "" },
    error: { icon: WifiOff, label: "Erro", classes: "text-destructive", dot: "bg-destructive", iconClass: "" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
            <p className="text-sm text-muted-foreground">Status em tempo real das instâncias WhatsApp</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-muted-foreground">Online</span>
            <span className="font-semibold text-foreground">{onlineCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-muted-foreground">Offline</span>
            <span className="font-semibold text-foreground">{offlineCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Banido</span>
            <span className="font-semibold text-foreground">{bannedCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{instances.length}</span>
          </div>
        </div>

        {/* Instances grid */}
        {loading && instances.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : instances.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <p className="text-muted-foreground">Nenhuma instância cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione instâncias na página de Instâncias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((inst) => {
              const cfg = statusConfig[inst.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={inst.id}
                  className="bg-card border border-border rounded-xl p-5 space-y-3 relative overflow-hidden"
                >
                  {/* Status dot */}
                  <div className={`absolute top-0 right-0 w-3 h-3 m-4 rounded-full ${cfg.dot}`}>
                    {inst.status === "online" && (
                      <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{inst.instance_name}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">{inst.instance_id.slice(0, 16)}...</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 text-sm ${cfg.classes}`}>
                    <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
                    <span className="font-medium">{cfg.label}</span>
                  </div>

                  {inst.statusDetail && (
                    <p className="text-xs text-muted-foreground">{inst.statusDetail}</p>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    Criada em {new Date(inst.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConexoesPage;
