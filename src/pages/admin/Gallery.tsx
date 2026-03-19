import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, FolderPlus, Sparkles, Eraser,
  Pin, Pencil, ArrowLeft, ArrowRight, Check, X, FolderOpen, ImagePlus,
  Move, ChevronDown, Camera, Images, Video, Play, Crosshair
} from "lucide-react";
import FocalPointPicker, { encodeFocalPoint, decodeFocalPoint, getFocalStyle } from "@/components/admin/FocalPointPicker";
import { supabase } from "@/lib/supabaseDb";
import { galleryAdmin } from "@/lib/galleryAdmin";
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

// Derive tipo from URL since column doesn't exist in DB
const getFotoTipo = (url: string): string => isVideoUrl(url) ? "video" : "foto";

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

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"];
const isVideoFile = (file: File) => file.type.startsWith("video/");
const isVideoUrl = (url: string) => {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.includes(ext));
};

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
  const [editFocalX, setEditFocalX] = useState(50);
  const [editFocalY, setEditFocalY] = useState(50);
  const [editZoom, setEditZoom] = useState(100);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload preview with focal point
  const [pendingUploads, setPendingUploads] = useState<Array<{ file: File; previewUrl: string; focalX: number; focalY: number; zoom: number }>>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showUploadPreview, setShowUploadPreview] = useState(false);

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
    try {
      await galleryAdmin({ action: "create-album", nome: newAlbumName.trim() });
      setNewAlbumName("");
      setNewAlbumOpen(false);
      toast.success("📁 Pasta criada!");
      await loadData();
    } catch { toast.error("Não foi possível criar a pasta."); }
  };

  const deleteAlbum = async (albumId: string) => {
    try {
      await galleryAdmin({ action: "delete-album", id: albumId });
      if (selectedAlbum === albumId) setSelectedAlbum(null);
      toast.success("Pasta excluída");
      await loadData();
    } catch { toast.error("Não foi possível excluir a pasta."); }
  };

  const updateAlbum = async () => {
    if (!editAlbumId || !editAlbumName.trim()) return;
    try {
      await galleryAdmin({ action: "update-album", id: editAlbumId, nome: editAlbumName.trim() });
      setEditAlbumOpen(false);
      setEditAlbumId(null);
      setEditAlbumName("");
      toast.success("Pasta renomeada");
      await loadData();
    } catch { toast.error("Não foi possível renomear."); }
  };

  const moveAlbum = async (albumId: string, direction: "left" | "right") => {
    const idx = albuns.findIndex((a) => a.id === albumId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= albuns.length) return;
    try {
      await galleryAdmin({ action: "reorder-albums", updates: [
        { id: albuns[idx].id, ordem: swapIdx },
        { id: albuns[swapIdx].id, ordem: idx },
      ]});
      await loadData();
    } catch { toast.error("Erro ao reordenar."); }
  };

  // === Photo/Video actions ===
  const deletePhoto = async (id: string) => {
    try {
      await galleryAdmin({ action: "delete-photo", id });
      toast.success("Item removido");
      await loadData();
    } catch { toast.error("Não foi possível remover."); }
  };

  const togglePhotoVisibility = async (id: string, visivel: boolean) => {
    try {
      await galleryAdmin({ action: "update-photo", id, updates: { visivel: !visivel } });
      toast.success(!visivel ? "Visível no site" : "Oculto do site");
      await loadData();
    } catch { toast.error("Erro ao alterar visibilidade."); }
  };

  const toggleDestaqueHome = async (id: string, atual: boolean) => {
    try {
      await galleryAdmin({ action: "update-photo", id, updates: { destaque_home: !atual } });
      toast.success(!atual ? "📌 Fixado na página inicial" : "Removido da página inicial");
      await loadData();
    } catch { toast.error("Erro ao alterar destaque."); }
  };

  const movePhotoToAlbum = async (photoId: string, albumId: string | null) => {
    try {
      await galleryAdmin({ action: "move-photo", id: photoId, album_id: albumId });
      const albumName = albumId ? albuns.find(a => a.id === albumId)?.nome : "Sem pasta";
      toast.success(`Movido para "${albumName}"`);
      await loadData();
    } catch { toast.error("Erro ao mover."); }
  };

  const updatePhoto = async () => {
    if (!editingPhoto) return;
    const legendaWithFp = encodeFocalPoint(editPhotoCaption.trim() || null, editFocalX, editFocalY, editZoom);
    try {
      await galleryAdmin({ action: "update-photo", id: editingPhoto.id, updates: { titulo: editPhotoTitle.trim(), legenda: legendaWithFp || null } });
      setEditingPhoto(null);
      toast.success("Atualizado!");
      await loadData();
    } catch { toast.error("Erro ao salvar."); }
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
    try {
      await galleryAdmin({ action: "bulk-update", ids, updates: { album_id: albumId } });
      const albumName = albumId ? albuns.find(a => a.id === albumId)?.nome : "Sem pasta";
      toast.success(`${ids.length} item(ns) movido(s) para "${albumName}"`);
      setSelectedPhotos(new Set());
      setSelectionMode(false);
      await loadData();
    } catch { toast.error("Erro ao mover itens."); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedPhotos);
    try {
      await galleryAdmin({ action: "bulk-delete", ids });
      toast.success(`${ids.length} item(ns) removido(s)`);
      setSelectedPhotos(new Set());
      setSelectionMode(false);
      await loadData();
    } catch { toast.error("Erro ao remover itens."); }
  };

  const bulkToggleVisibility = async (makeVisible: boolean) => {
    const ids = Array.from(selectedPhotos);
    try {
      await galleryAdmin({ action: "bulk-update", ids, updates: { visivel: makeVisible } });
      toast.success(`${ids.length} item(ns) ${makeVisible ? "visíveis" : "ocultos"}`);
      setSelectedPhotos(new Set());
      setSelectionMode(false);
      await loadData();
    } catch { toast.error("Erro ao alterar visibilidade."); }
  };

  // === Upload (photos + videos) ===
  // Stage files for preview (images get focal point picker, videos upload directly)
  const stageFilesForPreview = (files: File[]) => {
    const mediaFiles = files.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (mediaFiles.length === 0) {
      toast.error("Nenhum arquivo válido. Selecione fotos ou vídeos.");
      return;
    }

    const videoFiles = mediaFiles.filter(f => f.type.startsWith("video/"));
    const imageFiles = mediaFiles.filter(f => f.type.startsWith("image/"));

    // Upload videos directly (no focal point needed)
    if (videoFiles.length > 0) {
      uploadFilesWithFocalPoints(videoFiles.map(f => ({ file: f, focalX: 50, focalY: 50, zoom: 100 })));
    }

    // Show preview for images
    if (imageFiles.length > 0) {
      const previews = imageFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        focalX: 50,
        focalY: 50,
        zoom: 100,
      }));
      setPendingUploads(previews);
      setPreviewIndex(0);
      setShowUploadPreview(true);
    }
  };

  const uploadFilesWithFocalPoints = async (items: Array<{ file: File; focalX: number; focalY: number; zoom: number }>) => {
    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const { file, focalX, focalY, zoom } = items[i];
      setUploadProgress(Math.round(((i) / items.length) * 100));

      const isVideo = isVideoFile(file);
      const sanitizedName = file.name.replace(/\s+/g, "-").toLowerCase();
      const folder = isVideo ? "videos" : "galeria";
      const path = `${folder}/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("galeria").upload(path, file);

      if (uploadError) {
        toast.error(`Erro ao enviar "${file.name}"`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path);
      try {
        const legendaWithFp = encodeFocalPoint(null, focalX, focalY, zoom);
        await galleryAdmin({ action: "insert-photo", photo: {
          titulo: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          url_foto: urlData.publicUrl,
          album_id: selectedAlbum,
          visivel: true,
          legenda: legendaWithFp || null,
        }});
        successCount += 1;
      } catch {
        toast.error(`Erro ao salvar "${file.name}"`);
        continue;
      }
      successCount += 1;
    }

    setUploadProgress(100);
    setUploading(false);

    if (successCount > 0) {
      toast.success(`✅ ${successCount} arquivo(s) enviado(s) com sucesso!`);
      await loadData();
    }
  };

  const confirmUploadPreviews = () => {
    // Clean up preview URLs
    const items = pendingUploads.map(p => ({ file: p.file, focalX: p.focalX, focalY: p.focalY, zoom: p.zoom }));
    pendingUploads.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPendingUploads([]);
    setShowUploadPreview(false);
    uploadFilesWithFocalPoints(items);
  };

  const cancelUploadPreviews = () => {
    pendingUploads.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPendingUploads([]);
    setShowUploadPreview(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    stageFilesForPreview(Array.from(e.dataTransfer.files));
  };

  const addPhoto = async () => {
    if (!uploadUrl.trim() || !uploadTitle.trim()) return;
    const tipo = isVideoUrl(uploadUrl) ? "video" : "foto";
    try {
      await galleryAdmin({ action: "insert-photo", photo: {
        titulo: uploadTitle.trim(),
        legenda: uploadCaption.trim() || null,
        url_foto: uploadUrl.trim(),
        album_id: selectedAlbum,
        visivel: true,
      }});
      setUploadUrl(""); setUploadTitle(""); setUploadCaption("");
      setUploadOpen(false);
      toast.success(`${tipo === "video" ? "Vídeo" : "Foto"} adicionado!`);
      await loadData();
    } catch { toast.error("Não foi possível adicionar."); }
  };

  // === Test data ===
  const ensureTestAlbums = async () => {
    // Read existing albums (reads still use direct client)
    const { data: existingAlbums, error: existingError } = await supabase
      .from("albuns" as any).select("id, nome").in("nome", [...TEST_ALBUMS]);
    if (existingError) { toast.error("Erro ao preparar álbuns de teste."); return null; }
    const existingNames = new Set(((existingAlbums as unknown as Album[] | null) || []).map(a => a.nome));
    const missing = TEST_ALBUMS.filter(name => !existingNames.has(name));
    for (const name of missing) {
      try { await galleryAdmin({ action: "create-album", nome: name }); } catch { /* skip */ }
    }
    const { data, error } = await supabase.from("albuns" as any).select("id, nome").in("nome", [...TEST_ALBUMS]).order("ordem");
    if (error) return null;
    return (data as unknown as Album[]) || [];
  };

  const clearTestPhotos = async (silent = false) => {
    try {
      await galleryAdmin({ action: "delete-test-photos", urls: TEST_IMAGE_URLS });
      if (!silent) toast.success("Fotos de teste removidas");
      await loadData();
      return true;
    } catch {
      if (!silent) toast.error("Erro ao limpar teste.");
      return false;
    }
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
    try {
      await galleryAdmin({ action: "insert-photos", photos: payload });
      toast.success("Fotos de teste adicionadas!");
      await loadData();
    } catch { toast.error("Erro ao criar fotos de teste."); }
  };

  const toggleGaleria = async () => {
    const newVal = !galeriaAtiva;
    try {
      await galleryAdmin({ action: "update-config", chave: "galeria_ativa", valor: newVal ? "true" : "false" });
      setGaleriaAtiva(newVal);
      toast.success(newVal ? "Galeria ativada no site" : "Galeria desativada no site");
    } catch { toast.error("Erro ao atualizar."); }
  };

  const filteredFotos = selectedAlbum ? fotos.filter(f => f.album_id === selectedAlbum) : fotos;
  const hasTestPhotos = fotos.some(f => TEST_IMAGE_URLS.includes(f.url_foto));
  const selectedAlbumName = selectedAlbum ? albuns.find(a => a.id === selectedAlbum)?.nome : null;

  const photoCount = fotos.filter(f => getFotoTipo(f.url_foto) === "foto").length;
  const videoCount = fotos.filter(f => getFotoTipo(f.url_foto) === "video").length;

  return (
    <AdminLayout>
      <div className="space-y-4 pb-4">
        {/* ===== HEADER ===== */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Images className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Galeria</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {photoCount} foto(s) · {videoCount} vídeo(s) · {albuns.length} pasta(s)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground">
              {galeriaAtiva ? "Ativa" : "Oculta"}
            </span>
            <Switch checked={galeriaAtiva} onCheckedChange={toggleGaleria} />
          </div>
        </div>

        {/* ===== UPLOAD AREA ===== */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            stageFilesForPreview(Array.from(e.target.files || []));
            if (e.target) e.target.value = "";
          }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer
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
              <p className="text-sm text-muted-foreground">Enviando arquivos... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-2">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-sm font-semibold">
                Toque para enviar fotos ou vídeos
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JPG, PNG, MP4, WebM
              </p>
              {selectedAlbumName && (
                <Badge variant="secondary" className="mt-3">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Serão salvos em: {selectedAlbumName}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* ===== SECONDARY ACTIONS ===== */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full text-xs h-8 gap-1">
                <ImagePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adicionar por</span> link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar por link</DialogTitle>
                <DialogDescription>Cole o endereço de uma foto ou vídeo</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="https://exemplo.com/foto.jpg" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Input placeholder="Nome" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                <Input placeholder="Descrição (opcional)" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} />
                {uploadUrl && isVideoUrl(uploadUrl) && (
                  <Badge variant="secondary" className="gap-1">
                    <Video className="h-3 w-3" /> Vídeo
                  </Badge>
                )}
              </div>
              <DialogFooter>
                <Button onClick={addPhoto} className="rounded-full w-full">Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant={selectionMode ? "default" : "outline"}
            className="rounded-full text-xs h-8 gap-1"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedPhotos(new Set());
            }}
          >
            <Check className="h-3.5 w-3.5" />
            {selectionMode ? `${selectedPhotos.size} sel.` : "Selecionar"}
          </Button>

          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="rounded-full text-[10px] h-8 gap-0.5 text-muted-foreground px-2" onClick={populateTestPhotos}>
              <Sparkles className="h-3 w-3" />Teste
            </Button>
            {hasTestPhotos && (
              <Button size="sm" variant="ghost" className="rounded-full text-[10px] h-8 gap-0.5 text-muted-foreground px-2" onClick={() => clearTestPhotos()}>
                <Eraser className="h-3 w-3" />Limpar
              </Button>
            )}
          </div>
        </div>

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectionMode && selectedPhotos.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
            <span className="text-sm font-medium text-primary">{selectedPhotos.size} selecionado(s)</span>
            <div className="flex-1" />

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
                  <AlertDialogTitle>Apagar {selectedPhotos.size} item(ns)?</AlertDialogTitle>
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
                            <AlertDialogDescription>As fotos e vídeos serão mantidos, apenas a pasta será removida.</AlertDialogDescription>
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
                  <DialogDescription>Dê um nome para organizar suas fotos e vídeos</DialogDescription>
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

        {/* Dialog editar foto/vídeo */}
        <Dialog open={!!editingPhoto} onOpenChange={(open) => { if (!open) setEditingPhoto(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar {editingPhoto && getFotoTipo(editingPhoto.url_foto) === "video" ? "vídeo" : "foto"}</DialogTitle>
              <DialogDescription>Ajuste o nome, descrição e posicionamento da imagem</DialogDescription>
            </DialogHeader>
            {editingPhoto && (
              <div className="space-y-4">
                {getFotoTipo(editingPhoto.url_foto) === "video" ? (
                  <video
                    src={editingPhoto.url_foto}
                    className="w-full aspect-video rounded-xl bg-muted"
                    controls
                  />
                ) : (
                  <FocalPointPicker
                    src={editingPhoto.url_foto}
                    focalX={editFocalX}
                    focalY={editFocalY}
                    zoom={editZoom}
                    onChange={(x, y, z) => { setEditFocalX(x); setEditFocalY(y); if (z !== undefined) setEditZoom(z); }}
                  />
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
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

        {/* Dialog prévia de upload com ponto focal */}
        <Dialog open={showUploadPreview} onOpenChange={(open) => { if (!open) cancelUploadPreviews(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Posicionar foto {previewIndex + 1} de {pendingUploads.length}
              </DialogTitle>
              <DialogDescription>
                Toque na imagem para definir o ponto focal — a parte que não será cortada no quadrado
              </DialogDescription>
            </DialogHeader>
            {pendingUploads[previewIndex] && (
              <div className="space-y-4">
                <FocalPointPicker
                  src={pendingUploads[previewIndex].previewUrl}
                  focalX={pendingUploads[previewIndex].focalX}
                  focalY={pendingUploads[previewIndex].focalY}
                  zoom={pendingUploads[previewIndex].zoom}
                  onChange={(x, y, z) => {
                    setPendingUploads(prev => prev.map((p, i) =>
                      i === previewIndex ? { ...p, focalX: x, focalY: y, zoom: z ?? p.zoom } : p
                    ));
                  }}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {pendingUploads[previewIndex].file.name}
                </p>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:gap-2">
              {pendingUploads.length > 1 && (
                <div className="flex gap-2 mr-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={previewIndex === 0}
                    onClick={() => setPreviewIndex(i => i - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={previewIndex === pendingUploads.length - 1}
                    onClick={() => setPreviewIndex(i => i + 1)}
                  >
                    Próxima <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
              <Button variant="ghost" onClick={cancelUploadPreviews} className="rounded-full">
                Cancelar
              </Button>
              <Button onClick={confirmUploadPreviews} className="rounded-full">
                <Upload className="h-4 w-4 mr-1" />
                Enviar {pendingUploads.length > 1 ? `${pendingUploads.length} fotos` : "foto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DESTAQUES DA HOME (reorder) ===== */}
        {(() => {
          const destaques = fotos.filter(f => f.destaque_home).sort((a, b) => a.ordem - b.ordem);
          if (destaques.length === 0) return null;

          const swapOrdem = async (idx: number, direction: "up" | "down") => {
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= destaques.length) return;
            const a = destaques[idx];
            const b2 = destaques[swapIdx];
            await Promise.all([
              supabase.from("galeria_fotos").update({ ordem: b2.ordem } as any).eq("id", a.id),
              supabase.from("galeria_fotos").update({ ordem: a.ordem } as any).eq("id", b2.id),
            ]);
            toast.success("Ordem atualizada");
            await loadData();
          };

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Destaques da Home</span>
                <span className="text-xs text-muted-foreground">({destaques.length} itens — arraste para reordenar)</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {destaques.map((item, idx) => {
                  const isVideo = getFotoTipo(item.url_foto) === "video";
                  return (
                    <div key={item.id} className="shrink-0 w-32 rounded-xl border-2 border-primary/30 bg-card overflow-hidden relative">
                      {/* Position number */}
                      <div className="absolute top-1 left-1 z-10 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      {/* Type badge */}
                      {isVideo && (
                        <div className="absolute top-1 right-1 z-10">
                          <span className="bg-blue-600 text-white text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5">
                            <Play className="h-2 w-2" /> Vídeo
                          </span>
                        </div>
                      )}
                      {/* Thumbnail */}
                      {isVideo ? (
                        <video src={item.url_foto} className="w-full aspect-square object-cover" muted preload="metadata" />
                      ) : (
                        <img src={item.url_foto} alt={item.titulo} className="w-full aspect-square object-cover" />
                      )}
                      {/* Reorder + unpin controls */}
                      <div className="flex items-center justify-between p-1.5 gap-0.5">
                        <button
                          onClick={() => swapOrdem(idx, "up")}
                          disabled={idx === 0}
                          className="h-6 w-6 flex items-center justify-center rounded bg-accent hover:bg-accent/80 disabled:opacity-30 transition-colors"
                          title="Mover para esquerda"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                        <p className="text-[9px] font-medium truncate flex-1 text-center">{item.titulo}</p>
                        <button
                          onClick={() => swapOrdem(idx, "down")}
                          disabled={idx === destaques.length - 1}
                          className="h-6 w-6 flex items-center justify-center rounded bg-accent hover:bg-accent/80 disabled:opacity-30 transition-colors"
                          title="Mover para direita"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => toggleDestaqueHome(item.id, true)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors ml-0.5"
                          title="Remover da home"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ===== MEDIA GRID ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredFotos.map((foto) => {
            const isSelected = selectedPhotos.has(foto.id);
            const isVideo = getFotoTipo(foto.url_foto) === "video";
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
                  {isVideo && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Play className="h-2.5 w-2.5" /> Vídeo
                    </span>
                  )}
                  {foto.destaque_home && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Pin className="h-2.5 w-2.5" /> Home
                    </span>
                  )}
                  {!foto.visivel && (
                    <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <EyeOff className="h-2.5 w-2.5" /> Oculto
                    </span>
                  )}
                </div>

                {/* Media preview */}
                {isVideo ? (
                  <div className="relative w-full aspect-square bg-black flex items-center justify-center">
                    <video
                      src={foto.url_foto}
                      className={`w-full h-full object-cover ${!foto.visivel ? "opacity-50" : ""}`}
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={foto.url_foto}
                    alt={foto.titulo}
                    className={`w-full aspect-square object-cover transition-opacity ${!foto.visivel ? "opacity-50" : ""}`}
                    style={getFocalStyle(foto.legenda)}
                    loading="lazy"
                  />
                )}

                {/* Info + actions */}
                <div className="p-2.5 space-y-2">
                  <div>
                    <p className="text-xs font-semibold truncate">{foto.titulo}</p>
                    {foto.legenda && <p className="text-[11px] text-muted-foreground truncate">{decodeFocalPoint(foto.legenda).cleanLegenda}</p>}
                  </div>

                  {!selectionMode && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => { 
                          const { cleanLegenda, focalX, focalY, zoom } = decodeFocalPoint(foto.legenda);
                          setEditingPhoto(foto); 
                          setEditPhotoTitle(foto.titulo); 
                          setEditPhotoCaption(cleanLegenda); 
                          setEditFocalX(focalX);
                          setEditFocalY(focalY);
                          setEditZoom(zoom);
                        }}
                        className="flex h-8 items-center gap-1 px-2 rounded-lg text-[11px] font-medium bg-accent hover:bg-accent/80 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>

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

                      <button
                        onClick={() => togglePhotoVisibility(foto.id, foto.visivel)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          foto.visivel ? "bg-accent hover:bg-accent/80" : "bg-muted"
                        }`}
                        title={foto.visivel ? "Ocultar do site" : "Mostrar no site"}
                      >
                        {foto.visivel ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>

                      <button
                        onClick={() => toggleDestaqueHome(foto.id, !!foto.destaque_home)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          foto.destaque_home ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                        }`}
                        title={foto.destaque_home ? "Remover da home" : "Fixar na home"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto"
                            title="Apagar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar este {isVideo ? "vídeo" : "foto"}?</AlertDialogTitle>
                            <AlertDialogDescription>"{foto.titulo}" será removido permanentemente.</AlertDialogDescription>
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
            <div className="flex justify-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground font-medium">
              {selectedAlbum ? "Nenhum item nesta pasta" : "Nenhum item na galeria"}
            </p>
            <p className="text-sm text-muted-foreground">
              Toque no botão acima para enviar suas primeiras fotos ou vídeos
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Gallery;
