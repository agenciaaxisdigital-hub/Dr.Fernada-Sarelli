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

interface AdminUser {
  id: string;
  user_id: string;
  username: string;
  cargo: string;
}

const SettingsPage = () => {
  useAdmin(["super_admin"]);
  const [apiToken, setApiToken] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCargo, setNewCargo] = useState<string>("editor");
  const [creating, setCreating] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load API token
    const { data: tokenData } = await supabase.from("configuracoes" as any).select("valor").eq("chave", "api_token").single();
    if (tokenData) setApiToken((tokenData as any).valor || "");

    // Load users via edge function
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (!error && data?.users) setUsers(data.users);
    } catch {
      // Fallback: load from roles table
      const { data: roles } = await supabase.from("roles_usuarios").select("*");
      if (roles) {
        setUsers(roles.map((r: any) => ({ id: r.id, user_id: r.user_id, username: r.user_id.substring(0, 8), cargo: r.cargo })));
      }
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
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    if (newUsername.length < 3) {
      toast.error("Usuário deve ter pelo menos 3 caracteres");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          username: newUsername.trim(),
          password: newPassword,
          cargo: newCargo,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Usuário "${newUsername}" criado com sucesso!`);
      setNewUsername("");
      setNewPassword("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const removeUser = async (userId: string, username: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(`Usuário "${username}" removido`);
      loadData();
    } catch {
      toast.error("Erro ao remover usuário");
    }
  };

  const cargoLabel = (cargo: string) => {
    switch (cargo) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
      case "editor": return "Operador";
      default: return cargo;
    }
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
          {projectId && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Base URL:</span>{" "}
              <code className="bg-secondary px-1 py-0.5 rounded">
                {supabaseUrl}/functions/v1/api-v1/
              </code>
            </div>
          )}
        </div>

        {/* User Management */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Gerenciar Usuários</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Usuário"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="off"
              />
              <Input
                placeholder="Senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
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
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário cadastrado.</p>
            )}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-secondary p-3">
                <div>
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="text-xs text-muted-foreground">{cargoLabel(u.cargo)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeUser(u.user_id, u.username)} className="text-destructive hover:bg-destructive/10">
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
