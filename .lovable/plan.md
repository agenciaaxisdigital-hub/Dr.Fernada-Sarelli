

## Plano: Atualizar a Service Role Key

**Situação atual:** A chave `EXT_SUPABASE_SERVICE_ROLE_KEY` está configurada com uma publishable key, bloqueando todas as operações de escrita (apagar, editar, mover) na galeria.

**Ação necessária:** O usuário precisa colar a service_role key completa (visível no screenshot) para que eu atualize o segredo usando a ferramenta `add_secret`.

**Após a atualização:**
- Deletar fotos/vídeos funcionará
- Editar títulos e legendas funcionará  
- Mover entre álbuns funcionará
- O "Modo Leitura" desaparecerá automaticamente

**Aguardando:** o usuário colar a key completa no chat.

