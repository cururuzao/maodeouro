import { useState, useEffect, useCallback } from "react";
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

const ConectarPage = () => {
  const [instances, setInstances] = useState<InstanceWithStatus[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

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

      // Rodízio: auto-seleciona a primeira instância DESCONECTADA
      const firstDisconnected = withStatus.find((i) => !i.connStatus?.connected);
      if (firstDisconnected) {
        setSelectedId(firstDisconnected.id);
      } else if (withStatus.length > 0) {
        // Todas conectadas, seleciona a primeira
        setSelectedId(withStatus[0].id);
      }
    } catch {
      toast({ title: "Erro ao carregar instâncias", variant: "destructive" });
    }
    setLoadingInstances(false);
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const selectedInst = instances.find((i) => i.id === selectedId);

  const connectedCount = instances.filter((i) => i.connStatus?.connected).length;
  const disconnectedCount = instances.filter((i) => !i.connStatus?.connected).length;

  const handleGetCode = async () => {
    if (!selectedInst) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Digite um número válido", description: "Ex: 5511999999999", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setPairingCode(null);
    setConnectionStatus(null);

    try {
      // Check if already connected
      const status = await getStatus(selectedInst);
      if (status.connected) {
        toast({ title: "Instância já conectada", description: "Esta instância já está vinculada a um número." });
        setConnectionStatus("connected");
        setGenerating(false);
        return;
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const result = await getPhoneCode(selectedInst, cleanPhone);
      if (result?.value) {
        setPairingCode(result.value);
        toast({ title: "Código gerado!", description: "Use o código no seu WhatsApp para parear." });
      } else {
        toast({ title: "Código não disponível", description: "Tente novamente em alguns segundos.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar código", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleCheckStatus = async () => {
    if (!selectedInst) return;
    setCheckingStatus(true);
    try {
      const status = await getStatus(selectedInst);
      if (status.connected) {
        setConnectionStatus("connected");
        toast({ title: "Conectado com sucesso! ✅" });
      } else {
        setConnectionStatus("disconnected");
        toast({ title: "Ainda desconectado", description: status.error || "Insira o código de pareamento no WhatsApp.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar", description: err.message, variant: "destructive" });
    }
    setCheckingStatus(false);
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
            Conecte via número de telefone + código de pareamento
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
              <Select value={selectedId} onValueChange={setSelectedId}>
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

        {/* Step 2: Phone number + generate code */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-sm font-semibold text-foreground">Número do WhatsApp</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Número com DDI + DDD</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999"
                className="h-11 bg-secondary border-border font-mono"
                type="tel"
              />
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

        {/* Step 3: Pairing code result */}
        {pairingCode && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-sm font-semibold text-foreground">Código de Pareamento</h2>
            </div>

            <div className="bg-secondary rounded-lg p-4 flex items-center justify-center mb-4">
              <button
                onClick={copyCode}
                className="flex items-center gap-3 group cursor-pointer"
              >
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
                <li>Insira o código <strong>{pairingCode}</strong></li>
              </ol>
            </div>

            <Button
              className="w-full"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : connectionStatus === "connected" ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {connectionStatus === "connected" ? "Conectado!" : "Verificar conexão"}
            </Button>

            {connectionStatus === "connected" && (
              <p className="text-sm text-primary text-center mt-3 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                WhatsApp conectado com sucesso!
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConectarPage;
