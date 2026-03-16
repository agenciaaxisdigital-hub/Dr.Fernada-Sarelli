import { useState } from "react";
import { Calendar, Clock, MapPin, Search, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";

type Tab = "proximos" | "realizados" | "todos";

const Agenda = () => {
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<Tab>("proximos");

  const { events, loading, error } = useGoogleCalendar({ filter: "all" });

  const filtrados = events.filter((e) => {
    const matchBusca =
      e.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      e.local.toLowerCase().includes(busca.toLowerCase()) ||
      e.desc.toLowerCase().includes(busca.toLowerCase());
    if (tab === "proximos") return matchBusca && !e.passado;
    if (tab === "realizados") return matchBusca && e.passado;
    return matchBusca;
  });

  // For "proximos" sort ascending, for "realizados" sort descending (most recent first)
  const sorted = [...filtrados].sort((a, b) => {
    const dateA = new Date(a.dataISO).getTime();
    const dateB = new Date(b.dataISO).getTime();
    return tab === "realizados" ? dateB - dateA : dateA - dateB;
  });

  return (
    <Layout>
      <PageHeader
        title="Agenda de"
        titleAccent="Eventos"
        subtitle="Acompanhe os próximos eventos e atividades da Dra. Fernanda Sarelli"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar evento ou cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <div className="flex gap-1">
              {([["proximos", "Próximos"], ["realizados", "Realizados"], ["todos", "Todos"]] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando eventos...</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <p className="text-center text-muted-foreground py-10">
              Não foi possível carregar os eventos. Tente novamente mais tarde.
            </p>
          )}

          {/* Events list */}
          {!loading && !error && (
            <div className="mt-8 space-y-4">
              {sorted.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Nenhum evento encontrado.</p>
              )}
              {sorted.map((e, i) => (
                <ScrollReveal key={e.id} delay={Math.min(i * 0.08, 0.4)}>
                  <div className={`flex gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg ${e.passado ? "opacity-60" : ""}`}>
                    {/* Date badge */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-primary text-primary-foreground">
                      <span className="text-xl font-bold leading-none">{e.dia}</span>
                      <span className="text-xs font-semibold uppercase">{e.mes}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{e.titulo}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {e.hora}
                          {e.horaFim && e.horaFim !== e.hora && ` – ${e.horaFim}`}
                        </span>
                        {e.local && (
                          <a
                            href={e.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            {e.local}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {e.desc && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{e.desc}</p>
                      )}
                      {!e.passado && (
                        <a
                          href={e.gcal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent transition-colors"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Adicionar à minha agenda
                        </a>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Agenda;
