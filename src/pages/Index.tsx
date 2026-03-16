import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, ExternalLink, Shield, Heart, Users, Scale, MessageCircle, Facebook, Instagram, User, Mail, MapPinIcon, Loader2 } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import WaveDivider from "@/components/WaveDivider";
import ScrollReveal from "@/components/ScrollReveal";

const PHOTO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg";

const bandeiras = [
  {
    icon: Heart,
    title: "Defesa da Mulher",
    desc: "Compromisso com os direitos, saúde e proteção integral das mulheres goianas. Combate à violência, igualdade de oportunidades e empoderamento feminino.",
  },
  {
    icon: Shield,
    title: "Defesa da Criança",
    desc: "Proteção integral da infância e adolescência. Garantia de direitos fundamentais, combate ao abuso e acesso pleno à saúde e educação de qualidade.",
  },
  {
    icon: Users,
    title: "Famílias em Vulnerabilidade",
    desc: "Políticas públicas efetivas de assistência social, geração de emprego e renda, moradia digna e apoio integral às famílias em situação de risco.",
  },
  {
    icon: Scale,
    title: "Igualdade e Políticas Públicas",
    desc: "Promoção da igualdade, inclusão social e políticas públicas que garantam dignidade, cidadania e oportunidades para toda população goiana.",
  },
];


const redes = [
  { icon: MessageCircle, label: "WhatsApp", handle: "(62) 99323-7397", url: "https://wa.me/5562993237397?text=Ol%C3%A1%20Dra.%20Fernanda%20Sarelli" },
  { icon: Facebook, label: "Facebook", handle: "@drafernandaSarelli", url: "https://www.facebook.com/people/Dra-Fernanda-Sarelli/61554974150545/" },
  { icon: Instagram, label: "Instagram", handle: "@drafernandasarelli", url: "https://www.instagram.com/drafernandasarelli/" },
];

interface HomeGalleryPhoto {
  id: string;
  titulo: string;
  legenda: string | null;
  url_foto: string;
}

