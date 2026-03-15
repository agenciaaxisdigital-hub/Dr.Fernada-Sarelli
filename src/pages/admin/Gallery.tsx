import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Upload, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
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

const UNSPLASH_PHOTOS = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600",
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600",
  "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600",
  "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=600",
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600",
  "https://images.unsplash.com/photo-1560439513-74b037a25d84?w=600",
  "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=600",
];

const Gallery = () => {
  const { isAdmin } = useAdmin();
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
    const [{ data: albumData }, { data: fotoData }, { data: configData }] = await Promise.all([
      supabase.from("albuns" as any).select("*").order("ordem"),
      supabase.from("galeria_fotos").select("*").order("ordem"),
      supabase.from("configuracoes" as any).select("*").eq("chave", "galeria_ativa").single(),
    ]);
    if (albumData) setAlbuns(albumData as any[]);
    if (fotoData) setFotos(fotoData as any[]);
    if (configData) setGaleriaAtiva((configData as any).valor === "true");
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleGaleria = async () => {
    const newVal = !galeriaAtiva;
    await supabase.from("configuracoes" as any).update({ valor: newVal ? "true" : "false" } as any).eq("chave", "galeria_ativa");
    setGaleriaAtiva(newVal);
    toast.success(newVal ? "Galeria ativada" : "Galeria desativada");
  };

  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;
    await supabase.from("albuns" as any).insert({ nome: newAlbumName } as any);
    setNewAlbumName("");
    setNewAlbumOpen(false);
    toast.success("Álbum criado");
    loadData();
  };

  const deletePhoto = async (id: string) => {
    await supabase.from("galeria_fotos").delete().eq("id", id);
    toast.success("Foto removida");
    loadData();
  };

  const togglePhotoVisibility = async (id: string, visivel: boolean) => {
    await supabase.from("galeria_fotos").update({ visivel: !visivel }).eq("id", id);
    loadData();
  };

  const addPhoto = async () => {
    if (!uploadUrl.trim() || !uploadTitle.trim()) return;
    await supabase.from("galeria_fotos").insert({
      titulo: uploadTitle,
      legenda: uploadCaption || null,
      url_foto: uploadUrl,
      album_id: selectedAlbum,
      visivel: true,
    } as any);
    setUploadUrl("");
    setUploadTitle("");
    setUploadCaption("");
    setUploadOpen(false);
    toast.success("Foto adicionada");
    loadData();
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const path = `galeria/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("galeria").upload(path, file);
      if (error) { toast.error("Erro no upload"); continue; }
      const { data: urlData } = supabase.storage.from("galeria").getPublicUrl(path);
      await supabase.from("galeria_fotos").insert({
        titulo: file.name.replace(/\.[^/.]+$/, ""),
        url_foto: urlData.publicUrl,
        album_id: selectedAlbum,
        visivel: true,
      } as any);
    }
    toast.success("Upload concluído");
    loadData();
  };

  const populateTestPhotos = async () => {
    const albumNames = ["Eventos Comunitários", "Ações Sociais", "Campanha"];
    for (const name of albumNames) {
      const { data: existing } = await supabase.from("albuns" as any).select("id").eq("nome", name).single();
      if (!existing) {
        await supabase.from("albuns" as any).insert({ nome: name } as any);
      }
    }
    const { data: allAlbums } = await supabase.from("albuns" as any).select("*").order("criado_em");
    if (!allAlbums || allAlbums.length < 3) return;

    for (let i = 0; i < UNSPLASH_PHOTOS.length; i++) {
      const albumIdx = i % 3;
      await supabase.from("galeria_fotos").insert({
        titulo: `Foto de teste ${i + 1}`,
        legenda: `Legenda da foto ${i + 1}`,
        url_foto: UNSPLASH_PHOTOS[i],
        album_id: (allAlbums as any[])[albumIdx].id,
        visivel: true,
        ordem: i,
      } as any);
    }
    toast.success("12 fotos de teste adicionadas em 3 álbuns");
    loadData();
  };

  const filteredFotos = selectedAlbum ? fotos.filter((f) => f.album_id === selectedAlbum) : fotos;

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

        {/* Albums */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAlbum(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              !selectedAlbum ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
            }`}
          >
            Todas
          </button>
          {albuns.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAlbum(a.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                selectedAlbum === a.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
              }`}
            >
              {a.nome}
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

        {/* Actions */}
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

          {fotos.length === 0 && (
            <Button variant="outline" className="rounded-full" onClick={populateTestPhotos}>
              <Upload className="mr-2 h-4 w-4" /> Carregar fotos de teste
            </Button>
          )}
        </div>

        {/* Drag & Drop zone */}
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

        {/* Pinterest-style grid */}
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
                >
                  {foto.visivel ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => deletePhoto(foto.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
