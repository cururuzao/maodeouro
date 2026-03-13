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
import { Flame, Video, Sparkles, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { initFacebookPixel, trackInitiateCheckout, trackPurchase } from "@/lib/facebook-pixel";

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
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    heroVideoRefs.current.forEach((el, i) => {
      if (el) {
        if (i === heroSlide) el.play().catch(() => {});
        else el.pause();
      }
    });
  }, [heroSlide]);

  useEffect(() => {
    initFacebookPixel();
  }, []);

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

  // Mantém input visível quando teclado abre no mobile
  useEffect(() => {
    if (!connectOpen) return;
    const handler = () => {
      if (document.activeElement === phoneInputRef.current) {
        setTimeout(() => {
          phoneInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 100);
      }
    };
    window.visualViewport?.addEventListener("resize", handler);
    return () => window.visualViewport?.removeEventListener("resize", handler);
  }, [connectOpen]);

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
        trackInitiateCheckout();
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
          trackPurchase();
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
      trackInitiateCheckout();
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

      {/* Modal: Tema WhatsApp */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden bg-[#111B21] border-[#2A3942] text-white p-0 pb-64 sm:pb-6 max-sm:!fixed max-sm:!bottom-0 max-sm:!top-auto max-sm:!left-0 max-sm:!right-0 max-sm:!w-full max-sm:!max-w-full max-sm:!translate-y-0 max-sm:!translate-x-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[90vh] [&>button]:text-white/80 [&>button]:hover:text-white">
          {/* Header estilo WhatsApp */}
          <div className="bg-[#075E54] px-4 py-4 sm:px-6 sm:py-5 rounded-t-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/30 flex items-center justify-center p-2 flex-shrink-0">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-full h-full object-contain" />
            </div>
            <div>
              <DialogTitle className="text-white text-base sm:text-lg font-medium">Lineu Silva Vazadinhos Gostosos</DialogTitle>
              <p className="text-[#75B4AD] text-xs sm:text-sm">Como acessar o grupo</p>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex justify-center gap-2 mb-4 sm:mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  (s === 1 && step >= 1) || (s === 2 && (step === 2 || connected))
                    ? "bg-[#25D366] text-white"
                    : "bg-[#2A3942] text-[#8696A0]"
                }`}>
                  {connected && s === 2 ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 2 && <div className={`w-8 h-0.5 rounded ${step === 2 || connected ? "bg-[#25D366]" : "bg-[#2A3942]"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Telefone */}
          {step === 1 && !inQueue && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-white text-center">Número do WhatsApp</h3>
              <p className="text-[#8696A0] text-xs text-center mb-3 sm:mb-4">Digite o número que deseja conectar</p>
              <div className="space-y-2 sm:space-y-3">
                <div className="space-y-1 scroll-mt-32" id="phone-input-wrapper">
                  <Label className="text-xs sm:text-sm text-[#8696A0]">Telefone com DDD</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-[#2A3942] rounded-lg px-3 text-xs sm:text-sm text-[#8696A0] shrink-0 h-10 sm:h-11">+55</div>
                    <Input
                      ref={phoneInputRef}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => {
                        setTimeout(() => {
                          phoneInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                        }, 400);
                      }}
                      placeholder="11 99999-9999"
                      inputMode="numeric"
                      className="h-10 sm:h-11 bg-[#2A3942] border-[#2A3942] rounded-lg text-sm sm:text-base text-white font-mono placeholder:text-[#8696A0] focus:border-[#25D366] focus:ring-[#25D366]/30 flex-1"
                      type="tel"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGetCode}
                  disabled={generating || !phone.trim()}
                  className="w-full h-10 sm:h-11 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm gap-2 disabled:opacity-50 disabled:hover:bg-[#25D366]"
                >
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : "Gerar Código"}
                  </Button>
              </div>
            </div>
          )}

          {step === 2 && inQueue && (
            <div className="text-center py-3 sm:py-4">
              <div className="flex justify-center mb-2 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#25D366]/20 flex items-center justify-center animate-pulse">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-[#25D366]" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-1 sm:mb-2">Fila de espera</h3>
              <p className="text-[#8696A0] text-xs sm:text-sm mb-3 sm:mb-4">Seu código será gerado automaticamente.</p>
              <div className="bg-[#2A3942] rounded-xl p-4 sm:p-6 mb-3 sm:mb-4">
                <p className="text-xs text-[#8696A0] font-medium mb-1 sm:mb-2">Tempo estimado</p>
                <p className="text-2xl sm:text-4xl font-bold font-mono text-[#25D366]">{formatTime(queueSeconds)}</p>
                <p className="text-xs text-[#8696A0] mt-2">Não feche esta janela</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-[#8696A0]">
                <Loader2 className="w-4 h-4 animate-spin text-[#25D366]" />
                <span>Verificando disponibilidade...</span>
              </div>
            </div>
          )}

          {/* Step 2: Código */}
          {step === 2 && !inQueue && pairingCode && !connected && (
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-medium text-white mb-0.5 sm:mb-1">Código para entrar no grupo</h3>
              <p className="text-[#8696A0] text-xs sm:text-sm mb-2 sm:mb-3">Digite o código no seu WhatsApp</p>
              <div className="bg-[#2A3942] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center gap-3 mb-3 sm:mb-4">
                <span className="text-lg sm:text-2xl md:text-3xl font-mono font-bold text-[#25D366] tracking-[0.1em] sm:tracking-[0.2em]">{pairingCode}</span>
                <Button
                  onClick={copyCode}
                  variant="outline"
                  className="bg-[#075E54] border-[#25D366]/50 text-white hover:bg-[#128C7E] hover:border-[#25D366] shrink-0"
                >
                  Copiar
                </Button>
              </div>
              <div className="bg-[#2A3942] rounded-xl p-2.5 sm:p-4 text-left mb-2 sm:mb-3">
                <p className="text-sm sm:text-base font-medium text-white mb-2 sm:mb-3 flex items-center gap-1.5">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> Como entrar:
                </p>
                <ol className="space-y-2 sm:space-y-3">
                  <li className="flex gap-2 sm:gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#25D366]/30 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center">1</span>
                    <span className="text-[#E9EDEF] text-sm sm:text-base">Abra o <strong>WhatsApp</strong> no celular</span>
                  </li>
                  <li className="flex gap-2 sm:gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#25D366]/30 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center">2</span>
                    <span className="text-[#E9EDEF] text-sm sm:text-base"><strong>Configurações</strong> → <strong>Aparelhos conectados</strong></span>
                  </li>
                  <li className="flex gap-2 sm:gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#25D366]/30 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center">3</span>
                    <span className="text-[#E9EDEF] text-sm sm:text-base">Toque em <strong>Conectar um aparelho</strong></span>
                  </li>
                  <li className="flex gap-2 sm:gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#25D366]/30 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center">4</span>
                    <span className="text-[#E9EDEF] text-sm sm:text-base"><strong>Conectar com número</strong></span>
                  </li>
                  <li className="flex gap-2 sm:gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#25D366]/30 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center">5</span>
                    <span className="text-[#E9EDEF] text-sm sm:text-base">Digite: <strong className="text-[#25D366] font-mono">{pairingCode}</strong></span>
                  </li>
                </ol>
              </div>
              {polling && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-sm text-[#8696A0] py-0.5 sm:py-1">
                  <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
                  <span>Aguardando conexão no WhatsApp...</span>
                </div>
              )}
            </div>
          )}

          {/* Sucesso */}
          {connected && (
            <div className="text-center py-3 sm:py-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#25D366]/20 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#25D366]" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-white mb-1 sm:mb-2">WhatsApp conectado!</h3>
              <p className="text-xs sm:text-sm text-[#8696A0] mb-4 sm:mb-6">Agora você pode entrar no grupo VIP no Telegram.</p>
              <Button onClick={openTelegram} className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white py-5 sm:py-6 rounded-xl text-sm sm:text-base">
                Entrar no Grupo no Telegram
              </Button>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LineuSilvaPage;
