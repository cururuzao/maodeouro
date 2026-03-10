import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Mail, Lock, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl">
              ✋
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mão de Ouro</h1>
              <p className="text-sm text-primary font-medium">Disparos em Massa</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-foreground leading-tight mb-4">
            Alcance <span className="text-primary">milhares</span> de clientes com um clique
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            A plataforma mais poderosa para disparos em massa via WhatsApp. Rápido, seguro e eficiente.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">Disparos Ultrarrápidos</p>
                <p className="text-muted-foreground text-xs">Envie milhares de mensagens em minutos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">100% Seguro</p>
                <p className="text-muted-foreground text-xs">Seus dados protegidos com criptografia</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">Gestão de Leads</p>
                <p className="text-muted-foreground text-xs">Organize e segmente seus contatos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-4 text-3xl">
              ✋
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mão de Ouro</h1>
            <p className="text-sm text-primary font-medium">Disparos em Massa</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground text-sm mt-1">Entre na sua conta para continuar</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg shadow-primary/5">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem uma conta?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">Criar conta</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            © 2026 Mão de Ouro Disparos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
