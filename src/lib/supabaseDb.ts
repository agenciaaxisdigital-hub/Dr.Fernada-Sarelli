/**
 * Re-export supabase client with relaxed typing for tables
 * that exist in the external Supabase project but aren't
 * reflected in the auto-generated types.
 */
import { supabase as _supabase } from "@/integrations/supabase/client";

// Cast to any to bypass strict table name checking
// since the external project has tables not in the generated types
export const supabase = _supabase as any;
