import { Link } from "react-router-dom";
import { Heart, Users, BookOpen, Shield, Stethoscope, GraduationCap, Landmark, Baby, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";

const bandeiras = [
  { icon: Stethoscope, title: "Saúde Pública", desc: "Acesso universal e de qualidade para todos." },
  { icon: GraduationCap, title: "Educação", desc: "Investimento em ensino público e inclusivo." },
  { icon: Users, title: "Direitos das Mulheres", desc: "Igualdade, segurança e autonomia feminina." },
  { icon: Shield, title: "Segurança", desc: "Políticas preventivas e proteção comunitária." },
  { icon: Baby, title: "Primeira Infância", desc: "Cuidado e desenvolvimento desde os primeiros anos." },
  { icon: Landmark, title: "Transparência", desc: "Gestão pública aberta e participativa." },
  { icon: Leaf, title: "Meio Ambiente", desc: "Desenvolvimento sustentável e responsável." },
  { icon: BookOpen, title: "Cultura", desc: "Valorização da identidade e diversidade cultural." },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background py-20 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(340_82%_90%/0.5),_transparent_60%)]" />
        <div className="container relative">
          <ScrollReveal>
            <p className="ui-caps text-sm text-primary mb-4">Fernanda Sarelli</p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="max-w-3xl">
              Coragem para cuidar,{" "}
              <span className="text-primary">voz para transformar.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty leading-relaxed">
              Nossa luta é por uma cidade mais justa, humana e transparente. Conheça nossas bandeiras e faça parte dessa transformação.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/contato">Entre em Contato</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link to="/sobre">Conheça a Fernanda</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Bandeiras */}
      <section className="bg-secondary py-20">
        <div className="container">
          <ScrollReveal>
            <p className="ui-caps text-sm text-primary mb-2">Nossas Bandeiras</p>
            <h2>Pelo que lutamos</h2>
          </ScrollReveal>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {bandeiras.map((b, i) => (
              <ScrollReveal key={b.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-accent bg-card p-6 transition-colors hover:border-primary/30">
                  <b.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-base font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <ScrollReveal>
            <Heart className="mx-auto h-10 w-10 text-primary mb-4" />
            <h2>Faça parte dessa história</h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto text-pretty">
              Entre em contato, acompanhe nossa agenda e conecte-se nas redes sociais.
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/contato">Enviar Mensagem</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link to="/agenda">Ver Agenda</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
