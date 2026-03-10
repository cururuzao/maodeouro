import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const titles: Record<string, string> = {
  "/transacoes": "Transações",
  "/integracoes": "Integrações",
  "/ferramentas": "Ferramentas",
  "/admin": "Admin",
};

const PlaceholderPage = () => {
  const location = useLocation();
  const title = titles[location.pathname] || "Página";

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <Construction className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">Em breve disponível</p>
      </div>
    </DashboardLayout>
  );
};

export default PlaceholderPage;
