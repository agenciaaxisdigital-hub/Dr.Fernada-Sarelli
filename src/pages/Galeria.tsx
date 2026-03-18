import { useEffect, useState, useRef, useCallback } from "react";
import { Image as ImageIcon, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import ScrollReveal from "@/components/ScrollReveal";

interface Album {
  id: string;
  nome: string;
}

interface Foto {
  id: string;
  titulo: string;
  legenda: string | null;
  url_foto: string;
  album_id: string | null;
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"];
const isVideoUrl = (url: string) => VIDEO_EXTENSIONS.some(ext => url.toLowerCase().includes(ext));
const getFotoTipo = (url: string) => isVideoUrl(url) ? "video" : "foto";

// Helper to get or create visitor cookie
const getVisitorCookie = (): string => {
  const key = "chama_visitor";
  let cookie = localStorage.getItem(key);
  if (!cookie) {
    cookie = crypto.randomUUID();
    localStorage.setItem(key, cookie);
  }
  return cookie;
};

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let dispositivo = "desktop";
  if (/Mobi|Android/i.test(ua)) dispositivo = "mobile";
  else if (/Tablet|iPad/i.test(ua)) dispositivo = "tablet";

  let navegador = "outro";
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) navegador = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = "Safari";
  else if (/Firefox/i.test(ua)) navegador = "Firefox";
  else if (/Edge/i.test(ua)) navegador = "Edge";

  return { dispositivo, navegador };
};

const trackGalleryEvent = async (
  fotoId: string,
  tipoEvento: "visualizacao" | "play_video" | "duracao_video",
  valor?: number
) => {
  const { dispositivo, navegador } = getDeviceInfo();
  await supabase.from("galeria_analytics" as any).insert({
    foto_id: fotoId,
    tipo_evento: tipoEvento,
    valor: valor ?? null,
    cookie_visitante: getVisitorCookie(),
    dispositivo,
    navegador,
  } as any);
};

