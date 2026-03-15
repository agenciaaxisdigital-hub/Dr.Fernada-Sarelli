import { useEffect, useState } from "react";
import { FileText, Eye, MessageCircle, Instagram, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface Stats {
  totalForms: number;
  totalVisitors: number;
  totalWhatsApp: number;
  totalInstagram: number;
  visitorsToday: number;
}

interface ChartData {
  dia: string;
  acessos: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalForms: 0, totalVisitors: 0, totalWhatsApp: 0, totalInstagram: 0, visitorsToday: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const load = async () => {
      // Total forms
      const { count: totalForms } = await supabase.from("mensagens_contato").select("*", { count: "exact", head: true });

      // Total visitors
      const { count: totalVisitors } = await supabase.from("acessos_site").select("*", { count: "exact", head: true });

      // Total WhatsApp clicks
      const { count: totalWhatsApp } = await supabase.from("cliques_whatsapp").select("*", { count: "exact", head: true }).eq("tipo_clique" as any, "whatsapp");

      // Total Instagram clicks
      const { count: totalInstagram } = await supabase.from("cliques_whatsapp").select("*", { count: "exact", head: true }).eq("tipo_clique" as any, "instagram");

      // Visitors today
      const today = new Date().toISOString().split("T")[0];
      const { count: visitorsToday } = await supabase.from("acessos_site").select("*", { count: "exact", head: true }).gte("criado_em", today);

      setStats({
        totalForms: totalForms || 0,
        totalVisitors: totalVisitors || 0,
        totalWhatsApp: totalWhatsApp || 0,
        totalInstagram: totalInstagram || 0,
        visitorsToday: visitorsToday || 0,
      });

      // Chart: last 7 days
      const days: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const nextDate = new Date(d);
        nextDate.setDate(nextDate.getDate() + 1);
        const { count } = await supabase
          .from("acessos_site")
          .select("*", { count: "exact", head: true })
          .gte("criado_em", dateStr)
          .lt("criado_em", nextDate.toISOString().split("T")[0]);
        days.push({
          dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          acessos: count || 0,
        });
      }
      setChartData(days);
    };

    load();
  }, []);

  const cards = [
    { label: "Formulários", value: stats.totalForms, icon: FileText, color: "text-primary" },
    { label: "Visitantes", value: stats.totalVisitors, icon: Eye, color: "text-blue-500" },
    { label: "Cliques WhatsApp", value: stats.totalWhatsApp, icon: MessageCircle, color: "text-green-500" },
    { label: "Cliques Instagram", value: stats.totalInstagram, icon: Instagram, color: "text-pink-500" },
    { label: "Visitantes Hoje", value: stats.visitorsToday, icon: Users, color: "text-orange-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
              <p className="mt-2 text-3xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Acessos — Últimos 7 dias</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                }}
              />
              <Line type="monotone" dataKey="acessos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
