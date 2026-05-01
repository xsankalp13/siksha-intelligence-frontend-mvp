import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { idCardService } from "@/services/idCard";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ────────────────────────────────────────────────────────────

export interface IdCardPreviewProps {
  onDownload?: () => Promise<void>;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────

export function IdCardPreview({ onDownload, className = "" }: IdCardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Fetch rendered HTML from backend
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["id-card", "preview-html"],
    queryFn: async () => (await idCardService.getIdCardPreviewHtml()).data,
  });

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Split the backend HTML into Front and Back pages.
   * Backend template produces:
   * <html><head><style>...</style></head><body><div class="page">F</div><div class="page">B</div></body></html>
   */
  const splitContent = useMemo(() => {
    if (!data?.html) return null;

    const html = data.html;
    
    // Extract style block
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const styles = styleMatch ? styleMatch[1] : "";

    // Find all <div class="page"> blocks
    const pageRegex = /<div class="page"[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="page"|\s*<\/body>)/gi;
    const matches = Array.from(html.matchAll(pageRegex));

    // Fallback: If regex fails to find distinct parts, just use the whole body
    if (matches.length < 2) return { front: html, back: html };

    const buildPageDoc = (content: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${styles}
            body { margin: 0; padding: 0; overflow: hidden; background: white; }
            .page { page-break-after: unset !important; position: absolute; top: 0; left: 0; }
          </style>
        </head>
        <body>
          <div class="page">${content}</div>
        </body>
      </html>
    `;

    return {
      front: buildPageDoc(matches[0][1]),
      back: buildPageDoc(matches[1][1]),
    };
  }, [data?.html]);

  // Dimensions
  const cardWidth = 215;
  const cardHeight = 340;

  const showSkeleton = isLoading || isFetching || (!iframeLoaded && splitContent);

  if (showSkeleton) {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        {/* Invisible iframe to load content and trigger onLoad while showing skeleton */}
        {splitContent && !iframeLoaded && !isLoading && !isFetching && (
          <iframe
            srcDoc={splitContent.front}
            style={{ width: 0, height: 0, border: 'none', position: 'absolute', opacity: 0 }}
            onLoad={() => setIframeLoaded(true)}
            title="Preload"
          />
        )}
        <Skeleton className={`rounded-xl shadow-lg border border-border/50`} style={{ width: cardWidth, height: cardHeight }} />
        <div className="flex gap-2 relative z-10 w-full justify-center">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !splitContent) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/20" style={{ width: cardWidth, height: cardHeight }}>
        <ShieldAlert className="w-8 h-8 text-rose-500/50 mb-3" />
        <p className="text-xs text-muted-foreground font-medium mb-4">Unable to render preview</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-[10px] px-3 rounded-full">Retry</Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Card Container with perspective */}
      <div
        className="relative cursor-pointer select-none group"
        style={{ width: cardWidth, height: cardHeight, perspective: 1000 }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <iframe
                title="ID Card Front"
                srcDoc={splitContent.front}
                className="w-full h-full border-none pointer-events-none"
                style={{ overflow: 'hidden' }}
                scrolling="no"
                onLoad={() => setIframeLoaded(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="back"
              className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
               <iframe
                title="ID Card Back"
                srcDoc={splitContent.back}
                className="w-full h-full border-none pointer-events-none"
                style={{ overflow: 'hidden' }}
                scrolling="no"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-[11px] gap-1.5 px-3 rounded-full border shadow-sm"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <RotateCcw className="w-3 h-3" />
          {isFlipped ? "Show Front" : "Show Back"}
        </Button>

        {onDownload && (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-[11px] gap-1.5 px-4 rounded-full shadow-md transition-all active:scale-95"
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}