const Index = () => {
  const [galeriaFotos, setGaleriaFotos] = useState<HomeGalleryPhoto[]>([]);
  const { events: proximosEventos, loading: eventosLoading } = useGoogleCalendar({ filter: "proximos", limit: 3 });

  useEffect(() => {
    const loadGaleria = async () => {
      // Primeiro tenta fotos marcadas como destaque_home
      const { data: destaquesData } = await (supabase
        .from("galeria_fotos")
        .select("id, titulo, legenda, url_foto") as any)
        .eq("visivel", true)
        .eq("destaque_home", true)
        .order("ordem")
        .limit(6);

      if (destaquesData && destaquesData.length > 0) {
        setGaleriaFotos(destaquesData as HomeGalleryPhoto[]);
        return;
      }

      // Fallback: pega as 6 primeiras visíveis
      const { data: fotosData } = await supabase
        .from("galeria_fotos")
        .select("id, titulo, legenda, url_foto")
        .eq("visivel", true)
        .order("ordem")
        .limit(6);

      if (fotosData) {
        setGaleriaFotos(fotosData as HomeGalleryPhoto[]);
      }
    };

    loadGaleria();
  }, []);

  return (
    <Layout>
      <section className="gradient-hero relative overflow-hidden">
        <div className="container relative z-10 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <ScrollReveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium text-primary-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                  Pré-candidata 2026
                </span>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-tight">
                  Dra. Fernanda{" "}
                  <span className="text-primary-foreground">Sarelli</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <p className="mt-2 text-lg font-bold uppercase tracking-wider text-primary-foreground/80">
                  CHAMA A DOUTORA
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="mt-4 text-primary-foreground/80 leading-relaxed max-w-md">
                  Pré-candidata a Deputada Estadual por Goiás, com compromisso real com a defesa da mulher e da criança.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.25}>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/agenda"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                  >
                    <Calendar className="h-4 w-4" />
                    Ver Agenda
                  </Link>
                  <a
                    href="https://wa.me/5562993237397?text=Ol%C3%A1%20Dra.%20Fernanda%20Sarelli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-primary-foreground/40 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                  >
                    <Users className="h-4 w-4" />
                    Faça Parte
                  </a>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.3}>
                <div className="mt-8 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-foreground">GO</p>
                    <p className="text-xs text-primary-foreground/70">Estado</p>
                  </div>
                  <div className="h-10 w-px bg-primary-foreground/20" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-foreground">2026</p>
                    <p className="text-xs text-primary-foreground/70">Eleições</p>
                  </div>
                  <Link
                    to="/sobre"
                    className="flex flex-col items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30">
                      <User className="h-5 w-5" />
                    </div>
                    <p className="text-xs">Sobre Mim</p>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.2} direction="right">
              <div className="flex justify-center md:justify-end">
                <div className="relative">
                  <div className="h-72 w-72 md:h-96 md:w-96 rounded-full border-4 border-primary overflow-hidden shadow-2xl">
                    <img
                      src={PHOTO_URL}
                      alt="Dra. Fernanda Sarelli"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
        <WaveDivider />
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">🏛️ Compromissos Institucionais</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Nossas Bandeiras</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Pilares fundamentais que guiam nossa atuação por um Goiás mais justo e inclusivo
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bandeiras.map((b, i) => (
              <ScrollReveal key={b.title} delay={i * 0.1}>
                <div className="rounded-2xl border bg-card p-6 h-full transition-shadow hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-4">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Próximos Eventos</h2>
              <p className="mt-3 text-muted-foreground">Acompanhe a agenda de atividades</p>
            </div>
          </ScrollReveal>

          {eventosLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando eventos...</span>
            </div>
          ) : proximosEventos.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum evento próximo no momento.</p>
          ) : (
            <div className="mt-10 space-y-4 max-w-3xl mx-auto">
              {proximosEventos.map((e, i) => (
                <ScrollReveal key={e.id} delay={i * 0.1}>
                  <div className="flex gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-primary text-primary-foreground">
                      <span className="text-xl font-bold leading-none">{e.dia}</span>
                      <span className="text-xs font-semibold uppercase">{e.mes}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{e.titulo}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.hora}{e.horaFim && e.horaFim !== e.hora && ` – ${e.horaFim}`}</span>
                        {e.local && (
                          <a href={e.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MapPin className="h-3.5 w-3.5" />{e.local}
                          </a>
                        )}
                      </div>
                      {e.desc && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{e.desc}</p>}
                      <a
                        href={e.gcal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Adicionar à minha agenda
                      </a>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/agenda"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Ver agenda completa
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">📸 Registro das atividades</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Galeria de Fotos</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Acompanhe os eventos, ações sociais e encontros comunitários
              </p>
            </div>
          </ScrollReveal>

          {galeriaFotos.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
              {galeriaFotos.slice(0, 6).map((foto, i) => (
                <ScrollReveal key={foto.id} delay={i * 0.08}>
                  <Link
                    to="/galeria"
                    className="group block overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={foto.url_foto}
                        alt={foto.legenda || foto.titulo}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="mt-10 text-center py-10">
              <p className="text-muted-foreground">Em breve novas fotos serão publicadas aqui.</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/galeria"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Ver mais
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Redes Sociais</h2>
              <p className="mt-3 text-muted-foreground">Acompanhe nas redes oficiais</p>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {redes.map((r, i) => (
              <ScrollReveal key={r.label} delay={i * 0.1}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center transition-shadow hover:shadow-lg group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <r.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="font-semibold">{r.label}</h3>
                  <p className="text-sm text-primary">{r.handle}</p>
                </a>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/redes-sociais"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Ver todas as redes
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 md:py-20">
        <div className="container text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Fale Conosco</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Quer saber mais sobre nossas propostas ou fazer parte da nossa equipe? Entre em contato.
            </p>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2"><Mail className="h-4 w-4 text-primary" />contato@fernandasarelli.com.br</p>
              <p className="flex items-center justify-center gap-2"><MapPinIcon className="h-4 w-4 text-primary" />Goiânia — GO</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="https://w.app/drafernandasarelli"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                Enviar Mensagem
              </a>
              <Link
                to="/integracao"
                className="inline-flex items-center gap-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Integração
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <a
              href="https://w.app/drafernandasarelli"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-primary p-5 text-primary-foreground transition-transform hover:scale-105"
            >
              <MessageCircle className="h-8 w-8 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm">Receba as informações direto em seu celular</p>
                <p className="text-lg font-bold">(62) 98133-6168</p>
              </div>
            </a>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