const GaleriaPublica = () => {
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [galeriaAtiva, setGaleriaAtiva] = useState<boolean | null>(null);
  const [lightbox, setLightbox] = useState<Foto | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartTime = useRef<number>(0);
  const trackedPlayRef = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: configData } = await supabase
        .from("configuracoes" as any)
        .select("valor")
        .eq("chave", "galeria_ativa")
        .maybeSingle();

      const ativa = String((configData as { valor?: string | null } | null)?.valor ?? "").toLowerCase() === "true";
      setGaleriaAtiva(ativa);
      if (!ativa) return;

      const [{ data: albumData }, { data: fotoData }] = await Promise.all([
        supabase.from("albuns" as any).select("id, nome").order("ordem"),
        supabase.from("galeria_fotos").select("*").eq("visivel", true).order("ordem"),
      ]);

      if (albumData) setAlbuns(albumData as unknown as Album[]);
      if (fotoData) setFotos(fotoData as unknown as Foto[]);
    };
    load();
  }, []);

  // Track video duration when lightbox closes or video pauses
  const trackVideoDuration = useCallback(() => {
    if (videoRef.current && lightbox && getFotoTipo(lightbox.url_foto) === "video" && videoStartTime.current > 0) {
      const duration = (Date.now() - videoStartTime.current) / 1000;
      if (duration >= 1) {
        trackGalleryEvent(lightbox.id, "duracao_video", Math.round(duration));
      }
      videoStartTime.current = 0;
    }
  }, [lightbox]);

  // Open lightbox and track view
  const openLightbox = useCallback((foto: Foto) => {
    setLightbox(foto);
    trackGalleryEvent(foto.id, "visualizacao");
    trackedPlayRef.current = null;
    videoStartTime.current = 0;
  }, []);

  // Close lightbox and track video duration if applicable
  const closeLightbox = useCallback(() => {
    trackVideoDuration();
    setLightbox(null);
  }, [trackVideoDuration]);

  // Handle video play event
  const handleVideoPlay = useCallback(() => {
    if (lightbox && trackedPlayRef.current !== lightbox.id) {
      trackGalleryEvent(lightbox.id, "play_video");
      trackedPlayRef.current = lightbox.id;
    }
    videoStartTime.current = Date.now();
  }, [lightbox]);

  // Handle video pause - track partial duration
  const handleVideoPause = useCallback(() => {
    if (lightbox && videoStartTime.current > 0) {
      const duration = (Date.now() - videoStartTime.current) / 1000;
      if (duration >= 1) {
        trackGalleryEvent(lightbox.id, "duracao_video", Math.round(duration));
      }
      videoStartTime.current = 0;
    }
  }, [lightbox]);

  // Auto-play video when lightbox opens
  useEffect(() => {
    if (lightbox && getFotoTipo(lightbox.url_foto) === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [lightbox]);

  if (galeriaAtiva === null) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!galeriaAtiva) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold">Galeria</h1>
          <p className="mt-2 text-muted-foreground">A galeria estará disponível em breve.</p>
        </div>
      </Layout>
    );
  }

  const filteredFotos = selectedAlbum
    ? fotos.filter((f) => f.album_id === selectedAlbum)
    : fotos;

  return (
    <Layout>
      <section className="py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                📸 Registro das atividades
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Galeria de Fotos e Vídeos</h1>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Acompanhe os eventos, ações sociais e encontros comunitários
              </p>
            </div>
          </ScrollReveal>

          {/* Album filter */}
          {albuns.length > 0 && (
            <ScrollReveal delay={0.1}>
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className={`rounded-full px-5 py-2 text-sm font-medium border transition-colors ${
                    !selectedAlbum
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-accent"
                  }`}
                >
                  Todas
                </button>
                {albuns.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => setSelectedAlbum(album.id)}
                    className={`rounded-full px-5 py-2 text-sm font-medium border transition-colors ${
                      selectedAlbum === album.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-accent"
                    }`}
                  >
                    {album.nome}
                  </button>
                ))}
              </div>
            </ScrollReveal>
          )}

          {/* Photo/Video grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filteredFotos.map((foto, i) => {
              const isVideo = getFotoTipo(foto.url_foto) === "video";
              return (
                <ScrollReveal key={foto.id} delay={Math.min(i * 0.05, 0.3)}>
                  <div
                    className="break-inside-avoid rounded-2xl overflow-hidden border bg-card group cursor-pointer"
                    onClick={() => openLightbox(foto)}
                  >
                    {isVideo ? (
                      <div className="relative">
                        <video
                          src={foto.url_foto}
                          className="w-full object-cover"
                          muted
                          preload="metadata"
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-7 w-7 text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={foto.url_foto}
                        alt={foto.titulo}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        {isVideo && (
                          <span className="text-[10px] font-semibold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Vídeo
                          </span>
                        )}
                        <p className="text-sm font-medium">{foto.titulo}</p>
                      </div>
                      {foto.legenda && (
                        <p className="text-xs text-muted-foreground mt-0.5">{foto.legenda}</p>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {filteredFotos.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              Nenhum conteúdo disponível neste álbum.
            </p>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(lightbox.tipo || "foto") === "video" ? (
              <video
                ref={videoRef}
                src={lightbox.url_foto}
                className="w-full max-h-[80vh] bg-black"
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
              />
            ) : (
              <img
                src={lightbox.url_foto}
                alt={lightbox.titulo}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2">
                {(lightbox.tipo || "foto") === "video" && (
                  <span className="text-xs font-semibold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Vídeo
                  </span>
                )}
                <p className="font-semibold">{lightbox.titulo}</p>
              </div>
              {lightbox.legenda && (
                <p className="text-sm text-muted-foreground mt-1">{lightbox.legenda}</p>
              )}
            </div>
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-foreground hover:bg-card transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GaleriaPublica;
