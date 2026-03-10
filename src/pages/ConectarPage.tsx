import { useState, useEffect, useCallback, useRef } from "react";
import { Smartphone, Phone, Loader2, RefreshCw, CheckCircle2, Wifi, WifiOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  listInstances,
  getStatus,
  getPhoneCode,
  type ZApiInstance,
  type ZApiStatus,
} from "@/lib/z-api";

interface InstanceWithStatus extends ZApiInstance {
  connStatus?: ZApiStatus;
}

const POLL_INTERVAL = 5000; // 5 seconds

const ConectarPage = () => {
  const [instances, setInstances] = useState<InstanceWithStatus[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedInstRef = useRef<InstanceWithStatus | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const list = await listInstances();
      const withStatus = await Promise.all(
        list.map(async (inst) => {
          try {
            const connStatus = await getStatus(inst);
            return { ...inst, connStatus };
          } catch {
            return { ...inst, connStatus: undefined };
          }
        })
      );
      setInstances(withStatus);
      const firstDisconnected = withStatus.find((i) => !i.connStatus?.connected);
      if (firstDisconnected) {
        setSelectedId(firstDisconnected.id);
      } else if (withStatus.length > 0) {
        setSelectedId(withStatus[0].id);
      }
    } catch {
      toast({ title: "Erro ao carregar instâncias", variant: "destructive" });
    }
    setLoadingInstances(false);
  }, []);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  const selectedInst = instances.find((i) => i.id === selectedId);
  const connectedCount = instances.filter((i) => i.connStatus?.connected).length;
  const disconnectedCount = instances.filter((i) => !i.connStatus?.connected).length;

  // Keep ref in sync
  useEffect(() => {
    selectedInstRef.current = selectedInst || null;
  }, [selectedInst]);

  const startPolling = useCallback(() => {
    stopPolling();
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      const inst = selectedInstRef.current;
      if (!inst) return;
      try {
        const status = await getStatus(inst);
        if (status.connected) {
          stopPolling();
          setConnectionStatus("connected");
          setPairingCode(null);
          toast({ title: "WhatsApp conectado com sucesso! ✅" });
          loadInstances();
        }
      } catch {
        // silently retry
      }
    }, POLL_INTERVAL);
  }, [stopPolling, loadInstances]);

  const handleGetCode = async () => {
    if (!selectedInst) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }

    if (cleanPhone.length < 12) {
      toast({ title: "Número inválido", description: "Digite o número com DDD (ex: 63992570035)", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setPairingCode(null);
    setConnectionStatus(null);
    stopPolling();

    try {
      console.log("[ConectarPage] Requesting pairing code for:", cleanPhone);
      const result = await getPhoneCode(selectedInst, cleanPhone);
      console.log("[ConectarPage] Result:", JSON.stringify(result));
      
      const pairingValue = result?.value || result?.code;
      if (pairingValue) {
        setPairingCode(pairingValue);
        toast({ title: "Código gerado! 🔑", description: "Digite este código no seu WhatsApp para conectar." });
        startPolling();
      } else if ((result as any)?.connected) {
        toast({ title: "Instância já conectada!" });
        setConnectionStatus("connected");
      } else {
        const errorMsg = (result as any)?.error 
          || (result as any)?.message 
          || JSON.stringify(result);
        toast({ title: "Erro ao gerar código", description: errorMsg, variant: "destructive" });
      }
    } catch (err: any) {
      console.error("[ConectarPage] Error:", err);
      toast({ title: "Erro ao gerar código", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast({ title: "Código copiado!" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Conectar WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere o código de 8 dígitos e digite no WhatsApp
          </p>
        </div>

        {/* Status overview */}
        {!loadingInstances && instances.length > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Conectadas</p>
              <p className="text-lg font-bold text-primary">{connectedCount}</p>
            </div>
            <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Desconectadas</p>
              <p className="text-lg font-bold text-destructive">{disconnectedCount}</p>
            </div>
          </div>
        )}

        {/* Step 1: Select instance */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="text-sm font-semibold text-foreground">Selecione a instância</h2>
            <span className="text-xs text-muted-foreground ml-auto">(auto: próxima desconectada)</span>
          </div>

          {loadingInstances ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma instância encontrada</p>
              <Button variant="outline" size="sm" onClick={loadInstances}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setPairingCode(null); setConnectionStatus(null); stopPolling(); }}>
                <SelectTrigger className="h-11 bg-secondary border-border">
                  <SelectValue placeholder="Escolha uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      <span className="flex items-center gap-2">
                        {inst.connStatus?.connected ? (
                          <Wifi className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 text-destructive" />
                        )}
                        {inst.instance_name}
                        {inst.connStatus?.connected && <span className="text-xs text-primary">(conectada)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInst?.connStatus?.connected && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Esta instância já está conectada
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Phone number */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-sm font-semibold text-foreground">Número do WhatsApp</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Número com DDD</Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-secondary border border-border rounded-lg px-3 text-sm text-muted-foreground shrink-0">
                  +55
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="63992570035"
                  className="h-11 bg-secondary border-border font-mono flex-1"
                  type="tel"
                />
              </div>
            </div>

            <Button
              onClick={handleGetCode}
              disabled={generating || !selectedId || !phone.trim()}
              className="w-full h-11"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando código...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Gerar Código de Pareamento
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step 3: Show pairing code + auto-polling */}
        {pairingCode && connectionStatus !== "connected" && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-sm font-semibold text-foreground">Digite este código no WhatsApp</h2>
            </div>

            <div className="bg-secondary rounded-lg p-5 flex items-center justify-center mb-4">
              <button onClick={copyCode} className="flex items-center gap-3 group cursor-pointer">
                <span className="text-3xl font-mono font-bold text-foreground tracking-[0.3em]">
                  {pairingCode}
                </span>
                <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">
                📱 No seu celular, abra o <strong>WhatsApp</strong>:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 ml-1">
                <li>Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Toque em <strong>"Conectar com número de telefone"</strong></li>
                <li>Digite o código <strong className="text-foreground">{pairingCode}</strong></li>
              </ol>
            </div>

            {polling && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Aguardando conexão... verificando a cada 5s</span>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {connectionStatus === "connected" && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
            <p className="text-lg font-bold text-primary">WhatsApp conectado com sucesso!</p>
            <p className="text-sm text-muted-foreground mt-1">
              A instância está pronta para enviar mensagens.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPairingCode(null); setConnectionStatus(null); setPhone(""); stopPolling(); loadInstances(); }}>
              Conectar outra instância
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConectarPage;
