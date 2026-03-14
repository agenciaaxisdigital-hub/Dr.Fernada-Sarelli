import { useState } from "react";
import { Calendar, Clock, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

interface Evento {
  id: number;
  dia: string;
  mes: string;
  titulo: string;
  hora: string;
  local: string;
  desc: string;
  destaque: boolean;
  gcal: string;
  passado: boolean;
}

const eventos: Evento[] = [
  { id: 1, dia: "11", mes: "ABR", titulo: "Reunião com Lideranças Comunitárias", hora: "19:00", local: "Goiânia — Sede da Campanha", desc: "Encontro com líderes de bairros para ouvir demandas da comunidade.", destaque: false, gcal: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Reuni%C3%A3o+com+Lideran%C3%A7as+Comunit%C3%A1rias&dates=20260411T230000Z%2F20260412T010000Z&details=Encontro+com+l%C3%ADderes+de+bairros+para+ouvir+demandas+da+comunidade.&location=Goi%C3%A2nia%2C+Sede+da+Campanha", passado: false },
  { id: 2, dia: "04", mes: "ABR", titulo: "Caravana da Saúde — Região Metropolitana", hora: "08:00", local: "Aparecida de Goiânia — Praça Central", desc: "Atendimento gratuito e orientações de saúde para a população.", destaque: true, gcal: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Caravana+da+Sa%C3%BAde+%E2%80%94+Regi%C3%A3o+Metropolitana&dates=20260404T120000Z%2F20260404T140000Z&details=Atendimento+gratuito+e+orienta%C3%A7%C3%B5es+de+sa%C3%BAde+para+a+popula%C3%A7%C3%A3o.&location=Aparecida+de+Goi%C3%A2nia%2C+Pra%C3%A7a+Central", passado: false },
  { id: 3, dia: "21", mes: "MAR", titulo: "Audiência Pública — Educação em Goiás", hora: "09:00", local: "Anápolis — Câmara Municipal", desc: "Debate sobre investimentos e políticas educacionais para o estado.", destaque: false, gcal: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Audi%C3%AAncia+P%C3%BAblica+%E2%80%94+Educa%C3%A7%C3%A3o+em+Goi%C3%A1s&dates=20260321T130000Z%2F20260321T150000Z&details=Debate+sobre+investimentos+e+pol%C3%ADticas+educacionais+para+o+estado.&location=An%C3%A1polis%2C+C%C3%A2mara+Municipal", passado: false },
  { id: 4, dia: "14", mes: "MAR", titulo: "Encontro Comunitário — Saúde para Todos", hora: "14:00", local: "Goiânia — Centro de Convenções", desc: "Evento aberto à comunidade para discutir melhorias na saúde pública goiana.", destaque: true, gcal: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Encontro+Comunit%C3%A1rio+%E2%80%94+Sa%C3%BAde+para+Todos&dates=20260314T180000Z%2F20260314T200000Z&details=Evento+aberto+%C3%A0+comunidade+para+discutir+melhorias+na+sa%C3%BAde+p%C3%BAblica+goiana.&location=Goi%C3%A2nia%2C+Centro+de+Conven%C3%A7%C3%B5es", passado: false },
  { id: 5, dia: "07", mes: "MAR", titulo: "Visita ao Hospital Materno-Infantil", hora: "10:00", local: "Goiânia — Hospital Materno-Infantil", desc: "Visita técnica e reunião com equipe médica sobre melhorias no atendimento.", destaque: false, gcal: "#", passado: true },
  { id: 6, dia: "28", mes: "FEV", titulo: "Palestra — Direitos da Mulher", hora: "19:00", local: "Goiânia — Centro Cultural", desc: "Palestra sobre os avanços e desafios nos direitos das mulheres.", destaque: false, gcal: "#", passado: true },
];

type Tab = "proximos" | "realizados" | "todos";

const Agenda = () => {
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<Tab>("proximos");

  const filtrados = eventos.filter((e) => {
    const matchBusca = e.titulo.toLowerCase().includes(busca.toLowerCase()) || e.local.toLowerCase().includes(busca.toLowerCase());
    if (tab === "proximos") return matchBusca && !e.passado;
    if (tab === "realizados") return matchBusca && e.passado;
    return matchBusca;
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

          {/* Events list */}
          <div className="mt-8 space-y-4">
            {filtrados.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Nenhum evento encontrado.</p>
            )}
            {filtrados.map((e, i) => (
              <ScrollReveal key={e.id} delay={i * 0.08}>
                <div className={`flex gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg ${e.passado ? "opacity-60" : ""}`}>
                  {/* Date badge */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-primary text-primary-foreground">
                    <span className="text-xl font-bold leading-none">{e.dia}</span>
                    <span className="text-xs font-semibold uppercase">{e.mes}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{e.titulo}</h3>
                      {e.destaque && (
                        <span className="flex-shrink-0 rounded-full border border-primary/30 bg-accent px-3 py-0.5 text-xs font-semibold text-primary">
                          Destaque
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.hora}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.local}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{e.desc}</p>
                    {!e.passado && (
                      <a
                        href={e.gcal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Adicionar ao Google
                      </a>
                    )}
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
