import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";

const Confirmacao = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = location.state as { name?: string; email?: string } | null;

  useEffect(() => {
    if (!userData?.name) {
      navigate("/", { replace: true });
    }
  }, [userData, navigate]);

  if (!userData?.name) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />

      <section className="py-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(142,71%,45%)]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Cadastro realizado!
          </h1>
          <p className="text-muted-foreground mb-2">
            Olá, <strong>{userData.name}</strong>!
          </p>
          <p className="text-muted-foreground mb-8">
            Seu cadastro foi concluído com sucesso. Em breve entraremos em contato pelo WhatsApp e pelo e-mail <strong>{userData.email}</strong>.
          </p>

          <div className="bg-card border border-border rounded-xl p-6 mb-8 text-left space-y-3">
            <h3 className="font-semibold text-foreground text-center mb-4">Resumo do cadastro</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="text-foreground font-medium">{userData.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">E-mail:</span>
              <span className="text-foreground font-medium">{userData.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">WhatsApp:</span>
              <span className="text-[hsl(142,71%,45%)] font-medium">Conectado ✓</span>
            </div>
          </div>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full h-11 text-sm font-semibold"
          >
            Voltar ao início
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Confirmacao;
