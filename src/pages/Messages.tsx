import { useState, useEffect } from "react";
import { Send, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchInstances,
  sendTextMessage,
  sendBulkMessages,
  type Instance,
} from "@/lib/evolution-api";

const Messages = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [number, setNumber] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [delay, setDelay] = useState("3");

  useEffect(() => {
    fetchInstances()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setInstances(list);
        if (list.length > 0) setSelectedInstance(list[0].instance.instanceName);
      })
      .catch(() => {});
  }, []);

  const handleSendSingle = async () => {
    if (!selectedInstance || !number || !message) return;
    setSending(true);
    try {
      await sendTextMessage(selectedInstance, number, message);
      toast({ title: "Mensagem enviada!" });
      setNumber("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleSendBulk = async () => {
    if (!selectedInstance || !bulkNumbers || !message) return;
    const numbers = bulkNumbers
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (numbers.length === 0) return;

    setSending(true);
    try {
      const result = await sendBulkMessages(
        selectedInstance,
        numbers,
        message,
        Number(delay) * 1000
      );
      toast({
        title: `Disparo concluído`,
        description: `${result.sent.length} enviados, ${result.failed.length} falharam`,
      });
      setBulkNumbers("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Erro no disparo", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-1">Mensagens</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Envie mensagens individuais ou em massa
        </p>

        {/* Instance selector */}
        <div className="space-y-2 mb-6">
          <Label className="text-sm text-muted-foreground">Instância</Label>
          <select
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
            className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground"
          >
            {instances.length === 0 && (
              <option value="">Nenhuma instância disponível</option>
            )}
            {instances.map((inst) => (
              <option key={inst.instance.instanceName} value={inst.instance.instanceName}>
                {inst.instance.instanceName}
              </option>
            ))}
          </select>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "single"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="w-4 h-4" />
            Individual
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "bulk"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Disparo em massa
          </button>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          {mode === "single" ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Número (com DDI)</Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="5511999999999"
                className="h-10 bg-secondary border-border"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Números (um por linha ou separados por vírgula)
                </Label>
                <Textarea
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  placeholder={"5511999999999\n5511888888888\n5511777777777"}
                  className="min-h-[120px] bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Intervalo entre mensagens (segundos)
                </Label>
                <Input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  min="1"
                  max="30"
                  className="h-10 bg-secondary border-border w-32"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[100px] bg-secondary border-border"
            />
          </div>

          <Button
            onClick={mode === "single" ? handleSendSingle : handleSendBulk}
            disabled={sending || !selectedInstance}
            className="w-full h-11"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {mode === "single" ? "Enviar mensagem" : "Iniciar disparo"}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
