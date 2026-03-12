import { useState, useEffect, useCallback } from "react";
import { DollarSign, Plus, Save, Filter, CalendarDays, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdFinancial {
  id?: string;
  date: string;
  ad_spend: number;
  revenue: number;
  notes: string;
  exchange_rate?: number;
  ad_spend_brl?: number;
}

type FilterPreset = "today" | "yesterday" | "7d" | "15d" | "30d" | "month" | "custom" | "all";

interface FinancialSectionProps {
  totalDisparos: number;
  totalSent: number;
  publicLeadsCount: number;
  onDataLoaded?: (financials: AdFinancial[]) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return {
    value: format(d, "yyyy-MM"),
    label: format(d, "MMMM yyyy", { locale: ptBR }),
  };
});

const FinancialSection = ({ totalDisparos, totalSent, publicLeadsCount, onDataLoaded }: FinancialSectionProps) => {
  const [allFinancials, setAllFinancials] = useState<AdFinancial[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFinForm, setShowFinForm] = useState(false);
  const [finDate, setFinDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [finSpend, setFinSpend] = useState("");
  const [finRevenue, setFinRevenue] = useState("");
  const [finNotes, setFinNotes] = useState("");
  const [savingFin, setSavingFin] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [currentRate, setCurrentRate] = useState<number | null>(null);

  // Filters
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("30d");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("ad_financials") as any)
        .select("*")
        .order("date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      setAllFinancials((data || []) as AdFinancial[]);
      onDataLoaded?.((data || []) as AdFinancial[]);
    } catch (e) {
      console.error("Error fetching financials:", e);
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => { fetchFinancials(); }, [fetchFinancials]);

  // Filter financials based on preset
  const filteredFinancials = allFinancials.filter((f) => {
    const fDate = parseISO(f.date);
    const today = new Date();
    
    switch (filterPreset) {
      case "today":
        return f.date === format(today, "yyyy-MM-dd");
      case "yesterday":
        return f.date === format(subDays(today, 1), "yyyy-MM-dd");
      case "7d":
        return isWithinInterval(fDate, { start: subDays(today, 7), end: today });
      case "15d":
        return isWithinInterval(fDate, { start: subDays(today, 15), end: today });
      case "30d":
        return isWithinInterval(fDate, { start: subDays(today, 30), end: today });
      case "month": {
        const [y, m] = selectedMonth.split("-").map(Number);
        const mStart = startOfMonth(new Date(y, m - 1));
        const mEnd = endOfMonth(new Date(y, m - 1));
        return isWithinInterval(fDate, { start: mStart, end: mEnd });
      }
      case "custom":
        return isWithinInterval(fDate, { start: parseISO(customStart), end: parseISO(customEnd) });
      case "all":
      default:
        return true;
    }
  });

  // Fetch exchange rate for a date
  const fetchExchangeRate = async (date: string) => {
    setFetchingRate(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-exchange-rate", {
        body: { date },
      });
      if (error) throw error;
      if (data?.rate) {
        setCurrentRate(data.rate);
        return data.rate as number;
      }
      toast({ title: "Cotação não encontrada para esta data", variant: "destructive" });
      return null;
    } catch (err: any) {
      toast({ title: "Erro ao buscar cotação", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setFetchingRate(false);
    }
  };

  // Auto-fetch rate when date changes
  useEffect(() => {
    if (showFinForm && finDate) {
      fetchExchangeRate(finDate);
    }
  }, [finDate, showFinForm]);

  const handleSaveFinancial = async () => {
    if (!finSpend && !finRevenue) {
      toast({ title: "Preencha pelo menos gasto ou faturamento", variant: "destructive" });
      return;
    }
    setSavingFin(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let rate = currentRate;
      if (!rate) {
        rate = await fetchExchangeRate(finDate);
      }
      if (!rate) rate = 0;

      const spendUsd = parseFloat(finSpend || "0");
      const spendBrl = spendUsd * rate;

      const payload = {
        user_id: user.id,
        date: finDate,
        ad_spend: spendUsd,
        revenue: parseFloat(finRevenue || "0"),
        notes: finNotes,
        exchange_rate: rate,
        ad_spend_brl: spendBrl,
      };

      const { error } = await (supabase.from("ad_financials") as any).upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;

      toast({ title: "Dados financeiros salvos! 💰" });
      setShowFinForm(false);
      setFinSpend("");
      setFinRevenue("");
      setFinNotes("");
      setCurrentRate(null);
      fetchFinancials();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingFin(false);
    }
  };

  // Calculate KPIs from filtered data
  const totalAdSpendUsd = filteredFinancials.reduce((a, f) => a + Number(f.ad_spend || 0), 0);
  const totalAdSpendBrl = filteredFinancials.reduce((a, f) => a + Number(f.ad_spend_brl || Number(f.ad_spend || 0) * Number(f.exchange_rate || 0)), 0);
  const totalRevenue = filteredFinancials.reduce((a, f) => a + Number(f.revenue || 0), 0);
  const profit = totalRevenue - totalAdSpendBrl;
  const roi = totalAdSpendBrl > 0 ? (((totalRevenue - totalAdSpendBrl) / totalAdSpendBrl) * 100) : 0;
  const costPerDispatch = totalDisparos > 0 ? totalAdSpendBrl / totalDisparos : 0;
  const costPerMessage = totalSent > 0 ? totalAdSpendBrl / totalSent : 0;
  const costPerLead = publicLeadsCount > 0 ? totalAdSpendBrl / publicLeadsCount : 0;
  const revenuePerLead = publicLeadsCount > 0 ? totalRevenue / publicLeadsCount : 0;

  const formatBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatUsd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const presetButtons: { key: FilterPreset; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "7d", label: "7 dias" },
    { key: "15d", label: "15 dias" },
    { key: "30d", label: "30 dias" },
    { key: "month", label: "Mês" },
    { key: "custom", label: "Período" },
    { key: "all", label: "Tudo" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Controle Financeiro (Ads)
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchFinancials} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowFinForm(!showFinForm)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {showFinForm ? "Fechar" : "Registrar Dia"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {presetButtons.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={filterPreset === p.key ? "default" : "outline"}
              className="h-7 text-xs px-3"
              onClick={() => setFilterPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {filterPreset === "month" && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterPreset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-[160px] text-sm bg-background"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-[160px] text-sm bg-background"
            />
          </div>
        )}
      </div>

      {/* Input form */}
      {showFinForm && (
        <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={finDate}
                onChange={(e) => setFinDate(e.target.value)}
                className="h-9 bg-background text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Gasto em Ads (USD)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={finSpend}
                onChange={(e) => setFinSpend(e.target.value)}
                className="h-9 bg-background text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Faturamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={finRevenue}
                onChange={(e) => setFinRevenue(e.target.value)}
                className="h-9 bg-background text-sm"
              />
            </div>
            <Button onClick={handleSaveFinancial} disabled={savingFin} size="sm" className="h-9 gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {savingFin ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
              <Input
                placeholder="Ex: campanha nova, público frio..."
                value={finNotes}
                onChange={(e) => setFinNotes(e.target.value)}
                className="h-9 bg-background text-sm mt-1"
              />
            </div>
            <div className="text-right min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Cotação USD/BRL</Label>
              <p className={`text-sm font-bold mt-1 ${fetchingRate ? "text-muted-foreground animate-pulse" : "text-primary"}`}>
                {fetchingRate ? "Buscando..." : currentRate ? `R$ ${currentRate.toFixed(4)}` : "—"}
              </p>
              {currentRate && finSpend && (
                <p className="text-xs text-muted-foreground">
                  = {formatBrl(parseFloat(finSpend) * currentRate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Gasto (USD)</p>
          <p className="text-sm font-bold text-destructive">{formatUsd(totalAdSpendUsd)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Gasto (BRL)</p>
          <p className="text-sm font-bold text-destructive">{formatBrl(totalAdSpendBrl)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
          <p className="text-sm font-bold text-primary">{formatBrl(totalRevenue)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Lucro</p>
          <p className={`text-sm font-bold ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}>{formatBrl(profit)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">ROI</p>
          <p className={`text-sm font-bold ${roi >= 0 ? "text-emerald-400" : "text-destructive"}`}>{roi.toFixed(1)}%</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Dias</p>
          <p className="text-sm font-bold text-foreground">{filteredFinancials.length}</p>
        </div>
      </div>

      {/* Extra metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Custo/Disparo</p>
          <p className="text-sm font-bold text-foreground">{formatBrl(costPerDispatch)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Custo/Mensagem</p>
          <p className="text-sm font-bold text-foreground">{formatBrl(costPerMessage)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Custo/Lead</p>
          <p className="text-sm font-bold text-foreground">{formatBrl(costPerLead)}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Receita/Lead</p>
          <p className="text-sm font-bold text-primary">{formatBrl(revenuePerLead)}</p>
        </div>
      </div>

      {/* Table */}
      {filteredFinancials.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium text-right">Gasto (USD)</th>
                <th className="pb-2 font-medium text-right">Cotação</th>
                <th className="pb-2 font-medium text-right">Gasto (BRL)</th>
                <th className="pb-2 font-medium text-right">Faturamento</th>
                <th className="pb-2 font-medium text-right">Lucro</th>
                <th className="pb-2 font-medium">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFinancials.map((f, i) => {
                const spendBrl = Number(f.ad_spend_brl || Number(f.ad_spend || 0) * Number(f.exchange_rate || 0));
                const dayProfit = Number(f.revenue) - spendBrl;
                return (
                  <tr key={f.id || i} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 text-foreground">{format(parseISO(f.date), "dd/MM/yyyy")}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{formatUsd(Number(f.ad_spend))}</td>
                    <td className="py-2.5 text-right text-muted-foreground text-xs">
                      {Number(f.exchange_rate) > 0 ? `R$ ${Number(f.exchange_rate).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-destructive font-medium">{formatBrl(spendBrl)}</td>
                    <td className="py-2.5 text-right text-primary font-medium">{formatBrl(Number(f.revenue))}</td>
                    <td className={`py-2.5 text-right font-medium ${dayProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                      {formatBrl(dayProfit)}
                    </td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-[150px]">{f.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no período selecionado</p>
      )}
    </div>
  );
};

export default FinancialSection;
