import { useState, useEffect, useRef } from "react";
import { Smartphone, Phone, Loader2, CheckCircle2, Copy, ArrowRight, ArrowLeft, User, Mail } from "lucide-react";
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

  useEffect(() => {
    instanceDbIdRef.current = instanceDbId;
  }, [instanceDbId]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
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

  const handleGetCode = async () => {
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({ title: "Número inválido", description: "Digite seu número com DDD", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const result = await callEdge({ action: "get-code", name, email, phone: cleanPhone });
      setPairingCode(result.code);
      setInstanceDbId(result.instance_db_id);
      setStep(3);
      toast({ title: "Código gerado! 🔑" });

      // Start polling
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
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-4 text-3xl">
            ✋
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mão de Ouro</h1>
          <p className="text-sm text-primary font-medium">Conecte seu WhatsApp</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {connected && s === 3 ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-0.5 rounded transition-all ${
                  step > s ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Name & Email */}
        {step === 1 && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg shadow-primary/5">
            <h2 className="text-lg font-bold text-foreground mb-1">Seus dados</h2>
            <p className="text-sm text-muted-foreground mb-5">Preencha para começar a conexão</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>
              <Button onClick={goToStep2} className="w-full h-12 rounded-xl text-sm font-semibold shadow-md shadow-primary/25 gap-2">
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg shadow-primary/5">
            <h2 className="text-lg font-bold text-foreground mb-1">Número do WhatsApp</h2>
            <p className="text-sm text-muted-foreground mb-5">Digite o número que deseja conectar</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone com DDD</Label>
                <div className="flex gap-2">
                  <div className="flex items-center bg-secondary border border-border rounded-xl px-4 text-sm text-muted-foreground shrink-0 h-12">
                    +55
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="DD 9XXXX-XXXX"
                    className="h-12 bg-secondary border-border rounded-xl text-sm font-mono flex-1"
                    type="tel"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl px-4">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleGetCode}
                  disabled={generating || !phone.trim()}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold shadow-md shadow-primary/25 gap-2"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando código...</>
                  ) : (
                    <><Phone className="w-4 h-4" /> Gerar Código</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Show Code */}
        {step === 3 && !connected && (
          <div className="bg-card rounded-2xl border border-primary/30 p-6 shadow-lg shadow-primary/5">
            <h2 className="text-lg font-bold text-foreground mb-1">Código de Pareamento</h2>
            <p className="text-sm text-muted-foreground mb-5">Digite este código no seu WhatsApp</p>

            <div className="bg-secondary rounded-xl p-6 flex items-center justify-center mb-5">
              <button onClick={copyCode} className="flex items-center gap-3 group cursor-pointer">
                <span className="text-3xl font-mono font-bold text-foreground tracking-[0.3em]">
                  {pairingCode}
                </span>
                <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 mb-5">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Instruções:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular</li>
                <li>Vá em <strong className="text-foreground">Configurações</strong> → <strong className="text-foreground">Aparelhos conectados</strong></li>
                <li>Toque em <strong className="text-foreground">Conectar um aparelho</strong></li>
                <li>Toque em <strong className="text-foreground">"Conectar com número de telefone"</strong></li>
                <li>Digite o código: <strong className="text-primary font-mono">{pairingCode}</strong></li>
              </ol>
            </div>

            {polling && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Aguardando conexão...</span>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {connected && (
          <div className="bg-card rounded-2xl border border-primary/30 p-8 shadow-lg shadow-primary/5 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">WhatsApp Conectado!</h2>
            <p className="text-sm text-muted-foreground">
              Seu WhatsApp foi conectado com sucesso. Você pode fechar esta página.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          © 2026 Mão de Ouro Disparos
        </p>
      </div>
    </div>
  );
};

export default PublicConnectPage;
