import { useState, useEffect, useRef } from "react";
import { Smartphone, Phone, Loader2, CheckCircle2, Copy, ArrowRight, ArrowLeft, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const POLL_INTERVAL = 5000;

const VipConnectPage = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instanceDbId, setInstanceDbId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const instanceDbIdRef = useRef<string | null>(null);

  const [inQueue, setInQueue] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    instanceDbIdRef.current = instanceDbId;
  }, [instanceDbId]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      if (queueRetryRef.current) clearInterval(queueRetryRef.current);
    };
  }, []);

  const callEdge = async (body: any) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  };

  const goToStep2 = () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
  };

  const startQueue = (estimatedSeconds: number) => {
    setInQueue(true);
    setQueueSeconds(estimatedSeconds);
    setStep(2);
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = setInterval(() => {
      setQueueSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    if (queueRetryRef.current) clearInterval(queueRetryRef.current);
    queueRetryRef.current = setInterval(async () => {
      try {
        const cleanPhone = phone.replace(/\D/g, "");
        const result = await callEdge({ action: "get-code", name, email, phone: cleanPhone });
        if (result.status === "busy") {
          setQueueSeconds(result.estimated_seconds || 30);
          return;
        }
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        if (queueRetryRef.current) clearInterval(queueRetryRef.current);
        setInQueue(false);
        setPairingCode(result.code);
        setInstanceDbId(result.instance_db_id);
        setStep(3);
        toast({ title: "Código gerado! 🔑" });
        startPolling();
      } catch {}
    }, 3000);
  };

  const startPolling = () => {
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      try {
        const status = await callEdge({ action: "check-status", instance_db_id: instanceDbIdRef.current });
        if (status.connected) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPolling(false);
          setConnected(true);
          toast({ title: "WhatsApp conectado com sucesso! ✅" });
        }
      } catch {}
    }, POLL_INTERVAL);
  };

  const handleGetCode = async () => {
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({ title: "Número inválido", description: "Digite seu número com DDD", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = await callEdge({ action: "get-code", name, email, phone: cleanPhone });
      if (result.status === "busy") {
        startQueue(result.estimated_seconds || 60);
        setGenerating(false);
        return;
      }
      setPairingCode(result.code);
      setInstanceDbId(result.instance_db_id);
      setStep(3);
      toast({ title: "Código gerado! 🔑" });
      startPolling();
    } catch (err: any) {
      toast({
        title: "⏳ Alta demanda!",
        description: "Tente novamente em 1 minuto.",
        variant: "destructive",
        duration: 10000,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Comunidade VIP</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Acesso <span className="text-amber-400">Exclusivo</span>
          </h1>
          <p className="text-gray-400 text-sm">Conecte seu WhatsApp para entrar na comunidade VIP</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                step >= s
                  ? "bg-amber-500 text-gray-900 border-amber-500"
                  : "bg-gray-800 text-gray-500 border-gray-700"
              }`}>
                {connected && s === 3 ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-10 h-0.5 rounded transition-all ${
                  step > s ? "bg-amber-500" : "bg-gray-700"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40">

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white text-center mb-1">Seus Dados</h2>
              <p className="text-gray-500 text-xs text-center mb-6">Preencha para liberar seu acesso</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-300">Nome completo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11 bg-gray-800/50 border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-300">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 bg-gray-800/50 border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
                <Button
                  onClick={goToStep2}
                  className="w-full h-11 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 gap-2"
                >
                  Prosseguir <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && !inQueue && (
            <div>
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white text-center mb-1">Número do WhatsApp</h2>
              <p className="text-gray-500 text-xs text-center mb-6">Digite o número que deseja conectar</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-300">Telefone com DDD</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-4 text-sm text-gray-400 shrink-0 h-11">
                      +55
                    </div>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="11 99999-9999"
                      className="h-11 bg-gray-800/50 border-gray-700 rounded-lg text-sm font-mono text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20 flex-1"
                      type="tel"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 rounded-lg px-4 border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleGetCode}
                    disabled={generating || !phone.trim()}
                    className="flex-1 h-11 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 gap-2 disabled:opacity-50"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    ) : (
                      <>Gerar Código</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Queue */}
          {step === 2 && inQueue && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center animate-pulse">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Fila de Espera</h2>
              <p className="text-gray-400 text-sm mb-6">
                Todas as vagas estão ocupadas. Seu código será gerado automaticamente.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-6">
                <p className="text-xs text-amber-400 font-medium mb-2">Tempo estimado</p>
                <p className="text-4xl font-bold font-mono text-amber-400">{formatTime(queueSeconds)}</p>
                <p className="text-xs text-amber-500/60 mt-2">Não feche esta página</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando disponibilidade...</span>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && !connected && (
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Código de Pareamento</h2>
              <p className="text-gray-500 text-xs mb-6">Digite este código no seu WhatsApp</p>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center justify-center mb-6">
                <button onClick={copyCode} className="flex items-center gap-3 group cursor-pointer">
                  <span className="text-3xl font-mono font-bold text-amber-400 tracking-[0.3em]">
                    {pairingCode}
                  </span>
                  <Copy className="w-5 h-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>

              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 text-left mb-6">
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  Instruções:
                </p>
                <ol className="text-sm text-gray-400 list-decimal list-inside space-y-2">
                  <li>Abra o <strong className="text-white">WhatsApp</strong> no seu celular</li>
                  <li>Vá em <strong className="text-white">Configurações</strong> → <strong className="text-white">Aparelhos conectados</strong></li>
                  <li>Toque em <strong className="text-white">Conectar um aparelho</strong></li>
                  <li>Toque em <strong className="text-white">"Conectar com número de telefone"</strong></li>
                  <li>Digite o código: <strong className="text-amber-400 font-mono">{pairingCode}</strong></li>
                </ol>
              </div>

              {polling && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Aguardando conexão...</span>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {connected && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">WhatsApp Conectado!</h2>
              <p className="text-sm text-gray-400">
                Bem-vindo à comunidade VIP! Você pode fechar esta página.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          🔒 Seus dados estão protegidos e não serão compartilhados.
        </p>
      </div>
    </div>
  );
};

export default VipConnectPage;
