import { Stethoscope, GraduationCap, Users, Shield, Baby, Landmark, Leaf, BookOpen } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";

const pilares = [
  { icon: Stethoscope, title: "Saúde", desc: "Ampliação do acesso à saúde pública, com foco em atendimento humanizado e eficiente." },
  { icon: GraduationCap, title: "Educação", desc: "Valorização dos profissionais e infraestrutura escolar de qualidade." },
  { icon: Users, title: "Mulheres", desc: "Políticas de proteção, empoderamento e igualdade de gênero." },
  { icon: Shield, title: "Segurança", desc: "Prevenção, iluminação pública e presença policial comunitária." },
  { icon: Baby, title: "Primeira Infância", desc: "Creches, nutrição e desenvolvimento infantil integral." },
  { icon: Landmark, title: "Transparência", desc: "Dados abertos, prestação de contas e participação popular." },
  { icon: Leaf, title: "Meio Ambiente", desc: "Áreas verdes, reciclagem e educação ambiental nas escolas." },
  { icon: BookOpen, title: "Cultura", desc: "Apoio a artistas locais, espaços culturais e eventos comunitários." },
];

const Sobre = () => (
  <Layout>
    <section className="py-20">
      <div className="container">
        <ScrollReveal>
          <p className="ui-caps text-sm text-primary mb-2">Sobre</p>
          <h1>Fernanda Sarelli</h1>
        </ScrollReveal>

        <div className="mt-10 grid md:grid-cols-2 gap-12 items-start">
          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border bg-secondary p-8">
              <p className="text-muted-foreground leading-relaxed text-pretty">
                Fernanda Sarelli é médica, mãe e ativista social. Com mais de 15 anos de atuação na saúde pública, 
                dedica-se a construir pontes entre a sociedade e o poder público, sempre com transparência e empatia.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
                Sua trajetória é marcada pelo compromisso com as causas sociais, especialmente na defesa dos 
                direitos das mulheres, da primeira infância e do acesso universal à saúde e educação de qualidade.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
                "Acredito que a política é, antes de tudo, um ato de cuidado. E cuidar é a minha vocação."
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="rounded-2xl bg-accent/50 border flex items-center justify-center h-80">
              <span className="text-muted-foreground text-sm">Foto de Fernanda Sarelli</span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>

    {/* 8 Pilares */}
    <section className="bg-secondary py-20">
      <div className="container">
        <ScrollReveal>
          <p className="ui-caps text-sm text-primary mb-2">8 Pilares</p>
          <h2>Nossas prioridades</h2>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {pilares.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.1}>
              <div className="rounded-2xl border bg-card p-6 transition-colors hover:border-primary/30 h-full">
                <p.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Sobre;
