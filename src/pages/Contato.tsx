import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";
import Layout from "@/components/Layout";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  telefone: z.string().trim().min(1, "Telefone é obrigatório").max(20),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")).optional(),
  mensagem: z.string().trim().min(1, "Mensagem é obrigatória").max(2000),
});

type FormData = z.infer<typeof schema>;

const Contato = () => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("mensagens_contato").insert({
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || null,
        mensagem: data.mensagem,
      });
      if (error) throw error;
      toast.success("Mensagem enviada com sucesso!");
      reset();
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-lg">
          <ScrollReveal>
            <p className="ui-caps text-sm text-primary mb-2">Contato</p>
            <h1>Fale conosco</h1>
            <p className="mt-4 text-muted-foreground text-pretty">
              Envie sua mensagem e entraremos em contato o mais breve possível.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" {...register("nome")} className="mt-1" />
                {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>}
              </div>
              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input id="telefone" {...register("telefone")} className="mt-1" />
                {errors.telefone && <p className="text-sm text-destructive mt-1">{errors.telefone.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input id="email" type="email" {...register("email")} className="mt-1" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="mensagem">Mensagem *</Label>
                <Textarea id="mensagem" rows={5} {...register("mensagem")} className="mt-1" />
                {errors.mensagem && <p className="text-sm text-destructive mt-1">{errors.mensagem.message}</p>}
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </form>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default Contato;
