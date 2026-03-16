import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, FolderPlus, Sparkles, Eraser,
  Pin, Pencil, ArrowLeft, ArrowRight, Check, X, FolderOpen, ImagePlus,
  Move, ChevronDown, Camera, Images
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingPhoto, setEditingPhoto] = useState<Foto | null>(null);
  const [editPhotoTitle, setEditPhotoTitle] = useState("");
  const [editPhotoCaption, setEditPhotoCaption] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // === Album actions ===
  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;
    const { error } = await supabase.from("albuns" as any).insert({ nome: newAlbumName.trim() } as any);
    if (error) { toast.error("Não foi possível criar a pasta."); return; }
    setNewAlbumName("");
    setNewAlbumOpen(false);
    toast.success("📁 Pasta criada!");
    await loadData();
  };

  const deleteAlbum = async (albumId: string) => {
    await supabase.from("galeria_fotos").update({ album_id: null } as any).eq("album_id", albumId);
    const { error } = await supabase.from("albuns" as any).delete().eq("id", albumId);
    if (error) { toast.error("Não foi possível excluir a pasta."); return; }
    if (selectedAlbum === albumId) setSelectedAlbum(null);
    toast.success("Pasta excluída");
    await loadData();
  };

  const updateAlbum = async () => {
    if (!editAlbumId || !editAlbumName.trim()) return;
    const { error } = await supabase.from("albuns" as any).update({ nome: editAlbumName.trim() } as any).eq("id", editAlbumId);
    if (error) { toast.error("Não foi possível renomear."); return; }
    setEditAlbumOpen(false);
    setEditAlbumId(null);
    setEditAlbumName("");
    toast.success("Pasta renomeada");
    await loadData();
  };

  const moveAlbum = async (albumId: string, direction: "left" | "right") => {
    const idx = albuns.findIndex((a) => a.id === albumId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= albuns.length) return;
    await Promise.all([
      supabase.from("albuns" as any).update({ ordem: swapIdx } as any).eq("id", albuns[idx].id),
      supabase.from("albuns" as any).update({ ordem: idx } as any).eq("id", albuns[swapIdx].id),
    ]);
    await loadData();
  };

  // === Photo actions ===
  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from("galeria_fotos").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover."); return; }
    toast.success("Foto removida");
    await loadData();
  };

  const togglePhotoVisibility = async (id: string, visivel: boolean) => {
    const { error } = await supabase.from("galeria_fotos").update({ visivel: !visivel }).eq("id", id);
    if (error) { toast.error("Erro ao alterar visibilidade."); return; }
    toast.success(!visivel ? "Foto visível no site" : "Foto oculta do site");
    await loadData();
  };

  const toggleDestaqueHome = async (id: string, atual: boolean) => {
    const { error } = await (supabase.from("galeria_fotos").update({ destaque_home: !atual } as any) as any).eq("id", id);
    if (error) { toast.error("Erro ao alterar destaque."); return; }
    toast.success(!atual ? "📌 Fixada na página inicial" : "Removida da página inicial");
    await loadData();
  };

  const movePhotoToAlbum = async (photoId: string, albumId: string | null) => {
    const { error } = await supabase.from("galeria_fotos").update({ album_id: albumId } as any).eq("id", photoId);
    if (error) { toast.error("Erro ao mover foto."); return; }
    const albumName = albumId ? albuns.find(a => a.id === albumId)?.nome : "Sem pasta";
    toast.success(`Foto movida para "${albumName}"`);
    await loadData();
  };

  const updatePhoto = async () => {
    if (!editingPhoto) return;
    const { error } = await supabase.from("galeria_fotos")
      .update({ titulo: editPhotoTitle.trim(), legenda: editPhotoCaption.trim() || null } as any)
      .eq("id", editingPhoto.id);
    if (error) { toast.error("Erro ao salvar."); return; }
    setEditingPhoto(null);
    toast.success("Foto atualizada!");
    await loadData();
  };

  // === Bulk actions ===
  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkMoveToAlbum = async (albumId: string | null) => {
    const ids = Array.from(selectedPhotos);
    for (const id of ids) {
      await supabase.from("galeria_fotos").update({ album_id: albumId } as any).eq("id", id);
    }
    const albumName = albumId ? albuns.find(a => a.id === albumId)?.nome : "Sem pasta";
    toast.success(`${ids.length} foto(s) movida(s) para "${albumName}"`);
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    await loadData();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedPhotos);
    for (const id of ids) {
      await supabase.from("galeria_fotos").delete().eq("id", id);
    }
    toast.success(`${ids.length} foto(s) removida(s)`);
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    await loadData();
  };

  const bulkToggleVisibility = async (makeVisible: boolean) => {
    const ids = Array.from(selectedPhotos);
    for (const id of ids) {
      await supabase.from("galeria_fotos").update({ visivel: makeVisible }).eq("id", id);
    }
    toast.success(`${ids.length} foto(s) ${makeVisible ? "visíveis" : "ocultas"}`);
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    await loadData();
  };

  // === Upload ===
  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Nenhuma imagem encontrada. Selecione fotos (JPG, PNG, etc.)");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setUploadProgress(Math.round(((i) / imageFiles.length) * 100));

      const sanitizedName = file.name.replace(/\s+/g, "-").toLowerCase();
      const path = `galeria/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("galeria").upload(path, file);

      if (uploadError) {
        toast.error(`Erro ao enviar "${file.name}"`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path);
      const { error: insertError } = await supabase.from("galeria_fotos").insert({
        titulo: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        url_foto: urlData.publicUrl,
        album_id: selectedAlbum,
        visivel: true,
      } as any);

      if (insertError) {
        toast.error(`Erro ao salvar "${file.name}"`);
        continue;
      }
      successCount += 1;
    }

    setUploadProgress(100);
    setUploading(false);

    if (successCount > 0) {
      toast.success(`✅ ${successCount} foto(s) enviada(s) com sucesso!`);
      await loadData();
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await uploadFiles(Array.from(e.dataTransfer.files));
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
    if (error) { toast.error("Não foi possível adicionar."); return; }
    setUploadUrl(""); setUploadTitle(""); setUploadCaption("");
    setUploadOpen(false);
    toast.success("Foto adicionada!");
    await loadData();
  };

  // === Test data ===
  const ensureTestAlbums = async () => {
    const { data: existingAlbums, error: existingError } = await supabase
      .from("albuns" as any).select("id, nome").in("nome", [...TEST_ALBUMS]);
    if (existingError) { toast.error("Erro ao preparar álbuns de teste."); return null; }
    const existingNames = new Set(((existingAlbums as unknown as Album[] | null) || []).map(a => a.nome));
    const missing = TEST_ALBUMS.filter(name => !existingNames.has(name)).map((name, i) => ({ nome: name, ordem: i }));
    if (missing.length > 0) {
      const { error } = await supabase.from("albuns" as any).insert(missing as any);
      if (error) { toast.error("Erro ao criar álbuns de teste."); return null; }
    }
    const { data, error } = await supabase.from("albuns" as any).select("id, nome").in("nome", [...TEST_ALBUMS]).order("ordem");
    if (error) return null;
    return (data as unknown as Album[]) || [];
  };

  const clearTestPhotos = async (silent = false) => {
    const { error } = await supabase.from("galeria_fotos").delete().in("url_foto", TEST_IMAGE_URLS);
    if (error) { if (!silent) toast.error("Erro ao limpar teste."); return false; }
    if (!silent) toast.success("Fotos de teste removidas");
    await loadData();
    return true;
  };

  const populateTestPhotos = async () => {
    const testAlbums = await ensureTestAlbums();
    if (!testAlbums || testAlbums.length === 0) return;
    const cleared = await clearTestPhotos(true);
    if (!cleared) return;
    const albumMap = new Map(testAlbums.map(a => [a.nome, a.id]));
    const payload = TEST_PHOTOS.map((photo, i) => ({
      titulo: `Foto de teste ${i + 1}`,
      legenda: photo.legenda,
      url_foto: photo.url,
      album_id: albumMap.get(TEST_ALBUMS[i % TEST_ALBUMS.length]) || null,
      visivel: true,
      ordem: i,
    }));
    const { error } = await supabase.from("galeria_fotos").insert(payload as any);
    if (error) { toast.error("Erro ao criar fotos de teste."); return; }
    toast.success("Fotos de teste adicionadas!");
    await loadData();
  };

  const toggleGaleria = async () => {
    const newVal = !galeriaAtiva;
    const { error } = await supabase
      .from("configuracoes" as any)
      .update({ valor: newVal ? "true" : "false" } as any)
      .eq("chave", "galeria_ativa");
    if (error) { toast.error("Erro ao atualizar."); return; }
    setGaleriaAtiva(newVal);
    toast.success(newVal ? "Galeria ativada no site" : "Galeria desativada no site");
  };

  const filteredFotos = selectedAlbum ? fotos.filter(f => f.album_id === selectedAlbum) : fotos;
  const hasTestPhotos = fotos.some(f => TEST_IMAGE_URLS.includes(f.url_foto));
  const selectedAlbumName = selectedAlbum ? albuns.find(a => a.id === selectedAlbum)?.nome : null;

  return (
    <AdminLayout>
      <div className="space-y-5 pb-8">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Images className="h-6 w-6 text-primary" />
              Galeria de Fotos
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {fotos.length} foto(s) · {albuns.length} pasta(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {galeriaAtiva ? "Visível no site" : "Oculta do site"}
            </span>
            <Switch checked={galeriaAtiva} onCheckedChange={toggleGaleria} />
          </div>
        </div>

        {/* ===== UPLOAD AREA - big and obvious ===== */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            await uploadFiles(Array.from(e.target.files || []));
            if (e.target) e.target.value = "";
          }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all cursor-pointer
            ${dragOver
              ? "border-primary bg-accent scale-[1.01]"
              : "border-muted-foreground/30 hover:border-primary hover:bg-accent/30"
            }
            ${uploading ? "pointer-events-none opacity-70" : ""}
          `}
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="h-2 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Enviando fotos... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-3">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-primary" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-semibold">
                Toque aqui para enviar fotos
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou arraste as imagens para cá
              </p>
              {selectedAlbumName && (
                <Badge variant="secondary" className="mt-3">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Serão salvas em: {selectedAlbumName}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* ===== SECONDARY ACTIONS ===== */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add by URL */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full text-xs h-9 gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" />
                Adicionar por link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar foto por link</DialogTitle>
                <DialogDescription>Cole o endereço de uma foto da internet</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="https://exemplo.com/foto.jpg" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Input placeholder="Nome da foto" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                <Input placeholder="Descrição (opcional)" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={addPhoto} className="rounded-full w-full">Adicionar foto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Select mode */}
          <Button
            size="sm"
            variant={selectionMode ? "default" : "outline"}
            className="rounded-full text-xs h-9 gap-1.5"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedPhotos(new Set());
            }}
          >
            <Check className="h-3.5 w-3.5" />
            {selectionMode ? `${selectedPhotos.size} selecionada(s)` : "Selecionar várias"}
          </Button>

          {/* Test buttons */}
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="ghost" className="rounded-full text-xs h-9 gap-1 text-muted-foreground" onClick={populateTestPhotos}>
              <Sparkles className="h-3 w-3" />Teste
            </Button>
            {hasTestPhotos && (
              <Button size="sm" variant="ghost" className="rounded-full text-xs h-9 gap-1 text-muted-foreground" onClick={() => clearTestPhotos()}>
                <Eraser className="h-3 w-3" />Limpar
              </Button>
            )}
          </div>
        </div>

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectionMode && selectedPhotos.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
            <span className="text-sm font-medium text-primary">{selectedPhotos.size} selecionada(s)</span>
            <div className="flex-1" />

            {/* Move to album */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full text-xs h-8 gap-1">
                  <Move className="h-3 w-3" /> Mover para
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-xs">Mover para pasta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => bulkMoveToAlbum(null)}>
                  📂 Sem pasta
                </DropdownMenuItem>
                {albuns.map(a => (
                  <DropdownMenuItem key={a.id} onClick={() => bulkMoveToAlbum(a.id)}>
                    📁 {a.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 gap-1" onClick={() => bulkToggleVisibility(true)}>
              <Eye className="h-3 w-3" /> Mostrar
            </Button>
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 gap-1" onClick={() => bulkToggleVisibility(false)}>
              <EyeOff className="h-3 w-3" /> Ocultar
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="rounded-full text-xs h-8 gap-1">
                  <Trash2 className="h-3 w-3" /> Apagar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar {selectedPhotos.size} foto(s)?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete}>Apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" variant="ghost" className="rounded-full text-xs h-8" onClick={() => { setSelectedPhotos(new Set()); setSelectionMode(false); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* ===== PASTAS (ALBUMS) ===== */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pastas</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedAlbum(null)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all flex items-center gap-2 ${
                !selectedAlbum
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border hover:bg-accent hover:border-primary/30"
              }`}
            >
              <Images className="h-4 w-4" />
              Todas
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${!selectedAlbum ? "bg-primary-foreground/20" : "bg-muted"}`}>
                {fotos.length}
              </span>
            </button>

            {albuns.map((album, idx) => {
              const count = fotos.filter(f => f.album_id === album.id).length;
              const isSelected = selectedAlbum === album.id;
              return (
                <div key={album.id} className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => setSelectedAlbum(album.id)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card border-border hover:bg-accent hover:border-primary/30"
                    }`}
                  >
                    📁 {album.nome}
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${isSelected ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {count}
                    </span>
                  </button>

                  {isSelected && (
                    <div className="flex items-center gap-0.5 ml-1">
                      {idx > 0 && (
                        <button onClick={() => moveAlbum(album.id, "left")} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent border" title="Mover para esquerda">
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {idx < albuns.length - 1 && (
                        <button onClick={() => moveAlbum(album.id, "right")} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent border" title="Mover para direita">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditAlbumId(album.id); setEditAlbumName(album.nome); setEditAlbumOpen(true); }}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent border"
                        title="Renomear pasta"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive hover:text-destructive-foreground border transition-colors" title="Excluir pasta">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir pasta "{album.nome}"?</AlertDialogTitle>
                            <AlertDialogDescription>As fotos serão mantidas, apenas a pasta será removida.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAlbum(album.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}

            {/* New album button */}
            <Dialog open={newAlbumOpen} onOpenChange={setNewAlbumOpen}>
              <DialogTrigger asChild>
                <button className="shrink-0 rounded-xl h-10 px-4 flex items-center gap-2 border-2 border-dashed border-primary/50 text-primary hover:bg-accent transition-all text-sm font-medium">
                  <FolderPlus className="h-4 w-4" />
                  Nova pasta
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar nova pasta</DialogTitle>
                  <DialogDescription>Dê um nome para organizar suas fotos</DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Ex: Eventos de Março"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createAlbum()}
                />
                <DialogFooter>
                  <Button onClick={createAlbum} className="rounded-full w-full">Criar pasta</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dialog editar álbum */}
        <Dialog open={editAlbumOpen} onOpenChange={setEditAlbumOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renomear pasta</DialogTitle>
            </DialogHeader>
            <Input
              value={editAlbumName}
              onChange={(e) => setEditAlbumName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateAlbum()}
            />
            <DialogFooter>
              <Button onClick={updateAlbum} className="rounded-full w-full">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog editar foto */}
        <Dialog open={!!editingPhoto} onOpenChange={(open) => { if (!open) setEditingPhoto(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar foto</DialogTitle>
            </DialogHeader>
            {editingPhoto && (
              <div className="space-y-4">
                <img
                  src={editingPhoto.url_foto}
                  alt={editingPhoto.titulo}
                  className="w-full aspect-video object-cover rounded-xl"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da foto</label>
                  <Input value={editPhotoTitle} onChange={(e) => setEditPhotoTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={editPhotoCaption} onChange={(e) => setEditPhotoCaption(e.target.value)} placeholder="Opcional" rows={2} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={updatePhoto} className="rounded-full w-full">Salvar alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== PHOTO GRID ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredFotos.map((foto) => {
            const isSelected = selectedPhotos.has(foto.id);
            return (
              <div
                key={foto.id}
                className={`group rounded-xl border-2 bg-card overflow-hidden relative transition-all ${
                  selectionMode ? "cursor-pointer" : ""
                } ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"}`}
                onClick={() => selectionMode && toggleSelectPhoto(foto.id)}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <div className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-card/90 backdrop-blur-sm border-muted-foreground/30"
                  }`}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                )}

                {/* Status badges */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  {foto.destaque_home && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Pin className="h-2.5 w-2.5" /> Home
                    </span>
                  )}
                  {!foto.visivel && (
                    <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <EyeOff className="h-2.5 w-2.5" /> Oculta
                    </span>
                  )}
                </div>

                {/* Image */}
                <img
                  src={foto.url_foto}
                  alt={foto.titulo}
                  className={`w-full aspect-square object-cover transition-opacity ${!foto.visivel ? "opacity-50" : ""}`}
                  loading="lazy"
                />

                {/* Info + actions */}
                <div className="p-2.5 space-y-2">
                  <div>
                    <p className="text-xs font-semibold truncate">{foto.titulo}</p>
                    {foto.legenda && <p className="text-[11px] text-muted-foreground truncate">{foto.legenda}</p>}
                  </div>

                  {/* Action buttons - always visible */}
                  {!selectionMode && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Edit */}
                      <button
                        onClick={() => { setEditingPhoto(foto); setEditPhotoTitle(foto.titulo); setEditPhotoCaption(foto.legenda || ""); }}
                        className="flex h-8 items-center gap-1 px-2 rounded-lg text-[11px] font-medium bg-accent hover:bg-accent/80 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>

                      {/* Move to album */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex h-8 items-center gap-1 px-2 rounded-lg text-[11px] font-medium bg-accent hover:bg-accent/80 transition-colors"
                            title="Mover para pasta"
                          >
                            <Move className="h-3 w-3" /> Mover
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel className="text-xs">Mover para</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => movePhotoToAlbum(foto.id, null)} disabled={!foto.album_id}>
                            📂 Sem pasta
                          </DropdownMenuItem>
                          {albuns.map(a => (
                            <DropdownMenuItem
                              key={a.id}
                              onClick={() => movePhotoToAlbum(foto.id, a.id)}
                              disabled={foto.album_id === a.id}
                            >
                              📁 {a.nome}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Toggle visibility */}
                      <button
                        onClick={() => togglePhotoVisibility(foto.id, foto.visivel)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          foto.visivel ? "bg-accent hover:bg-accent/80" : "bg-muted"
                        }`}
                        title={foto.visivel ? "Ocultar do site" : "Mostrar no site"}
                      >
                        {foto.visivel ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>

                      {/* Pin to home */}
                      <button
                        onClick={() => toggleDestaqueHome(foto.id, !!foto.destaque_home)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          foto.destaque_home ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                        }`}
                        title={foto.destaque_home ? "Remover da home" : "Fixar na home"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto"
                            title="Apagar foto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar esta foto?</AlertDialogTitle>
                            <AlertDialogDescription>"{foto.titulo}" será removida permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePhoto(foto.id)}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredFotos.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {selectedAlbum ? "Nenhuma foto nesta pasta" : "Nenhuma foto na galeria"}
            </p>
            <p className="text-sm text-muted-foreground">
              Toque no botão acima para enviar suas primeiras fotos
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Gallery;
