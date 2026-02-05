import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import type { AiTagStatus, LibraryImage } from "@/shared/library";

export function ImageGrid({
  images,
  deletingId,
  onDelete,
  onRetryTagging,
}: {
  images: LibraryImage[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRetryTagging: (id: string) => void;
}) {
  return (
    <div className="w-full columns-1 gap-1 sm:columns-3 lg:columns-4 xl:columns-6">
      {images.map((image) => (
        <ContextMenu key={image.id}>
          <ContextMenuTrigger asChild>
            <div className="mb-1 break-inside-avoid overflow-hidden">
              <img
                src={image.url}
                alt={image.originalName}
                loading="lazy"
                className="block h-auto w-full object-cover"
              />
              <ImageCaption
                status={image.aiTagStatus}
                tags={image.aiTags}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {image.aiTagStatus === "failed" && (
              <>
                <ContextMenuItem onClick={() => onRetryTagging(image.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry AI Tags
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem
              onClick={() => onDelete(image.id)}
              disabled={deletingId === image.id}
              className="text-destructive focus:text-destructive"
            >
              {deletingId === image.id ? "Deleting…" : "Delete"}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}

type ImageCaptionProps = {
  status: AiTagStatus;
  tags: string | null;
};

function ImageCaption({ status, tags }: ImageCaptionProps) {
  if (status === "pending") {
    return null;
  }

  if (status === "generating") {
    return (
      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Generating...</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        <span>Failed</span>
      </div>
    );
  }

  if (status === "complete" && tags) {
    return (
      <div className="bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground leading-relaxed">
        {tags}
      </div>
    );
  }

  return null;
}
