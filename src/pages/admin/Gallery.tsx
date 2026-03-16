import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Upload, FolderPlus, Sparkles, Eraser, Pin, Pencil, ArrowLeft, ArrowRight, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Album {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number | null;
}

interface Foto {
  id: string;
  titulo: string;
  legenda: string | null;
  url_foto: string;
  album_id: string | null;
  visivel: boolean;
  ordem: number;
  destaque_home: boolean;
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
  const [editAlbumId, setEditAlbumId] = useState<string | null>(null);
  const [editAlbumName, setEditAlbumName] = useState("");
  const [editAlbumOpen, setEditAlbumOpen] = useState(false);

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
    setFotos((fotoData as unknown as Foto[]) || []);
    setGaleriaAtiva((configData as { valor?: string } | null)?.valor === "true");
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteAlbum = async (albumId: string) => {
    // Move photos to "sem álbum" before deleting
    await supabase.from("galeria_fotos").update({ album_id: null } as any).eq("album_id", albumId);
    const { error } = await supabase.from("albuns" as any).delete().eq("id", albumId);
    if (error) {
      toast.error("Não foi possível excluir o álbum.");
      return;
    }
    if (selectedAlbum === albumId) setSelectedAlbum(null);
    toast.success("Álbum excluído");
    await loadData();
  };

  const updateAlbum = async () => {
    if (!editAlbumId || !editAlbumName.trim()) return;
    const { error } = await supabase.from("albuns" as any).update({ nome: editAlbumName.trim() } as any).eq("id", editAlbumId);
    if (error) {
      toast.error("Não foi possível renomear o álbum.");
      return;
    }
    setEditAlbumOpen(false);
    setEditAlbumId(null);
    setEditAlbumName("");
    toast.success("Álbum renomeado");
    await loadData();
  };

  const moveAlbum = async (albumId: string, direction: "left" | "right") => {
    const idx = albuns.findIndex((a) => a.id === albumId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= albuns.length) return;

    const updates = [
      supabase.from("albuns" as any).update({ ordem: swapIdx } as any).eq("id", albuns[idx].id),
      supabase.from("albuns" as any).update({ ordem: idx } as any).eq("id", albuns[swapIdx].id),
    ];
    await Promise.all(updates);
    await loadData();
  };

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

