import { useEffect, useState } from "react";
import { Key, UserPlus, Trash2, RefreshCw, Database, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Operator {
  id: string;
  user_id: string;
  cargo: string;
  email?: string;
}

const SettingsPage = () => {
  useAdmin(["super_admin"]);
  const [apiToken, setApiToken] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCargo, setNewCargo] = useState<string>("editor");
  const [creating, setCreating] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load API token
    const { data: tokenData } = await supabase.from("configuracoes" as any).select("valor").eq("chave", "api_token").single();
    if (tokenData) setApiToken((tokenData as any).valor || "");

    // Load operators
    const { data: roles } = await supabase.from("roles_usuarios").select("*");
    if (roles) {
      setOperators(roles.map((r: any) => ({ id: r.id, user_id: r.user_id, cargo: r.cargo })));
    }
  };

  const regenerateToken = async () => {
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await supabase.from("configuracoes" as any).update({ valor: newToken } as any).eq("chave", "api_token");
    setApiToken(newToken);
    toast.success("Token regenerado");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const createUser = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      // Create user via Supabase auth (needs service role, we'll use edge function)
      // For now, we create the role entry assuming user already exists in auth
      const { data: { user }, error } = await supabase.auth.admin.createUser({
        email: newEmail,
        password: newPassword,
        email_confirm: true,
      });

      if (error) {
        // If admin API not available, instruct to create user manually
        toast.error("Crie o usuário manualmente no painel Supabase e adicione o role aqui.");
        return;
      }

      if (user) {
        await supabase.from("roles_usuarios").insert({
          user_id: user.id,
          cargo: newCargo as any,
        });
        toast.success("Operador criado");
        setNewEmail("");
        setNewPassword("");
        loadData();
      }
    } catch {
      toast.error("Erro ao criar operador. Crie o usuário no Supabase e adicione o role.");
    } finally {
      setCreating(false);
    }
  };

  const removeOperator = async (id: string) => {
    await supabase.from("roles_usuarios").delete().eq("id", id);
    toast.success("Operador removido");
    loadData();
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-2xl">
        <h2 className="text-2xl font-bold">Configurações</h2>

        {/* API Token */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Token da API</h3>
          </div>
          <div className="flex gap-2">
            <Input value={apiToken} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiToken)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={regenerateToken}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use como Bearer Token no header Authorization das requisições à API.</p>
        </div>

        {/* User Management */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Gerenciar Usuários</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="E-mail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Input placeholder="Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Select value={newCargo} onValueChange={setNewCargo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Operador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createUser} disabled={creating} className="rounded-full">
              <UserPlus className="mr-2 h-4 w-4" /> {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>

          <div className="space-y-2 pt-4 border-t">
            {operators.map((op) => (
              <div key={op.id} className="flex items-center justify-between rounded-xl bg-secondary p-3">
                <div>
                  <p className="text-sm font-medium">{op.user_id.substring(0, 8)}...</p>
                  <p className="text-xs text-muted-foreground capitalize">{op.cargo.replace("_", " ")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeOperator(op.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase Credentials */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Credenciais Supabase</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">URL</Label>
              <div className="flex gap-2 mt-1">
                <Input value={supabaseUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(supabaseUrl)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Anon Key</Label>
              <div className="flex gap-2 mt-1">
                <Input value={supabaseKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(supabaseKey)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
