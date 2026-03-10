import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Copy, RefreshCw, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part1}-${part2}`;
}

const WhatsAppConnect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = location.state as { name?: string; email?: string } | null;
  const [code, setCode] = useState(generateCode);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!userData?.name || !userData?.email) {
      navigate("/", { replace: true });
    }
  }, [userData, navigate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Código copiado!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      toast({ title: "WhatsApp conectado com sucesso!" });
      navigate("/confirmacao", { state: { ...userData, whatsappCode: code } });
    }, 2000);
  };

  const handleNewCode = () => {
    setCode(generateCode());
    toast({ title: "Novo código gerado!" });
  };

  if (!userData?.name) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />

      <section className="py-10 px-4">
        <div className="max-w-md mx-auto">
          {/* Connection Code Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground text-center mb-5">
              Seu código de conexão:
            </h2>

            <div className="flex items-center justify-center gap-3 bg-secondary rounded-lg p-4 mb-5">
              <span className="text-xl font-mono font-bold text-foreground tracking-widest">
                {code}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
            </div>

            {/* Important notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-start justify-center gap-2 mb-1">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm font-semibold text-blue-700">Importante</span>
              </div>
              <p className="text-sm text-blue-600">
                Não feche esta página até que apareça a mensagem de confirmação "WhatsApp Conectado!".
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="text-base font-bold text-foreground mb-4">Como conectar:</h3>
            <ol className="space-y-3 text-sm text-foreground">
              <li>1. Abra o WhatsApp no seu celular</li>
              <li>
                2. Toque em <strong>Menu</strong> (três pontos) ou{" "}
                <strong>Configurações</strong>
              </li>
              <li>
                3. Selecione <strong>Aparelhos conectados</strong>
              </li>
              <li>
                4. Toque em <strong>Conectar um aparelho</strong>
              </li>
              <li>
                5. Toque em <strong>Conectar com número de telefone</strong> na parte inferior da tela
              </li>
              <li>
                6. Digite o código <strong className="font-mono">{code}</strong> mostrado acima
              </li>
              <li>7. Aguarde a confirmação da conexão</li>
            </ol>
          </div>

          {/* Tip */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong className="text-primary">Dica:</strong> Mantenha esta página aberta até concluir a conexão. O código expira após alguns minutos.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full h-12 text-sm font-semibold bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isConfirming ? "Confirmando..." : "Confirmar conexão"}
            </Button>

            <Button
              onClick={handleNewCode}
              variant="outline"
              className="w-full h-12 text-sm font-semibold border-primary text-primary hover:bg-primary/5"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Gerar novo código
            </Button>
          </div>

          {/* Back */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voltar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhatsAppConnect;
