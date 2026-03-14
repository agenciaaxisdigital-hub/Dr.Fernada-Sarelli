import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Phone, MessageSquare, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Mensagem = Tables<"mensagens_contato">;

const Admin = () => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-login");
        return;
      }
      const { data, error } = await supabase
        .from("mensagens_contato")
        .select("*")
        .order("criado_em", { ascending: false });
      if (!error && data) setMensagens(data);
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-lg font-bold text-primary">Painel Admin</h1>
          <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Mensagens Recebidas</h2>
          <p className="text-muted-foreground text-sm mt-1">{mensagens.length} mensagen(s)</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="p-4 text-sm font-semibold">Nome</th>
                <th className="p-4 text-sm font-semibold">Telefone</th>
                <th className="p-4 text-sm font-semibold">E-mail</th>
                <th className="p-4 text-sm font-semibold">Mensagem</th>
                <th className="p-4 text-sm font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {mensagens.map((m) => (
                <tr key={m.id} className="border-b last:border-0 transition-colors hover:bg-accent/30">
                  <td className="p-4 text-sm font-medium">{m.nome}</td>
                  <td className="p-4 text-sm">{m.telefone}</td>
                  <td className="p-4 text-sm text-muted-foreground">{m.email || "—"}</td>
                  <td className="p-4 text-sm max-w-xs truncate">{m.mensagem}</td>
                  <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{formatDate(m.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mensagens.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Nenhuma mensagem ainda.</p>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {mensagens.map((m) => (
            <div key={m.id} className="rounded-2xl border bg-card p-5 space-y-3">
              <p className="font-semibold">{m.nome}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />{m.telefone}
              </div>
              {m.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />{m.email}
                </div>
              )}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />{m.mensagem}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />{formatDate(m.criado_em)}
              </div>
            </div>
          ))}
          {mensagens.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Nenhuma mensagem ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
