import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Mail, Lock, User, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SocialAuthButtons from "@/components/SocialAuthButtons";

const SignupPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar a conta." });
      navigate("/login");
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
            Comece a <span className="text-primary">transformar</span> seu negócio agora
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Crie sua conta gratuita e comece a disparar mensagens em massa para seus clientes.
          </p>

          <div className="space-y-5">
            {[
              { icon: Zap, title: "Setup em 2 minutos", desc: "Conecte e comece a disparar rapidamente" },
              { icon: Shield, title: "Sem compromisso", desc: "Cancele quando quiser, sem taxa" },
              { icon: Users, title: "Suporte dedicado", desc: "Estamos aqui para ajudar você crescer" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium text-sm">{f.title}</p>
                  <p className="text-muted-foreground text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-4 text-3xl">
              ✋
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mão de Ouro</h1>
            <p className="text-sm text-primary font-medium">Disparos em Massa</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-foreground">Crie sua conta</h2>
            <p className="text-muted-foreground text-sm mt-1">Comece gratuitamente em poucos segundos</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg shadow-primary/5">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-12 bg-secondary border-border pl-10 rounded-xl text-sm" minLength={6} required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold shadow-md shadow-primary/25">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta"}
              </Button>
            </form>

            <div className="mt-5">
              <SocialAuthButtons />
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            © 2026 Mão de Ouro Disparos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
