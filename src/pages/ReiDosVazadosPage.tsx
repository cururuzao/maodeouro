import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Flame, Video, Sparkles } from "lucide-react";

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663113665449/as45WyzBdVgmTUSfVHBTEW";
const TELEGRAM_LINK = "https://t.me/reidosvazadoz_bot";

const HERO_SLIDES = [
  { id: 1, src: `${CDN_BASE}/copy_A6EFD7FE-3457-4050-8C0C-ACA100B7049E_4278313f.mov`, poster: `${CDN_BASE}/IMG_0340_94c5616d.JPG`, title: "Slide 1" },
  { id: 2, src: `${CDN_BASE}/copy_CBB0F59C-F8FE-476C-9062-16C9647370DC_3dbc6417.mov`, poster: `${CDN_BASE}/IMG_0341_acf4af45.JPG`, title: "Slide 2" },
  { id: 3, src: `${CDN_BASE}/copy_8191B16E-8FB6-4C94-B571-9A3F2D0191B5_f313d20d.mov`, poster: `${CDN_BASE}/IMG_0338_99fa3ab4.JPG`, title: "Slide 3" },
  { id: 4, src: `${CDN_BASE}/copy_F77CF4BE-F77E-4A2A-B91D-D6FD9A85F1C7_ba07e227.mov`, poster: `${CDN_BASE}/IMG_0344_e7438fa6.JPG`, title: "Slide 4" },
  { id: 5, src: `${CDN_BASE}/copy_CECFB5DB-0CFF-4FBB-986C-B245B1D1CA7E_3a02e764.mov`, poster: `${CDN_BASE}/IMG_0342_ad561fc3.JPG`, title: "Slide 5" },
  { id: 6, src: `${CDN_BASE}/E3F91A2F-CDF1-404E-8027-F60ABB08C574_628f9b27.mov`, poster: `${CDN_BASE}/IMG_0286_8ef9cf86.JPG`, title: "Slide 6" },
  { id: 7, src: `${CDN_BASE}/copy_E9F8F4AE-B35D-4C6A-ACDD-2E058D36091A_a927ab1f.mov`, poster: `${CDN_BASE}/IMG_0343_ff766ecc.JPG`, title: "Slide 7" },
];

const ReiDosVazadosPage = () => {
  const [heroSlide, setHeroSlide] = useState(0);
  const heroVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    heroVideoRefs.current.forEach((el, i) => {
      if (el) {
        if (i === heroSlide) el.play().catch(() => {});
        else el.pause();
      }
    });
  }, [heroSlide]);

  const openTelegram = () => {
    window.open(TELEGRAM_LINK, "_blank");
  };

  const benefits = [
    { icon: Flame, title: "Conteúdo Exclusivo", description: "Os melhores vazados reunidos em um só lugar" },
    { icon: Video, title: "Organizado e Atualizado", description: "Centenas de vídeos e imagens postados diariamente" },
    { icon: Sparkles, title: "Acesso direto", description: "Fale com o bot no Telegram e siga as instruções" },
  ];

  return (
    <div
      className="min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-700/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={`${CDN_BASE}/IMG_0016_3eda9166.JPG`} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-white text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Rei dos Vazados
        </span>
      </header>

      <section className="px-4 pt-6 pb-10 max-w-lg mx-auto">
        <h1 className="text-center mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="block text-2xl md:text-3xl font-bold text-white">Conteúdo de vazados que você</span>
          <span className="block text-2xl md:text-3xl font-bold text-blue-500">NUNCA VIU 🔥</span>
        </h1>
        <p className="text-center text-white/90 text-sm md:text-base mb-6">
          Conheça o melhor grupo de vazados namorados, amadores, famosas e muito mais!
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
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white border-0 opacity-90 md:group-hover:opacity-100" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white border-0 opacity-90 md:group-hover:opacity-100" />
          </Carousel>
        </div>

        <div className="flex justify-center gap-1.5 mb-2">
          {HERO_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === heroSlide ? "w-4 bg-blue-500" : "w-1.5 bg-gray-600"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-white/80 text-sm mb-6">{heroSlide + 1}/7</p>

        <Button
          onClick={openTelegram}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-6 rounded-xl text-base"
        >
          ENTRAR NO VIP
        </Button>
      </section>

      <section className="px-4 pb-10 max-w-lg mx-auto">
        <div className="bg-[#1a1d24] rounded-2xl border border-gray-800 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Você está prestes a entrar no melhor grupo do Telegram
          </h2>
          <p className="text-white/90 text-sm md:text-base mb-2">
            Conteúdo novo todo dia. Entre agora e aproveite.
          </p>
          <p className="text-white font-semibold text-sm md:text-base mb-6">O que te espera:</p>
          <div className="space-y-4">
            {benefits.map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-black/50 border border-gray-800">
                <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-blue-500" />
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
          Dê uma espiadinha 👀
        </h3>
        <div className="rounded-2xl overflow-hidden bg-black border border-gray-800 mb-6 w-full max-w-[320px] mx-auto aspect-[9/16] min-h-[300px]">
          <video
            src={`${CDN_BASE}/ScreenRecording_03-10-202617-22-57_1_0e5f2d03.mp4`}
            controls
            className="w-full h-full object-contain bg-black"
            playsInline
            preload="metadata"
          />
        </div>
        <div className="text-center mt-4">
          <Button onClick={openTelegram} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-6 rounded-xl">
            Abrir no Telegram
          </Button>
        </div>
      </section>

      <footer className="bg-black border-t border-gray-800 py-6 text-center">
        <p className="text-gray-500 text-sm">Rei dos Vazados · Grupo no Telegram</p>
      </footer>
    </div>
  );
};

export default ReiDosVazadosPage;
