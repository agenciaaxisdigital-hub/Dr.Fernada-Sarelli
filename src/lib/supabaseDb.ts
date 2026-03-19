import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to access Supabase tables that exist in the external project
 * but aren't reflected in the auto-generated types.
 * Usage: db("table_name").select("*") etc.
 */
export const db = (table: string) => {
  return (supabase as any).from(table);
};

export { supabase };
