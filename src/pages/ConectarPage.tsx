import { useState, useEffect, useCallback } from "react";
import { Smartphone, Phone, Loader2, RefreshCw, CheckCircle2, Wifi, WifiOff, KeyRound } from "lucide-react";
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
  requestRegistrationCode,
  confirmRegistrationCode,
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

  // Step 2: phone
  const [phone, setPhone] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendMethod, setSendMethod] = useState("sms");

  // Step 3: confirm code
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
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

  // Step 2: Request code to be sent to phone
  const handleRequestCode = async () => {
    if (!selectedInst) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("55")) {
      cleanPhone = cleanPhone.substring(2);
    }

    if (cleanPhone.length < 10) {
      toast({ title: "Número inválido", description: "Digite o número com DDD (ex: 63992570035)", variant: "destructive" });
      return;
    }

    setSendingCode(true);
    try {
      const status = await getStatus(selectedInst);
      if (status.connected) {
        toast({ title: "Instância já conectada!" });
        setConnectionStatus("connected");
        setSendingCode(false);
        return;
      }

      const result = await requestRegistrationCode(selectedInst, "55", cleanPhone, sendMethod);
      if (result?.error) {
        toast({ title: "Erro ao solicitar código", description: result.error, variant: "destructive" });
      } else {
        setCodeSent(true);
        toast({ title: "Código enviado! 📱", description: `Verifique seu celular (${sendMethod.toUpperCase()}). O código aparecerá no seu dispositivo.` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao solicitar código", description: err.message, variant: "destructive" });
    }
    setSendingCode(false);
  };

  // Step 3: Confirm code
  const handleConfirmCode = async () => {
    if (!selectedInst || !code.trim()) {
      toast({ title: "Digite o código recebido", variant: "destructive" });
      return;
    }

    setConfirming(true);
    try {
      const result = await confirmRegistrationCode(selectedInst, code.trim());
      if (result?.error) {
        toast({ title: "Erro ao confirmar", description: result.error, variant: "destructive" });
      } else {
        setConnectionStatus("connected");
        toast({ title: "WhatsApp conectado com sucesso! ✅" });
        loadInstances();
      }
    } catch (err: any) {
      toast({ title: "Erro ao confirmar código", description: err.message, variant: "destructive" });
    }
    setConfirming(false);
  };

  const resetFlow = () => {
    setCodeSent(false);
    setCode("");
    setConnectionStatus(null);
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
            Conecte via número de telefone + código de confirmação
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
              <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); resetFlow(); }}>
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

        {/* Step 2: Phone number + request code */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-sm font-semibold text-foreground">Solicitar código</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Número do WhatsApp (com DDD)</Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-secondary border border-border rounded-lg px-3 text-sm text-muted-foreground">
                  +55
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="63992570035"
                  className="h-11 bg-secondary border-border font-mono flex-1"
                  type="tel"
                  disabled={codeSent}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Método de envio</Label>
              <Select value={sendMethod} onValueChange={setSendMethod} disabled={codeSent}>
                <SelectTrigger className="h-10 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">📱 SMS</SelectItem>
                  <SelectItem value="voice">📞 Ligação de voz</SelectItem>
                  <SelectItem value="wa_old">💬 Pop-up no WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!codeSent ? (
              <Button
                onClick={handleRequestCode}
                disabled={sendingCode || !selectedId || !phone.trim()}
                className="w-full h-11"
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Enviar Código para o Celular
                  </>
                )}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resetFlow} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reenviar código
              </Button>
            )}
          </div>
        </div>

        {/* Step 3: Enter code received on phone */}
        {codeSent && connectionStatus !== "connected" && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-sm font-semibold text-foreground">Digite o código recebido</h2>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">
                📱 Um código foi enviado para seu celular via <strong>{sendMethod === "sms" ? "SMS" : sendMethod === "voice" ? "ligação" : "WhatsApp"}</strong>.
                Digite-o abaixo para conectar.
              </p>
            </div>

            <div className="space-y-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código (ex: 123456)"
                className="h-12 bg-secondary border-border font-mono text-center text-lg tracking-[0.3em]"
                maxLength={10}
              />

              <Button
                onClick={handleConfirmCode}
                disabled={confirming || !code.trim()}
                className="w-full h-11"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Confirmar e Conectar
                  </>
                )}
              </Button>
            </div>
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
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { resetFlow(); loadInstances(); }}>
              Conectar outra instância
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConectarPage;
