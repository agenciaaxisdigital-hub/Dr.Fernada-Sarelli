import { useState } from "react";
import { Calendar, Clock, MapPin, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string;
  local: string;
  categoria: string;
  descricao: string;
}

const eventos: Evento[] = [
  { id: 1, titulo: "Audiência Pública - Saúde", data: "2025-07-20", hora: "14:00", local: "Câmara Municipal", categoria: "Saúde", descricao: "Discussão sobre o plano municipal de saúde." },
  { id: 2, titulo: "Reunião Comunitária", data: "2025-07-22", hora: "19:00", local: "Centro Comunitário Bairro Novo", categoria: "Comunidade", descricao: "Escuta ativa com moradores sobre demandas locais." },
  { id: 3, titulo: "Seminário de Educação", data: "2025-07-25", hora: "09:00", local: "Escola Municipal Centro", categoria: "Educação", descricao: "Debate sobre investimentos em infraestrutura escolar." },
  { id: 4, titulo: "Caminhada pela Segurança", data: "2025-08-02", hora: "08:00", local: "Praça Central", categoria: "Segurança", descricao: "Caminhada em defesa da segurança pública." },
  { id: 5, titulo: "Palestra - Meio Ambiente", data: "2025-08-10", hora: "15:00", local: "Parque Municipal", categoria: "Meio Ambiente", descricao: "Palestra sobre sustentabilidade urbana." },
];

const categorias = ["Todos", ...Array.from(new Set(eventos.map((e) => e.categoria)))];

const formatDate = (d: string) => {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const googleCalendarUrl = (e: Evento) => {
  const start = e.data.replace(/-/g, "") + "T" + e.hora.replace(":", "") + "00";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.titulo)}&dates=${start}/${start}&location=${encodeURIComponent(e.local)}&details=${encodeURIComponent(e.descricao)}`;
};

const Agenda = () => {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("Todos");

  const filtrados = eventos.filter((e) => {
    const matchBusca = e.titulo.toLowerCase().includes(busca.toLowerCase()) || e.local.toLowerCase().includes(busca.toLowerCase());
    const matchCat = cat === "Todos" || e.categoria === cat;
    return matchBusca && matchCat;
  });

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <ScrollReveal>
            <p className="ui-caps text-sm text-primary mb-2">Agenda</p>
            <h1>Próximos Eventos</h1>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar evento..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-10 space-y-4">
            {filtrados.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Nenhum evento encontrado.</p>
            )}
            {filtrados.map((e, i) => (
              <ScrollReveal key={e.id} delay={i * 0.1}>
                <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <span className="ui-caps text-xs text-primary">{e.categoria}</span>
                      <h3 className="mt-1 text-lg font-semibold">{e.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{e.descricao}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(e.data)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{e.hora}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{e.local}</span>
                      </div>
                    </div>
                    <a
                      href={googleCalendarUrl(e)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105 whitespace-nowrap"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Adicionar ao Calendário
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Agenda;
