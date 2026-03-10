import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { loadConfig, saveConfigToDB, saveConfig, testConnection } from "@/lib/evolution-api";

const SettingsPage = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    loadConfig().then((config) => {
      if (config) {
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!baseUrl || !apiKey) return;

    setTesting(true);
    setStatus("idle");
    saveConfig({ baseUrl: baseUrl.replace(/\/$/, ""), apiKey });

    const ok = await testConnection();
    setTesting(false);

    if (ok) {
      await saveConfigToDB({ baseUrl, apiKey });
      setStatus("success");
      toast({ title: "Configuração salva e testada!" });
    } else {
      setStatus("error");
      toast({ title: "Conexão falhou", description: "Verifique os dados", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-foreground mb-1">Configurações</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Configure a conexão com sua Evolution API
        </p>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">URL da Evolution API</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://sua-api.exemplo.com"
              className="h-10 bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">API Key (Global)</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua chave de API"
              className="h-10 bg-secondary border-border"
            />
          </div>

          <Button onClick={handleSave} disabled={testing} className="w-full h-11">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvo!
              </>
            ) : status === "error" ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Tentar novamente
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar e testar
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
