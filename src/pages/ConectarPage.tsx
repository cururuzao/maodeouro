import { useState, useEffect, useCallback } from "react";
import { Smartphone, Phone, Loader2, RefreshCw, CheckCircle2, Copy, Wifi, WifiOff } from "lucide-react";
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
  fetchInstances,
  connectInstance,
  getConnectionState,
} from "@/lib/evolution-api";

interface NormalizedInstance {
  name: string;
  status: string;
}

function normalizeInstances(data: any[]): NormalizedInstance[] {
  return data
    .map((item: any) => {
      const name = item?.instance?.instanceName || item?.name;
      if (!name) return null;
      const status = item?.instance?.status || item?.connectionStatus || "close";
      return { name, status };
    })
    .filter(Boolean) as NormalizedInstance[];
}

const ConectarPage = () => {
  const [instances, setInstances] = useState<NormalizedInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const data = await fetchInstances();
      const list = normalizeInstances(Array.isArray(data) ? data : []);
      setInstances(list);
      if (list.length === 1) setSelectedInstance(list[0].name);
    } catch {
      toast({ title: "Erro ao carregar instâncias", variant: "destructive" });
    }
    setLoadingInstances(false);
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleGenerate = async () => {
    const phone = phoneNumber.replace(/\D/g, "");
    if (!selectedInstance) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }
    if (!phone || phone.length < 10) {
      toast({ title: "Número inválido", description: "Informe o número com código do país (ex: 5511999999999)", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setPairingCode(null);
    setConnectionStatus(null);

    try {
      const result = await connectInstance(selectedInstance, phone);
      if (result?.pairingCode) {
        setPairingCode(result.pairingCode);
        toast({ title: "Código gerado!", description: "Digite no seu WhatsApp para conectar." });
      } else {
        toast({ title: "Código não disponível", description: "Tente novamente em alguns segundos.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar código", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast({ title: "Código copiado!" });
    }
  };

  const handleCheckStatus = async () => {
    if (!selectedInstance) return;
    setCheckingStatus(true);
    try {
      const state = await getConnectionState(selectedInstance);
      const s = state?.instance?.state || "close";
      setConnectionStatus(s);
      if (s === "open") {
        toast({ title: "Conectado com sucesso! ✅" });
      } else if (s === "connecting") {
        toast({ title: "Conectando...", description: "Aguarde ou digite o código no WhatsApp." });
      } else {
        toast({ title: "Ainda desconectado", description: "Digite o código no WhatsApp e tente novamente.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar", description: err.message, variant: "destructive" });
    }
    setCheckingStatus(false);
  };

  const selectedInst = instances.find((i) => i.name === selectedInstance);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Conectar WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vincule seu número de telefone a uma instância
          </p>
        </div>

        {/* Step 1: Select instance */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="text-sm font-semibold text-foreground">Selecione a instância</h2>
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
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger className="h-11 bg-secondary border-border">
                  <SelectValue placeholder="Escolha uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.name} value={inst.name}>
                      <span className="flex items-center gap-2">
                        {inst.status === "open" ? (
                          <Wifi className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 text-destructive" />
                        )}
                        {inst.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInst?.status === "open" && (
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
            <h2 className="text-sm font-semibold text-foreground">Informe seu número</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Número com código do país (sem espaços ou símbolos)
            </Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ""))}
              placeholder="5511999999999"
              className="h-11 bg-secondary border-border text-base font-mono tracking-wide"
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedInstance || !phoneNumber}
            className="w-full h-11 mt-4"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando código...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Gerar código de pareamento
              </>
            )}
          </Button>
        </div>

        {/* Step 3: Pairing code result */}
        {pairingCode && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-sm font-semibold text-foreground">Digite o código no WhatsApp</h2>
            </div>

            <div className="bg-secondary rounded-lg p-5 text-center mb-4">
              <p className="font-mono text-3xl font-bold text-foreground tracking-[0.3em]">
                {pairingCode}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">
                📱 No seu celular, abra o <strong>WhatsApp</strong>:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 ml-1">
                <li>Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Toque em <strong>Conectar com número de telefone</strong></li>
                <li>Digite o código acima</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyCode}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar código
              </Button>
              <Button
                className="flex-1"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : connectionStatus === "open" ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {connectionStatus === "open" ? "Conectado!" : "Verificar conexão"}
              </Button>
            </div>

            {connectionStatus === "open" && (
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
