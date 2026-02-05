import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  Download,
  FolderOpen,
  Laptop,
  Loader2,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/theme-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  OLLAMA_MODEL,
  type AiTagStatus,
  type DownloadProgress,
  type ImageTagsUpdated,
  type LibraryImage,
  type LibrarySettings,
  type OllamaStatus,
  type SearchCursor,
  SEARCH_PAGE_SIZE,
} from "./shared/library";

const searchInputClassName =
  "h-10 w-full rounded-md border-0 bg-transparent pr-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

export function App() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [defaultLibraryPath, setDefaultLibraryPath] = useState("");
  const [libraryPath, setLibraryPath] = useState("");
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<SearchCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMode, setConfigMode] = useState<"onboarding" | "settings">(
    "onboarding",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    binaryInstalled: false,
    modelInstalled: false,
    serverRunning: false,
    status: 'not-installed',
  });
  const [ollamaProgress, setOllamaProgress] = useState<DownloadProgress | null>(null);
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(null);
  const [isDownloadingOllama, setIsDownloadingOllama] = useState(false);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const searchRequestIdRef = useRef(0);
  const cursorRef = useRef<SearchCursor | null>(null);

  const resetResults = () => {
    setImages([]);
    setCursor(null);
    setHasMore(false);
  };

  const setConfigDefaults = (
    nextSettings: LibrarySettings | null,
    defaultPath: string,
  ) => {
    const nextPath = nextSettings?.libraryPath ?? defaultPath;
    setLibraryPath(nextPath);
  };

  const runSearch = useCallback(
    async (reset: boolean, nextCursor?: SearchCursor | null) => {
      if (!settings) return;
      const requestId = (searchRequestIdRef.current += 1);
      const query = search.trim();

      if (reset) {
        setIsSearching(true);
        setStatus(null);
        setCursor(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await window.rune.searchImages({
          query,
          limit: SEARCH_PAGE_SIZE,
          cursor: reset ? null : nextCursor ?? cursorRef.current,
        });

        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        if (result.ok === false) {
          setStatus(result.error);
        } else {
          setImages((current) =>
            reset ? result.data.items : [...current, ...result.data.items],
          );
          setCursor(result.data.nextCursor);
          setHasMore(Boolean(result.data.nextCursor));
        }
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setStatus("Unable to search the library.");
      } finally {
        if (requestId === searchRequestIdRef.current) {
          if (reset) {
            setIsSearching(false);
          }
          setIsLoadingMore(false);
        }
      }
    },
    [search, settings],
  );

  const handleBootstrap = async () => {
    try {
      const bootstrap = await window.rune.getBootstrap();
      setDefaultLibraryPath(bootstrap.defaultLibraryPath);
      setSettings(bootstrap.settings);
      setOllamaStatus(bootstrap.ollamaStatus);
      setConfigDefaults(bootstrap.settings, bootstrap.defaultLibraryPath);

      if (bootstrap.settings) {
        resetResults();
      } else {
        setConfigMode("onboarding");
        setIsConfigOpen(true);
      }
    } catch (error) {
      setStatus("Unable to start Rune. Please restart the app.");
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Set up event listeners for Ollama progress and tag updates
  useEffect(() => {
    const unsubOllama = window.rune.onOllamaDownloadProgress((progress) => {
      setOllamaProgress(progress);
      if (progress.status === 'complete') {
        setIsDownloadingOllama(false);
        window.rune.getOllamaStatus().then(setOllamaStatus);
      } else if (progress.status === 'error') {
        setIsDownloadingOllama(false);
        setStatus(progress.error || 'Failed to download Ollama');
      }
    });

    const unsubModel = window.rune.onModelDownloadProgress((progress) => {
      setModelProgress(progress);
      if (progress.status === 'complete') {
        setIsDownloadingModel(false);
        window.rune.getOllamaStatus().then(setOllamaStatus);
      } else if (progress.status === 'error') {
        setIsDownloadingModel(false);
        setStatus(progress.error || 'Failed to download model');
      }
    });

    const unsubTags = window.rune.onImageTagsUpdated((update: ImageTagsUpdated) => {
      setImages((current) =>
        current.map((img) =>
          img.id === update.id
            ? { ...img, aiTags: update.aiTags, aiTagStatus: update.aiTagStatus }
            : img
        )
      );
    });

    return () => {
      unsubOllama();
      unsubModel();
      unsubTags();
    };
  }, []);

  useEffect(() => {
    handleBootstrap();
  }, []);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!settings) return;
    const timeout = window.setTimeout(() => {
      resetResults();
      runSearch(true);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [runSearch, search, settings]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry?.isIntersecting &&
          hasMore &&
          !isSearching &&
          !isLoadingMore
        ) {
          runSearch(false);
        }
      },
      { rootMargin: "200px" },
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isSearching, runSearch]);

  const handleOpenSettings = () => {
    setStatus(null);
    setConfigMode("settings");
    setConfigDefaults(settings, defaultLibraryPath);
    setIsConfigOpen(true);
    // Refresh Ollama status when opening settings
    window.rune.getOllamaStatus().then(setOllamaStatus);
  };

  const handleSelectLibrary = async () => {
    const chosen = await window.rune.selectLibrary(libraryPath);
    if (chosen) {
      setLibraryPath(chosen);
    }
  };

  const handleSaveSettings = async () => {
    setStatus(null);
    setIsSaving(true);
    const result = await window.rune.saveSettings({
      libraryPath,
    });
    setIsSaving(false);

    if (result.ok === false) {
      setStatus(result.error);
      return;
    }

    setSettings(result.data);
    setConfigMode("settings");
    setIsConfigOpen(false);
    resetResults();
  };

  const handleAddImages = async () => {
    setStatus(null);
    if (!settings) {
      setConfigMode("onboarding");
      setConfigDefaults(null, defaultLibraryPath);
      setIsConfigOpen(true);
      return;
    }

    setIsImporting(true);
    const result = await window.rune.importImages();
    setIsImporting(false);

    if (result.ok === false) {
      setStatus(result.error);
      return;
    }

    if (result.data.length > 0) {
      resetResults();
      await runSearch(true);
    }
  };

  const handleDeleteImage = async (id: string) => {
    setStatus(null);
    setDeletingId(id);
    const result = await window.rune.deleteImage({ id });
    setDeletingId(null);

    if (result.ok === false) {
      setStatus(result.error);
      return;
    }

    setImages((current) => current.filter((image) => image.id !== id));
  };

  const handleRetryTagging = async (id: string) => {
    const result = await window.rune.retryTagging(id);
    if (result.ok === false) {
      setStatus(result.error);
    }
  };

  const handleDownloadOllama = async () => {
    setIsDownloadingOllama(true);
    setOllamaProgress(null);
    setStatus(null);
    
    const result = await window.rune.downloadOllama();
    if (result.ok === false) {
      setStatus(result.error);
      setIsDownloadingOllama(false);
    }
  };

  const handleDownloadModel = async () => {
    setIsDownloadingModel(true);
    setModelProgress(null);
    setStatus(null);
    
    const result = await window.rune.downloadModel();
    if (result.ok === false) {
      setStatus(result.error);
      setIsDownloadingModel(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        search={search}
        onSearch={setSearch}
        onAdd={handleAddImages}
        onOpenSettings={handleOpenSettings}
        isImporting={isImporting}
        onFocusSearch={() => searchInputRef.current?.focus()}
        searchInputRef={searchInputRef}
      />

      <main className="flex w-full flex-1 flex-col gap-0 overflow-y-auto pb-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6">
          {status ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {status}
            </div>
          ) : null}

          {isBootstrapping || (isSearching && images.length === 0) ? (
            <LoadingState />
          ) : images.length === 0 ? (
            search.trim() ? (
              <EmptySearchState query={search} />
            ) : (
              <EmptyState onAdd={handleAddImages} />
            )
          ) : null}
        </div>

        {!isBootstrapping && images.length > 0 ? (
          <>
            <ImageGrid
              images={images}
              deletingId={deletingId}
              onDelete={handleDeleteImage}
              onRetryTagging={handleRetryTagging}
            />
            <div ref={sentinelRef} className="h-6" />
            {isLoadingMore ? <LoadingMore /> : null}
          </>
        ) : null}
      </main>

      {isConfigOpen ? (
        <ConfigModal
          isOpen={isConfigOpen}
          mode={configMode}
          libraryPath={libraryPath}
          defaultLibraryPath={defaultLibraryPath}
          status={status}
          isSaving={isSaving}
          ollamaStatus={ollamaStatus}
          ollamaProgress={ollamaProgress}
          modelProgress={modelProgress}
          isDownloadingOllama={isDownloadingOllama}
          isDownloadingModel={isDownloadingModel}
          onClose={() => setIsConfigOpen(false)}
          onChooseFolder={handleSelectLibrary}
          onSave={handleSaveSettings}
          onDownloadOllama={handleDownloadOllama}
          onDownloadModel={handleDownloadModel}
        />
      ) : null}
    </div>
  );
}

type HeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onOpenSettings: () => void;
  isImporting: boolean;
  onFocusSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
};

function Header({
  search,
  onSearch,
  onAdd,
  onOpenSettings,
  isImporting,
  onFocusSearch,
  searchInputRef,
}: HeaderProps) {
  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (target.tagName === "INPUT") return;
    onFocusSearch();
  };

  return (
    <header className="shrink-0 bg-background">
      <div className="w-full px-4 py-2" onClick={handleHeaderClick}>
        <HeaderActions
          search={search}
          onSearch={onSearch}
          onAdd={onAdd}
          onOpenSettings={onOpenSettings}
          isImporting={isImporting}
          searchInputRef={searchInputRef}
        />
      </div>
    </header>
  );
}

type HeaderActionsProps = {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onOpenSettings: () => void;
  isImporting: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
};

function HeaderActions({
  search,
  onSearch,
  onAdd,
  onOpenSettings,
  isImporting,
  searchInputRef,
}: HeaderActionsProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search images"
          className={`${searchInputClassName} min-w-0 flex-1`}
        />
      </div>
      <Button
        onClick={onAdd}
        disabled={isImporting}
        className="shrink-0"
        size="icon"
        aria-label="Add images"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        onClick={onOpenSettings}
        className="shrink-0"
        size="icon"
        aria-label="Library settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading library…
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
      <p className="text-base font-medium text-foreground">No images yet.</p>
      <p>Upload files to start building your inspiration library.</p>
      <div>
        <Button onClick={onAdd}>Add images</Button>
      </div>
    </div>
  );
}

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
      <p className="text-base font-medium text-foreground">No results.</p>
      <p>We couldn't find anything for "{query.trim()}".</p>
    </div>
  );
}

