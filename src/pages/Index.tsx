import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadConfig, saveConfigToDB, saveConfig, testConnection } from "@/lib/evolution-api";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Auto-redirect if config already exists in DB
  useEffect(() => {
    loadConfig().then((config) => {
      if (config) {
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
      }
    });
  }, [navigate]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl || !apiKey) return;

    setTesting(true);
    setStatus("idle");

    // Set in-memory for test
    saveConfig({ baseUrl: baseUrl.replace(/\/$/, ""), apiKey });

    const ok = await testConnection();
    setTesting(false);

    if (ok) {
      // Persist to DB
      await saveConfigToDB({ baseUrl, apiKey });
      setStatus("success");
      toast({ title: "Conectado com sucesso!" });
      setTimeout(() => navigate("/dashboard"), 800);
    } else {
      setStatus("error");
      toast({
        title: "Falha na conexão",
        description: "Verifique a URL e a API Key",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">WhatPanel</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie suas instâncias WhatsApp via Evolution API
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Conectar ao servidor
          </h2>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm text-muted-foreground">
                URL da Evolution API
              </Label>
              <Input
                id="url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://sua-api.exemplo.com"
                className="h-11 bg-secondary border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key" className="text-sm text-muted-foreground">
                API Key (Global)
              </Label>
              <Input
                id="key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API"
                className="h-11 bg-secondary border-border"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={testing}
              className="w-full h-11 text-sm font-semibold"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando conexão...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conectado!
                </>
              ) : status === "error" ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Tentar novamente
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ainda não tem uma Evolution API?{" "}
          <a
            href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Veja como instalar
          </a>
        </p>
      </div>
    </div>
  );
};

export default Index;
