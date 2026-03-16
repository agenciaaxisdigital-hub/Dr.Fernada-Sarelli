import { useState } from "react";
import { Calendar, Clock, MapPin, Search, ExternalLink, Loader2, CalendarDays, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";

type Tab = "proximos" | "realizados" | "todos";

/* Group events by month/year */
function groupByMonth(events: CalendarEvent[]) {
  const groups: { label: string; events: CalendarEvent[] }[] = [];
  const map = new Map<string, CalendarEvent[]>();

  for (const ev of events) {
    const d = new Date(ev.dataISO);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (!map.has(key)) {
      map.set(key, []);
      groups.push({ label, events: map.get(key)! });
    }
    map.get(key)!.push(ev);
  }
  return groups;
}

const tabConfig: { key: Tab; label: string; icon: string }[] = [
  { key: "proximos", label: "Próximos", icon: "📅" },
  { key: "realizados", label: "Realizados", icon: "✅" },
  { key: "todos", label: "Todos", icon: "📋" },
];

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

  const sorted = [...filtrados].sort((a, b) => {
    const dateA = new Date(a.dataISO).getTime();
    const dateB = new Date(b.dataISO).getTime();
    return tab === "realizados" ? dateB - dateA : dateA - dateB;
  });

  const groups = groupByMonth(sorted);
  const totalProximos = events.filter((e) => !e.passado).length;
  const totalRealizados = events.filter((e) => e.passado).length;

  return (
    <Layout>
      <PageHeader
        title="Agenda de"
        titleAccent="Eventos"
        subtitle="Acompanhe os próximos eventos e atividades da Dra. Fernanda Sarelli"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">

          {/* Stats bar */}
          {!loading && !error && (
            <div className="flex gap-3 mb-6">
              <div className="flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-2">
                <CalendarDays className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">
                  {totalProximos} próximo{totalProximos !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {totalRealizados} realizado{totalRealizados !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-2xl bg-card border p-4">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar evento, cidade ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 rounded-full border-muted bg-background"
              />
            </div>
            <div className="flex gap-1 bg-muted rounded-full p-1">
              {tabConfig.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    tab === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mr-1.5">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter indicator */}
          {busca && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                Filtro: "{busca}"
                <button onClick={() => setBusca("")} className="ml-1 hover:text-foreground">✕</button>
              </Badge>
              <span className="text-sm text-muted-foreground">
                {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mt-3 text-muted-foreground">Carregando eventos...</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 p-10 text-center">
              <p className="text-muted-foreground">
                Não foi possível carregar os eventos. Tente novamente mais tarde.
              </p>
            </div>
          )}

          {/* Events grouped by month */}
          {!loading && !error && (
            <div className="mt-8 space-y-8">
              {sorted.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed p-10 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-muted-foreground">Nenhum evento encontrado.</p>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.label}>
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    {group.label}
                  </h2>
                  <div className="space-y-3">
                    {group.events.map((e, i) => (
                      <ScrollReveal key={e.id} delay={Math.min(i * 0.06, 0.3)}>
                        <div
                          className={`group flex gap-4 rounded-2xl border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20 ${
                            e.passado ? "opacity-50" : ""
                          }`}
                        >
                          {/* Date badge */}
                          <div className={`flex-shrink-0 flex flex-col items-center justify-center h-[4.5rem] w-[4.5rem] rounded-2xl ${
                            e.passado
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary text-primary-foreground shadow-md"
                          }`}>
                            <span className="text-2xl font-bold leading-none">{e.dia}</span>
                            <span className="text-[0.65rem] font-semibold uppercase mt-0.5">{e.mes}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                                {e.titulo}
                              </h3>
                              {e.passado && (
                                <Badge variant="secondary" className="text-[0.65rem] shrink-0">Realizado</Badge>
                              )}
                            </div>

                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary/60" />
                                {e.hora}
                                {e.horaFim && e.horaFim !== e.hora && ` – ${e.horaFim}`}
                              </span>
                              {e.local && (
                                <a
                                  href={e.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                >
                                  <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                  <span className="truncate max-w-[200px]">{e.local}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              )}
                            </div>

                            {e.desc && (
                              <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2">{e.desc}</p>
                            )}

                            {!e.passado && (
                              <a
                                href={e.gcal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Agenda;