  const toggleDestaqueHome = async (id: string, atual: boolean) => {
    const { error } = await (supabase.from("galeria_fotos").update({ destaque_home: !atual } as any) as any).eq("id", id);

    if (error) {
      toast.error("Não foi possível atualizar o destaque.");
      return;
    }

    toast.success(!atual ? "Fixada no feed da home" : "Removida do feed da home");
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
      <div className="space-y-4 px-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-bold">Galeria</h2>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
            <span className={`text-xs font-medium ${galeriaAtiva ? "text-primary" : "text-muted-foreground"}`}>
              {galeriaAtiva ? "Ativa" : "Off"}
            </span>
            <Switch id="galeria-toggle" checked={galeriaAtiva} onCheckedChange={toggleGaleria} />
          </div>
        </div>

        {/* Álbuns - horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setSelectedAlbum(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              !selectedAlbum ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
            }`}
          >
            Todas
          </button>
          {albuns.map((album, idx) => {
            const count = fotos.filter((f) => f.album_id === album.id).length;
            const isSelected = selectedAlbum === album.id;
            return (
              <div key={album.id} className="shrink-0 flex items-center gap-0.5">
                {isSelected && idx > 0 && (
                  <button onClick={() => moveAlbum(album.id, "left")} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent" title="Mover para esquerda">
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlbum(album.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1 ${
                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
                  }`}
                >
                  {album.nome}
                  <span className={`text-[10px] rounded-full px-1 py-0.5 ${
                    isSelected ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>{count}</span>
                </button>
                {isSelected && (
                  <>
                    {idx < albuns.length - 1 && (
                      <button onClick={() => moveAlbum(album.id, "right")} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent" title="Mover para direita">
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditAlbumId(album.id); setEditAlbumName(album.nome); setEditAlbumOpen(true); }}
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent"
                      title="Editar álbum"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Excluir álbum">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir álbum "{album.nome}"?</AlertDialogTitle>
                          <AlertDialogDescription>As fotos do álbum serão mantidas sem categoria. Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteAlbum(album.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            );
          })}
          <Dialog open={newAlbumOpen} onOpenChange={setNewAlbumOpen}>
            <DialogTrigger asChild>
              <button className="shrink-0 rounded-full h-8 w-8 flex items-center justify-center border border-dashed border-primary text-primary hover:bg-accent transition-colors" title="Novo Álbum">
                <FolderPlus className="h-3.5 w-3.5" />
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

        {/* Dialog editar álbum */}
        <Dialog open={editAlbumOpen} onOpenChange={setEditAlbumOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Álbum</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do álbum" value={editAlbumName} onChange={(e) => setEditAlbumName(e.target.value)} />
              <Button onClick={updateAlbum} className="rounded-full w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full text-xs h-8"><Plus className="mr-1 h-3 w-3" />URL</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Foto por URL</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="URL da foto" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Input placeholder="Título" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                <Input placeholder="Legenda (opcional)" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} />
                <Button onClick={addPhoto} className="rounded-full w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" className="rounded-full text-xs h-8" onClick={populateTestPhotos}>
            <Sparkles className="mr-1 h-3 w-3" />Teste
          </Button>

          {hasTestPhotos && (
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8" onClick={() => clearTestPhotos()}>
              <Eraser className="mr-1 h-3 w-3" />Limpar
            </Button>
          )}
        </div>

        {/* Upload area - compacta no mobile */}
        <input
          type="file"
          id="file-upload-input"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            let successCount = 0;
            for (const file of files) {
              if (!file.type.startsWith("image/")) continue;
              const sanitizedName = file.name.replace(/\s+/g, "-").toLowerCase();
              const path = `galeria/${Date.now()}_${sanitizedName}`;
              const { error: uploadError } = await supabase.storage.from("galeria").upload(path, file);
              if (uploadError) { toast.error(`Erro no upload de ${file.name}`); continue; }
              const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path);
              const { error: insertError } = await supabase.from("galeria_fotos").insert({
                titulo: file.name.replace(/\.[^/.]+$/, ""),
                url_foto: urlData.publicUrl,
                album_id: selectedAlbum,
                visivel: true,
              } as any);
              if (insertError) { toast.error(`Erro ao salvar ${file.name}`); continue; }
              successCount += 1;
            }
            if (successCount > 0) { toast.success(`${successCount} imagem(ns) enviada(s)`); await loadData(); }
            e.target.value = "";
          }}
        />
        <div
          onClick={() => document.getElementById("file-upload-input")?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`rounded-2xl border-2 border-dashed p-4 sm:p-8 text-center transition-colors cursor-pointer hover:border-primary hover:bg-accent/50 ${
            dragOver ? "border-primary bg-accent" : "border-border"
          }`}
        >
          <Upload className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs sm:text-sm text-muted-foreground">Toque para enviar fotos</p>
        </div>

        {/* Photo grid - mobile-first com botões sempre visíveis */}
        <div className="grid grid-cols-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-2 sm:gap-4">
          {filteredFotos.map((foto) => (
            <div key={foto.id} className="rounded-xl border bg-card overflow-hidden relative">
              <img src={foto.url_foto} alt={foto.titulo} className="w-full aspect-square object-cover" loading="lazy" />
              
              {/* Info bar - sempre visível */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{foto.titulo}</p>
                {foto.legenda && <p className="text-[10px] text-muted-foreground truncate">{foto.legenda}</p>}
              </div>

              {/* Action buttons - sempre visíveis no mobile, hover no desktop */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleDestaqueHome(foto.id, !!foto.destaque_home)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-colors ${
                    foto.destaque_home ? "bg-primary text-primary-foreground" : "bg-card/90 backdrop-blur-sm hover:bg-accent"
                  }`}
                  aria-label={foto.destaque_home ? "Remover do feed" : "Fixar no feed"}
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  onClick={() => togglePhotoVisibility(foto.id, foto.visivel)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-sm hover:bg-accent transition-colors"
                  aria-label={foto.visivel ? "Ocultar" : "Mostrar"}
                >
                  {foto.visivel ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => deletePhoto(foto.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredFotos.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma foto neste álbum.</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Gallery;
