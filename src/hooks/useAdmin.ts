import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminUser {
  id: string;
  username: string;
}

export function useAdmin() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        navigate("/admin/login");
        return;
      }

      // Use RPC function to check admin status (bypasses RLS)
      const { data: isAdmin, error } = await supabase.rpc("eh_admin", {
        _user_id: session.user.id,
      });

      if (error || !isAdmin) {
        await supabase.auth.signOut();
        setLoading(false);
        navigate("/admin/login");
        return;
      }

      const username = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "admin";

      setUser({
        id: session.user.id,
        username,
      });
      setLoading(false);
    };

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { user, loading };
}
