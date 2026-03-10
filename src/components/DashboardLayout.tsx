import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadConfig } from "@/lib/evolution-api";
import { Loader2 } from "lucide-react";
import AppSidebar from "./AppSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadConfig().then((config) => {
      if (!config) {
        navigate("/", { replace: true });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
