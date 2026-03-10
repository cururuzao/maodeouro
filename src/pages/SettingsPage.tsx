import DashboardLayout from "@/components/DashboardLayout";

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-foreground mb-1">Configurações</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Configurações gerais do sistema
        </p>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Z-API</h3>
            <p className="text-xs text-muted-foreground">
              As instâncias Z-API são gerenciadas na página <strong>Instâncias</strong>. 
              Cada instância possui seu próprio Instance ID, Token e Client-Token.
            </p>
            <p className="text-xs text-muted-foreground">
              Crie sua conta e instâncias em{" "}
              <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                app.z-api.io
              </a>
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