function LoadingMore() {
  return (
    <div className="mx-auto mt-2 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading more…
    </div>
  );
}

type ImageGridProps = {
  images: LibraryImage[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRetryTagging: (id: string) => void;
};

function ImageGrid({ images, deletingId, onDelete, onRetryTagging }: ImageGridProps) {
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
            {image.aiTagStatus === 'failed' && (
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
  if (status === 'pending') {
    return null; // Don't show anything for pending
  }

  if (status === 'generating') {
    return (
      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Generating...</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1.5 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        <span>Failed</span>
      </div>
    );
  }

  if (status === 'complete' && tags) {
    return (
      <div className="bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground leading-relaxed">
        {tags}
      </div>
    );
  }

  return null;
}

type ConfigModalProps = {
  isOpen: boolean;
  mode: "onboarding" | "settings";
  libraryPath: string;
  defaultLibraryPath: string;
  status: string | null;
  isSaving: boolean;
  ollamaStatus: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  modelProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isDownloadingModel: boolean;
  onClose: () => void;
  onChooseFolder: () => void;
  onSave: () => void;
  onDownloadOllama: () => void;
  onDownloadModel: () => void;
};

function ConfigModal({
  isOpen,
  mode,
  libraryPath,
  defaultLibraryPath,
  status,
  isSaving,
  ollamaStatus,
  ollamaProgress,
  modelProgress,
  isDownloadingOllama,
  isDownloadingModel,
  onClose,
  onChooseFolder,
  onSave,
  onDownloadOllama,
  onDownloadModel,
}: ConfigModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold">
            {mode === "onboarding" ? "Set up your library" : "Settings"}
          </h2>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Library folder */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Library folder
            </label>
            <div className="flex items-center gap-2">
              <input
                value={libraryPath}
                readOnly
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onChooseFolder}
                aria-label="Choose folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Tagging */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              AI Tagging
            </label>
            <OllamaSetup
              status={ollamaStatus}
              ollamaProgress={ollamaProgress}
              modelProgress={modelProgress}
              isDownloadingOllama={isDownloadingOllama}
              isDownloadingModel={isDownloadingModel}
              onDownloadOllama={onDownloadOllama}
              onDownloadModel={onDownloadModel}
            />
          </div>

          {/* Appearance - only in settings mode */}
          {mode === "settings" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Theme
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                >
                  <Laptop className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {status && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {status}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          {mode === "settings" && (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving
              </>
            ) : mode === "onboarding" ? (
              "Continue"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type OllamaSetupProps = {
  status: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  modelProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isDownloadingModel: boolean;
  onDownloadOllama: () => void;
  onDownloadModel: () => void;
};

function OllamaSetup({
  status,
  ollamaProgress,
  modelProgress,
  isDownloadingOllama,
  isDownloadingModel,
  onDownloadOllama,
  onDownloadModel,
}: OllamaSetupProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Ollama binary not installed
  if (!status.binaryInstalled && !isDownloadingOllama) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Ollama not installed</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Download Ollama to enable AI-powered image tagging.
        </p>
        <Button onClick={onDownloadOllama} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Ollama
        </Button>
      </div>
    );
  }

  // Downloading Ollama binary
  if (isDownloadingOllama && ollamaProgress) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Downloading Ollama...</span>
        </div>
        <Progress value={ollamaProgress.percent} />
        <p className="text-xs text-muted-foreground">
          {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)} ({ollamaProgress.percent}%)
        </p>
      </div>
    );
  }

  // Ollama installed but model not installed
  if (status.binaryInstalled && !status.modelInstalled && !isDownloadingModel) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm">Ollama installed</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Download the AI vision model ({OLLAMA_MODEL}) to start tagging images.
        </p>
        <Button onClick={onDownloadModel} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Model (~1.5 GB)
        </Button>
      </div>
    );
  }

  // Downloading model
  if (isDownloadingModel && modelProgress) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Downloading {OLLAMA_MODEL}...</span>
        </div>
        <Progress value={modelProgress.percent} />
        <p className="text-xs text-muted-foreground">
          {formatBytes(modelProgress.downloaded)} / {formatBytes(modelProgress.total)} ({modelProgress.percent}%)
        </p>
      </div>
    );
  }

  // Everything is ready
  if (status.binaryInstalled && status.modelInstalled) {
    return (
      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400">AI Tagging Ready</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Images will be automatically tagged when added to your library.
        </p>
      </div>
    );
  }

  // Downloading Ollama (no progress yet)
  if (isDownloadingOllama) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Starting Ollama download...</span>
        </div>
      </div>
    );
  }

  // Downloading model (no progress yet)
  if (isDownloadingModel) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Starting model download...</span>
        </div>
      </div>
    );
  }

  return null;
}
