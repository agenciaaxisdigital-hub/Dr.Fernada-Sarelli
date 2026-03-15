import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Cargo = "super_admin" | "admin" | "editor";

interface AdminUser {
  id: string;
  username: string;
  cargo: Cargo;
}

export function useAdmin(requiredCargo?: Cargo[]) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: roles } = await supabase
        .from("roles_usuarios")
        .select("cargo")
        .eq("user_id", session.user.id);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      const cargo = roles[0].cargo as Cargo;

      if (requiredCargo && !requiredCargo.includes(cargo)) {
        navigate("/admin/galeria");
        return;
      }

      const username = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "admin";

      setUser({
        id: session.user.id,
        username,
        cargo,
      });
      setLoading(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/admin/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate, requiredCargo]);

  const isAdmin = user?.cargo === "super_admin" || user?.cargo === "admin";
  const isSuperAdmin = user?.cargo === "super_admin";

  return { user, loading, isAdmin, isSuperAdmin };
}
