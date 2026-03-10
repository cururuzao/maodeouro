import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Smartphone, Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">WhatPanel</h1>
          <p className="text-muted-foreground mt-1 text-sm">Crie sua conta</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" className="h-11 bg-secondary border-border pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-11 bg-secondary border-border pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-11 bg-secondary border-border pl-10" minLength={6} required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
