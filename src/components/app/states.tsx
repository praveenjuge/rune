import { Image, Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Image className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No images yet</p>
    </div>
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Search className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No results for "{query.trim()}"</p>
    </div>
  );
}

export function LoadingMore() {
  return (
    <div className="flex items-center justify-center py-4">
      <Spinner className="h-5 w-5" />
    </div>
  );
}
