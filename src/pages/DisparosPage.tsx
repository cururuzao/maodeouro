import { useState, useEffect } from "react";
import { Send, RefreshCw, Users, Hash, Play, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

const DisparosPage = () => {
  const stats = [
    { label: "Total Disparos", value: "0", sub: "mensagens enviadas", icon: Send },
    { label: "Números Únicos", value: "0", sub: "números utilizados", icon: Hash },
    { label: "Execuções", value: "0", sub: "campanhas executadas", icon: Play },
    { label: "Média de Disparos", value: "0", sub: "média por execuções", icon: BarChart3 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disparos</h1>
            <p className="text-sm text-muted-foreground">Histórico de execuções de mensagens</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
            <div className="h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground flex items-center gap-2">
              <span>📅</span><span>04/03/2026 - 10/03/2026</span>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9"><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Executions table */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Play className="w-4 h-4" /> Execuções Recentes
            </h2>
          </div>
          <div className="p-5">
            <div className="flex gap-3 mb-4 flex-wrap">
              {["Todos Status", "Todas Instâncias", "Todas Listas", "Todos Templates"].map((f) => (
                <select key={f} className="h-8 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground">
                  <option>{f}</option>
                </select>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-3 px-3 font-medium">Início</th>
                    <th className="text-left py-3 px-3 font-medium">Status</th>
                    <th className="text-left py-3 px-3 font-medium">Disparos</th>
                    <th className="text-left py-3 px-3 font-medium">Duração</th>
                    <th className="text-left py-3 px-3 font-medium">Instância</th>
                    <th className="text-left py-3 px-3 font-medium">Número</th>
                    <th className="text-left py-3 px-3 font-medium">Lista</th>
                    <th className="text-left py-3 px-3 font-medium">Template</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma execução encontrada
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisparosPage;
