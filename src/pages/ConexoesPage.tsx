import { useState } from "react";
import { Link2, Code, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

const ConexoesPage = () => {
  const summaryItems = [
    { label: "Conectados", value: 0, icon: "✅" },
    { label: "Desconectados", value: 0, icon: "❌" },
    { label: "Gerados", value: 0, icon: "<>" },
    { label: "Solicitados", value: 0, icon: "🔔" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
            <p className="text-sm text-muted-foreground">Histórico de conexões e desconexões das instâncias</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-secondary rounded-lg border border-border">
              <button className="px-3 py-1.5 text-xs font-medium text-foreground bg-card rounded-l-lg border-r border-border">📊 Tabela</button>
              <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-r-lg">🔲 Colunas</button>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-6 flex-wrap">
          {summaryItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span>{item.icon}</span>
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <select className="h-8 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground">
              <option>7 dias</option>
              <option>30 dias</option>
            </select>
            <div className="h-8 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground flex items-center">
              📅 04/03 - 10/03
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8"><RefreshCw className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { title: "Conexões", count: 0, icon: Link2 },
            { title: "Gerados", count: 0, icon: Code },
            { title: "Solicitados", count: 0, icon: Bell },
          ].map((col) => (
            <div key={col.title} className="bg-card border border-border rounded-xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <col.icon className="w-4 h-4" /> {col.title}
                </h3>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{col.count}</span>
              </div>
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground py-8">Nenhum registro</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConexoesPage;
