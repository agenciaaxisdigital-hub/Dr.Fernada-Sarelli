import { Instagram, Facebook, Youtube, Twitter } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";

const redes = [
  { icon: Instagram, label: "Instagram", url: "https://instagram.com/", color: "hover:text-pink-500", user: "@fernandasarelli" },
  { icon: Facebook, label: "Facebook", url: "https://facebook.com/", color: "hover:text-blue-600", user: "Fernanda Sarelli" },
  { icon: Youtube, label: "YouTube", url: "https://youtube.com/", color: "hover:text-red-600", user: "Chama Doutora" },
  { icon: Twitter, label: "X (Twitter)", url: "https://twitter.com/", color: "hover:text-foreground", user: "@fernandasarelli" },
];

const RedesSociais = () => (
  <Layout>
    <section className="py-20">
      <div className="container max-w-2xl">
        <ScrollReveal>
          <p className="ui-caps text-sm text-primary mb-2">Redes Sociais</p>
          <h1>Nos acompanhe</h1>
          <p className="mt-4 text-muted-foreground text-pretty">
            Siga Fernanda Sarelli nas redes sociais e fique por dentro de tudo.
          </p>
        </ScrollReveal>

        <div className="mt-12 space-y-4">
          {redes.map((r, i) => (
            <ScrollReveal key={r.label} delay={i * 0.1}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-soft hover:border-primary/30 group ${r.color}`}
              >
                <r.icon className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-inherit" />
                <div>
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-sm text-muted-foreground">{r.user}</p>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default RedesSociais;
