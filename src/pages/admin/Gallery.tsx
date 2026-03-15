import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Upload, FolderPlus, Sparkles, Eraser, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Album {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Foto {
  id: string;
  titulo: string;
  legenda: string | null;
  url_foto: string;
  album_id: string | null;
  visivel: boolean;
  ordem: number;
}

const TEST_ALBUMS = ["Eventos Comunitários", "Ações Sociais", "Campanha"] as const;

const TEST_PHOTOS = [
  { url: "/test-gallery/comunidade.svg", legenda: "Imagem de teste para visualizar a composição da galeria." },
  { url: "/test-gallery/agenda.svg", legenda: "Imagem de teste para validar cortes e proporções." },
  { url: "/test-gallery/lideranca.svg", legenda: "Imagem de teste para ocupar o layout do álbum." },
  { url: "/test-gallery/encontro.svg", legenda: "Imagem de teste com composição horizontal." },
  { url: "/test-gallery/campanha.svg", legenda: "Imagem de teste para revisar espaçamento visual." },
  { url: "/test-gallery/territorio.svg", legenda: "Imagem de teste para checar contraste e leitura." },
  { url: "/test-gallery/comunidade.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
  { url: "/test-gallery/agenda.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
  { url: "/test-gallery/lideranca.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
  { url: "/test-gallery/encontro.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
  { url: "/test-gallery/campanha.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
  { url: "/test-gallery/territorio.svg", legenda: "Imagem de teste duplicada de propósito para volume visual." },
] as const;

const TEST_IMAGE_URLS: string[] = [...new Set(TEST_PHOTOS.map((photo) => photo.url))];

const Gallery = () => {
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [galeriaAtiva, setGaleriaAtiva] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: albumData, error: albumError }, { data: fotoData, error: fotoError }, { data: configData, error: configError }] = await Promise.all([
      supabase.from("albuns" as any).select("*").order("ordem"),
      supabase.from("galeria_fotos").select("*").order("ordem"),
      supabase.from("configuracoes" as any).select("*").eq("chave", "galeria_ativa").single(),
    ]);

    if (albumError || fotoError || configError) {
      toast.error("Não foi possível carregar a galeria.");
      return;
    }

    setAlbuns((albumData as unknown as Album[]) || []);
    setFotos((fotoData as Foto[]) || []);
    setGaleriaAtiva((configData as { valor?: string } | null)?.valor === "true");
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ensureTestAlbums = async () => {
    const { data: existingAlbums, error: existingError } = await supabase
      .from("albuns" as any)
      .select("id, nome")
      .in("nome", [...TEST_ALBUMS]);

    if (existingError) {
      toast.error("Não foi possível preparar os álbuns de teste.");
      return null;
    }

    const existingNames = new Set(((existingAlbums as unknown as Album[] | null) || []).map((album) => album.nome));
    const missingAlbums = TEST_ALBUMS.filter((name) => !existingNames.has(name)).map((name, index) => ({ nome: name, ordem: index }));

    if (missingAlbums.length > 0) {
      const { error: insertError } = await supabase.from("albuns" as any).insert(missingAlbums as any);
      if (insertError) {
        toast.error("Não foi possível criar os álbuns de teste.");
        return null;
      }
    }

    const { data: refreshedAlbums, error: refreshedError } = await supabase
      .from("albuns" as any)
      .select("id, nome")
      .in("nome", [...TEST_ALBUMS])
      .order("ordem");

    if (refreshedError) {
      toast.error("Não foi possível carregar os álbuns de teste.");
      return null;
    }

    return (refreshedAlbums as unknown as Album[]) || [];
  };

  const clearTestPhotos = async (silent = false) => {
    const { error } = await supabase.from("galeria_fotos").delete().in("url_foto", TEST_IMAGE_URLS);

    if (error) {
      if (!silent) toast.error("Não foi possível remover as imagens de teste.");
      return false;
    }

    if (!silent) toast.success("Imagens de teste removidas.");
    await loadData();
    return true;
  };

  const toggleGaleria = async () => {
    const newVal = !galeriaAtiva;
    const { error } = await supabase
      .from("configuracoes" as any)
      .update({ valor: newVal ? "true" : "false" } as any)
      .eq("chave", "galeria_ativa");

    if (error) {
      toast.error("Não foi possível atualizar a galeria.");
      return;
    }

    setGaleriaAtiva(newVal);
    toast.success(newVal ? "Galeria ativada" : "Galeria desativada");
  };

  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;

    const { error } = await supabase.from("albuns" as any).insert({ nome: newAlbumName.trim() } as any);

    if (error) {
      toast.error("Não foi possível criar o álbum.");
      return;
    }

    setNewAlbumName("");
    setNewAlbumOpen(false);
    toast.success("Álbum criado");
    await loadData();
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from("galeria_fotos").delete().eq("id", id);

    if (error) {
      toast.error("Não foi possível remover a foto.");
      return;
    }

    toast.success("Foto removida");
    await loadData();
  };

  const togglePhotoVisibility = async (id: string, visivel: boolean) => {
    const { error } = await supabase.from("galeria_fotos").update({ visivel: !visivel }).eq("id", id);

    if (error) {
      toast.error("Não foi possível atualizar a visibilidade.");
      return;
    }

    await loadData();
  };

  const addPhoto = async () => {
    if (!uploadUrl.trim() || !uploadTitle.trim()) return;

    const { error } = await supabase.from("galeria_fotos").insert({
      titulo: uploadTitle.trim(),
      legenda: uploadCaption.trim() || null,
      url_foto: uploadUrl.trim(),
      album_id: selectedAlbum,
      visivel: true,
    } as any);

    if (error) {
      toast.error("Não foi possível adicionar a foto.");
      return;
    }

    setUploadUrl("");
    setUploadTitle("");
    setUploadCaption("");
    setUploadOpen(false);
    toast.success("Foto adicionada");
    await loadData();
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    let successCount = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const sanitizedName = file.name.replace(/\s+/g, "-").toLowerCase();
      const path = `galeria/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("galeria").upload(path, file);

      if (uploadError) {
        toast.error(`Erro no upload de ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path);
      const { error: insertError } = await supabase.from("galeria_fotos").insert({
        titulo: file.name.replace(/\.[^/.]+$/, ""),
        url_foto: urlData.publicUrl,
        album_id: selectedAlbum,
        visivel: true,
      } as any);

      if (insertError) {
        toast.error(`Erro ao salvar ${file.name}`);
        continue;
      }

      successCount += 1;
    }

    if (successCount > 0) {
      toast.success(`${successCount} imagem(ns) enviada(s)`);
      await loadData();
    }
  };

  const populateTestPhotos = async () => {
    const testAlbums = await ensureTestAlbums();
    if (!testAlbums || testAlbums.length === 0) return;

    const cleared = await clearTestPhotos(true);
    if (!cleared) return;

    const albumMap = new Map(testAlbums.map((album) => [album.nome, album.id]));
    const payload = TEST_PHOTOS.map((photo, index) => ({
      titulo: `Foto de teste ${index + 1}`,
      legenda: photo.legenda,
      url_foto: photo.url,
      album_id: albumMap.get(TEST_ALBUMS[index % TEST_ALBUMS.length]) || null,
      visivel: true,
      ordem: index,
    }));

    const { error } = await supabase.from("galeria_fotos").insert(payload as any);

    if (error) {
      toast.error("Não foi possível criar as imagens de teste.");
      return;
    }

    toast.success("Imagens de teste adicionadas.");
    await loadData();
  };

  const filteredFotos = selectedAlbum ? fotos.filter((foto) => foto.album_id === selectedAlbum) : fotos;
  const hasTestPhotos = fotos.some((foto) => TEST_IMAGE_URLS.includes(foto.url_foto));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Galeria</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="galeria-toggle" className="text-sm">Galeria no site</Label>
              <Switch id="galeria-toggle" checked={galeriaAtiva} onCheckedChange={toggleGaleria} className="scale-125" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAlbum(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              !selectedAlbum ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
            }`}
          >
            Todas
          </button>
          {albuns.map((album) => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbum(album.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                selectedAlbum === album.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
              }`}
            >
              {album.nome}
            </button>
          ))}

          <Dialog open={newAlbumOpen} onOpenChange={setNewAlbumOpen}>
            <DialogTrigger asChild>
              <button className="rounded-full px-4 py-2 text-sm font-medium border border-dashed border-primary text-primary hover:bg-accent transition-colors flex items-center gap-1">
                <FolderPlus className="h-4 w-4" /> Novo Álbum
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Álbum</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do álbum" value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} />
                <Button onClick={createAlbum} className="rounded-full w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Foto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Foto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="URL da foto" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Input placeholder="Título" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                <Input placeholder="Legenda (opcional)" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} />
                <Button onClick={addPhoto} className="rounded-full w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="rounded-full" onClick={populateTestPhotos}>
            <Sparkles className="mr-2 h-4 w-4" /> Popular com imagens de teste
          </Button>

          {hasTestPhotos && (
            <Button variant="outline" className="rounded-full" onClick={() => clearTestPhotos()}>
              <Eraser className="mr-2 h-4 w-4" /> Apagar imagens de teste
            </Button>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-accent" : "border-border"
          }`}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Arraste e solte fotos aqui para upload</p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {filteredFotos.map((foto) => (
            <div key={foto.id} className="break-inside-avoid rounded-2xl border bg-card overflow-hidden group relative">
              <img src={foto.url_foto} alt={foto.titulo} className="w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-end opacity-0 group-hover:opacity-100">
                <div className="w-full p-3 bg-gradient-to-t from-foreground/80 to-transparent">
                  <p className="text-sm font-medium text-primary-foreground">{foto.titulo}</p>
                  {foto.legenda && <p className="text-xs text-primary-foreground/80">{foto.legenda}</p>}
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => togglePhotoVisibility(foto.id, foto.visivel)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm hover:bg-accent transition-colors"
                  aria-label={foto.visivel ? "Ocultar foto" : "Mostrar foto"}
                >
                  {foto.visivel ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => deletePhoto(foto.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label="Apagar foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredFotos.length === 0 && (
          <p className="text-center text-muted-foreground py-10">Nenhuma foto neste álbum.</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Gallery;
