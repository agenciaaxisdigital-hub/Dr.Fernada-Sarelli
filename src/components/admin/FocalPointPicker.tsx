import { useState, useRef, useCallback } from "react";
import { Move } from "lucide-react";

interface FocalPointPickerProps {
  src: string;
  focalX?: number; // 0-100
  focalY?: number; // 0-100
  onChange: (x: number, y: number) => void;
}

/**
 * Allows user to click/drag on an image to set the focal point.
 * The focal point determines how the image is cropped in square frames.
 * A crosshair shows the selected point and a preview square shows the crop result.
 */
const FocalPointPicker = ({ src, focalX = 50, focalY = 50, onChange }: FocalPointPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    onChange(Math.round(x), Math.round(y));
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Move className="h-4 w-4" />
        <span>Toque na foto para posicionar o ponto focal</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Image with crosshair */}
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden border-2 border-border cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <img
            src={src}
            alt="Posicionar"
            className="w-full block"
            draggable={false}
            style={{ maxHeight: 300, objectFit: "contain", width: "100%", background: "hsl(var(--muted))" }}
          />
          {/* Crosshair */}
          <div
            className="absolute pointer-events-none"
            style={{ left: `${focalX}%`, top: `${focalY}%`, transform: "translate(-50%, -50%)" }}
          >
            {/* Outer ring */}
            <div className="h-8 w-8 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary shadow-sm" />
            </div>
            {/* Crosshair lines */}
            <div className="absolute left-1/2 top-0 -translate-x-px -translate-y-4 w-0.5 h-3 bg-white/80" />
            <div className="absolute left-1/2 bottom-0 -translate-x-px translate-y-4 w-0.5 h-3 bg-white/80" />
            <div className="absolute top-1/2 left-0 -translate-y-px -translate-x-4 h-0.5 w-3 bg-white/80" />
            <div className="absolute top-1/2 right-0 -translate-y-px translate-x-4 h-0.5 w-3 bg-white/80" />
          </div>
        </div>

        {/* Preview: how it looks as square crop */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground text-center">Prévia no site</p>
          <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-muted">
            <img
              src={src}
              alt="Prévia"
              className="w-full h-full object-cover"
              style={{ objectPosition: `${focalX}% ${focalY}%` }}
            />
          </div>
        </div>
      </div>

      {/* Position indicator */}
      <p className="text-xs text-center text-muted-foreground">
        Ponto focal: {focalX}%, {focalY}%
      </p>
    </div>
  );
};

export default FocalPointPicker;

// Helpers to encode/decode focal point in legenda field
export const FOCAL_POINT_REGEX = /\[fp:(\d+),(\d+)\]$/;

export function encodeFocalPoint(legenda: string | null, x: number, y: number): string {
  const clean = (legenda || "").replace(FOCAL_POINT_REGEX, "").trim();
  // Don't store default center position
  if (x === 50 && y === 50) return clean;
  return clean ? `${clean} [fp:${x},${y}]` : `[fp:${x},${y}]`;
}

export function decodeFocalPoint(legenda: string | null): { cleanLegenda: string; focalX: number; focalY: number } {
  if (!legenda) return { cleanLegenda: "", focalX: 50, focalY: 50 };
  const match = legenda.match(FOCAL_POINT_REGEX);
  if (!match) return { cleanLegenda: legenda, focalX: 50, focalY: 50 };
  return {
    cleanLegenda: legenda.replace(FOCAL_POINT_REGEX, "").trim(),
    focalX: parseInt(match[1], 10),
    focalY: parseInt(match[2], 10),
  };
}

export function getFocalStyle(legenda: string | null): React.CSSProperties {
  const { focalX, focalY } = decodeFocalPoint(legenda);
  if (focalX === 50 && focalY === 50) return {};
  return { objectPosition: `${focalX}% ${focalY}%` };
}
