import Layout from "@/components/Layout";
import ScrollReveal from "@/components/ScrollReveal";
import PageHeader from "@/components/PageHeader";

const Integracao = () => (
  <Layout>
    <PageHeader
      title="Integração"
      titleAccent=""
      subtitle="Página de integração da Dra. Fernanda Sarelli"
    />

    <section className="py-16 md:py-20">
      <div className="container max-w-2xl text-center">
        <ScrollReveal>
          <p className="text-muted-foreground">
            Em breve, mais informações sobre integrações e parcerias.
          </p>
        </ScrollReveal>
      </div>
    </section>
  </Layout>
);

export default Integracao;
