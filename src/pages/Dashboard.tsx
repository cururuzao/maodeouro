import { useState, useEffect, useCallback } from "react";
import { Send, DollarSign, TrendingUp, Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchInstances, type Instance } from "@/lib/evolution-api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const chartData = [
  { date: "04/03", disparos: 0, pix: 0 },
  { date: "05/03", disparos: 0, pix: 0 },
  { date: "06/03", disparos: 0, pix: 0 },
  { date: "07/03", disparos: 0, pix: 0 },
  { date: "08/03", disparos: 0, pix: 0 },
  { date: "09/03", disparos: 0, pix: 0 },
  { date: "10/03", disparos: 0, pix: 0 },
];

const Dashboard = () => {
  const [instances, setInstances] = useState<Instance[]>([]);

  useEffect(() => {
    fetchInstances()
      .then((data) => setInstances(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Disparos", value: "0", icon: Send, sub1: "Média por exec.", sub1Val: "0", sub2: "Números únicos", sub2Val: "0" },
    { label: "Faturamento", value: "R$ 0,00", icon: DollarSign, sub1: "Pix gerados", sub1Val: "R$ 0,00", sub2: "Taxa conversão pix", sub2Val: "0.0%" },
    { label: "ROI", value: "0.0x", icon: TrendingUp, sub1: "Faturamento", sub1Val: "R$ 0,00", sub2: "Custos", sub2Val: "R$ 0,00" },
    { label: "Custo/Disparo", value: "R$ 0,00", icon: Calculator, sub1: "Custo/Número", sub1Val: "R$ 0,00", sub2: "Lucro/disparo", sub2Val: "R$ 0,00" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral das suas operações</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
            <div className="h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground flex items-center gap-2">
              <span>📅</span>
              <span>04/03/2026 - 10/03/2026</span>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-3">{s.value}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{s.sub1}</span>
                  <span className="text-foreground">{s.sub1Val}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{s.sub2}</span>
                  <span className="text-foreground">{s.sub2Val}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Recent Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Disparos X Pix Pagos</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="disparos" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Disparos" />
                <Area type="monotone" dataKey="pix" stroke="hsl(var(--warning))" fill="hsl(var(--warning) / 0.1)" name="Pix Pagos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Listas Recentes</h2>
            <p className="text-sm text-muted-foreground">Nenhuma lista recente</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Atividades Recentes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" /> Últimas Execuções
              </h3>
              <p className="text-sm text-muted-foreground">Sem execuções recentes</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>📡</span> Últimas Conexões
              </h3>
              <p className="text-sm text-muted-foreground">Sem conexões recentes</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Últimas Transações
              </h3>
              <p className="text-sm text-muted-foreground">Sem transações recentes</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
