import { useState, useEffect, useRef } from "react";
import { Smartphone, Phone, Loader2, CheckCircle2, Copy, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const POLL_INTERVAL = 5000;

const PublicConnectPage = () => {
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

  // Queue state
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
    setStep(2); // stay on step 2

    // Countdown timer
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = setInterval(() => {
      setQueueSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Retry every 15 seconds
    if (queueRetryRef.current) clearInterval(queueRetryRef.current);
    queueRetryRef.current = setInterval(async () => {
      try {
        const cleanPhone = phone.replace(/\D/g, "");
        const result = await callEdge({ action: "get-code", name, email, phone: cleanPhone });

        if (result.status === "busy") {
          // Still busy, update estimate
          setQueueSeconds(result.estimated_seconds || 30);
          return;
        }

        // Got a code! Exit queue
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        if (queueRetryRef.current) clearInterval(queueRetryRef.current);
        setInQueue(false);
        setPairingCode(result.code);
        setInstanceDbId(result.instance_db_id);
        setStep(3);
        toast({ title: "Código gerado! 🔑" });
        startPolling();
      } catch {
        // Error, keep waiting
      }
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

      // Check if all instances are busy
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
        description: "Tente novamente em 1 minuto. Estamos com muitas conexões simultâneas.",
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Banner */}
      <div className="w-full h-[340px] md:h-[420px] relative overflow-hidden">
        <img
          src="/images/hero-banner.webp"
          alt="Banner"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                  step >= s
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-gray-100 text-gray-400 border-gray-200"
                }`}>
                  {connected && s === 3 ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-10 h-0.5 rounded transition-all ${
                    step > s ? "bg-red-600" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Name & Email */}
          {step === 1 && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg border-2 border-red-600 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Conecte na nossa central de atendimento</h1>
              <p className="text-gray-500 text-sm mb-8">Preencha seus dados para iniciar o processo de conexão.</p>

              <div className="space-y-5 text-left">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Nome completo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-12 bg-white border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-red-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-white border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-red-600"
                  />
                </div>
                <Button
                  onClick={goToStep2}
                  className="w-full h-12 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  Prosseguir <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Phone (or Queue) */}
          {step === 2 && !inQueue && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg border-2 border-red-600 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Número do WhatsApp</h1>
              <p className="text-gray-500 text-sm mb-8">Digite o número que deseja conectar</p>

              <div className="space-y-5 text-left">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Telefone com DDD</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 text-sm text-gray-500 shrink-0 h-12">
                      +55
                    </div>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="11 99999-9999"
                      className="h-12 bg-white border-gray-300 rounded-lg text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-red-600 flex-1"
                      type="tel"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 rounded-lg px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleGetCode}
                    disabled={generating || !phone.trim()}
                    className="flex-1 h-12 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white gap-2 disabled:opacity-50"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando código...</>
                    ) : (
                      <>Gerar Código</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Queue / Waiting Screen */}
          {step === 2 && inQueue && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center animate-pulse">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Fila de Espera</h1>
              <p className="text-gray-500 text-sm mb-6">
                No momento todas as vagas estão ocupadas. Assim que uma vaga liberar, seu código será gerado automaticamente.
              </p>

              {/* Countdown */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                <p className="text-xs text-amber-600 font-medium mb-2">Tempo estimado de espera</p>
                <p className="text-4xl font-bold font-mono text-amber-700">{formatTime(queueSeconds)}</p>
                <p className="text-xs text-amber-500 mt-2">Não feche esta página</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
                <p className="text-sm text-gray-600">
                  💡 <strong>O que está acontecendo?</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Outro número está sendo processado neste momento. Assim que ele terminar ou desconectar, sua vez chegará automaticamente.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando disponibilidade...</span>
              </div>
            </div>
          )}

          {/* Step 3: Show Code */}
          {step === 3 && !connected && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg border-2 border-red-600 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Código de Pareamento</h1>
              <p className="text-gray-500 text-sm mb-6">Digite este código no seu WhatsApp</p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center justify-center mb-6">
                <button onClick={copyCode} className="flex items-center gap-3 group cursor-pointer">
                  <span className="text-3xl font-mono font-bold text-gray-900 tracking-[0.3em]">
                    {pairingCode}
                  </span>
                  <Copy className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-left mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-600" />
                  Instruções:
                </p>
                <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
                  <li>Abra o <strong className="text-gray-900">WhatsApp</strong> no seu celular</li>
                  <li>Vá em <strong className="text-gray-900">Configurações</strong> → <strong className="text-gray-900">Aparelhos conectados</strong></li>
                  <li>Toque em <strong className="text-gray-900">Conectar um aparelho</strong></li>
                  <li>Toque em <strong className="text-gray-900">"Conectar com número de telefone"</strong></li>
                  <li>Digite o código: <strong className="text-red-600 font-mono">{pairingCode}</strong></li>
                </ol>
              </div>

              {polling && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <span>Aguardando conexão...</span>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {connected && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Conectado!</h2>
              <p className="text-sm text-gray-500">
                Seu WhatsApp foi conectado com sucesso. Você pode fechar esta página.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicConnectPage;
