export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acessos_site: {
        Row: {
          altura_tela: number | null
          cidade: string | null
          criado_em: string
          dispositivo: string | null
          endereco_ip: string | null
          estado: string | null
          id: string
          largura_tela: number | null
          pagina: string
          pais: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          altura_tela?: number | null
          cidade?: string | null
          criado_em?: string
          dispositivo?: string | null
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          largura_tela?: number | null
          pagina: string
          pais?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          altura_tela?: number | null
          cidade?: string | null
          criado_em?: string
          dispositivo?: string | null
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          largura_tela?: number | null
          pagina?: string
          pais?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cliques_whatsapp: {
        Row: {
          cidade: string | null
          criado_em: string
          endereco_ip: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          pagina_origem: string | null
          pais: string | null
          telefone_destino: string | null
          user_agent: string | null
        }
        Insert: {
          cidade?: string | null
          criado_em?: string
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pagina_origem?: string | null
          pais?: string | null
          telefone_destino?: string | null
          user_agent?: string | null
        }
        Update: {
          cidade?: string | null
          criado_em?: string
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pagina_origem?: string | null
          pais?: string | null
          telefone_destino?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      galeria_fotos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          evento: string | null
          id: string
          legenda: string | null
          ordem: number
          titulo: string
          url_foto: string
          visivel: boolean
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          evento?: string | null
          id?: string
          legenda?: string | null
          ordem?: number
          titulo: string
          url_foto: string
          visivel?: boolean
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          evento?: string | null
          id?: string
          legenda?: string | null
          ordem?: number
          titulo?: string
          url_foto?: string
          visivel?: boolean
        }
        Relationships: []
      }
      mensagens_contato: {
        Row: {
          cidade: string | null
          criado_em: string
          email: string | null
          endereco_ip: string | null
          estado: string | null
          id: string
          latitude: number | null
          lida: boolean
          longitude: number | null
          mensagem: string
          nome: string
          pais: string | null
          telefone: string
          user_agent: string | null
        }
        Insert: {
          cidade?: string | null
          criado_em?: string
          email?: string | null
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          lida?: boolean
          longitude?: number | null
          mensagem: string
          nome: string
          pais?: string | null
          telefone: string
          user_agent?: string | null
        }
        Update: {
          cidade?: string | null
          criado_em?: string
          email?: string | null
          endereco_ip?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          lida?: boolean
          longitude?: number | null
          mensagem?: string
          nome?: string
          pais?: string | null
          telefone?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      roles_usuarios: {
        Row: {
          cargo: Database["public"]["Enums"]["cargo_admin"]
          criado_em: string
          id: string
          user_id: string
        }
        Insert: {
          cargo?: Database["public"]["Enums"]["cargo_admin"]
          criado_em?: string
          id?: string
          user_id: string
        }
        Update: {
          cargo?: Database["public"]["Enums"]["cargo_admin"]
          criado_em?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_primeiro_admin: { Args: { _email: string }; Returns: undefined }
      eh_admin: { Args: { _user_id: string }; Returns: boolean }
      tem_cargo: {
        Args: {
          _cargo: Database["public"]["Enums"]["cargo_admin"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      cargo_admin: "super_admin" | "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cargo_admin: ["super_admin", "admin", "editor"],
    },
  },
} as const
