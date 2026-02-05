import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FolderOpen,
  Laptop,
  Loader2,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DEFAULT_LICENSE_KEY,
  type LibraryImage,
  type LibrarySettings,
  type SearchCursor,
  SEARCH_PAGE_SIZE,
} from "./shared/library";

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const searchInputClassName =
  "h-10 w-full rounded-md border-0 bg-transparent pr-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

export function App() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [defaultLibraryPath, setDefaultLibraryPath] = useState("");
  const [libraryPath, setLibraryPath] = useState("");
  const [licenseKey, setLicenseKey] = useState(DEFAULT_LICENSE_KEY);
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
    setLicenseKey(nextSettings?.licenseKey ?? DEFAULT_LICENSE_KEY);
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

        if (!result.ok) {
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
      licenseKey: licenseKey.trim() || DEFAULT_LICENSE_KEY,
    });
    setIsSaving(false);

    if (!result.ok) {
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

    if (!result.ok) {
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

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setImages((current) => current.filter((image) => image.id !== id));
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
            />
            <div ref={sentinelRef} className="h-6" />
            {isLoadingMore ? <LoadingMore /> : null}
          </>
        ) : null}
      </main>

      {isConfigOpen ? (
        <ConfigModal
          mode={configMode}
          libraryPath={libraryPath}
          licenseKey={licenseKey}
          defaultLibraryPath={defaultLibraryPath}
          status={status}
          isSaving={isSaving}
          onCancel={() => setIsConfigOpen(false)}
          onChooseFolder={handleSelectLibrary}
          onLicenseChange={setLicenseKey}
          onSave={handleSaveSettings}
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
};

function ImageGrid({ images, deletingId, onDelete }: ImageGridProps) {
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
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
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

type ConfigModalProps = {
  mode: "onboarding" | "settings";
  libraryPath: string;
  licenseKey: string;
  defaultLibraryPath: string;
  status: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onChooseFolder: () => void;
  onLicenseChange: (value: string) => void;
  onSave: () => void;
};

function ConfigModal({
  mode,
  libraryPath,
  licenseKey,
  defaultLibraryPath,
  status,
  isSaving,
  onCancel,
  onChooseFolder,
  onLicenseChange,
  onSave,
}: ConfigModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 px-6 py-8">
      <div className="w-full max-w-lg rounded-md border bg-background p-6 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {mode === "onboarding" ? "Welcome" : "Library settings"}
        </p>
        <h2 className="text-lg font-semibold">Choose a library location</h2>

        <div className="mt-4 space-y-4 text-sm">
          <FieldGroup
            label="Library folder"
            note={`Default: ${defaultLibraryPath || "Documents/rune"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input value={libraryPath} readOnly className={inputClassName} />
              <Button
                variant="outline"
                onClick={onChooseFolder}
                aria-label="Choose folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </FieldGroup>
          <FieldGroup label="License key">
            <input
              value={licenseKey}
              onChange={(event) => onLicenseChange(event.target.value)}
              className={inputClassName}
            />
          </FieldGroup>
          {mode === "settings" ? (
            <FieldGroup
              label="Appearance"
              note="System uses your OS appearance preference."
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                >
                  <Laptop className="h-4 w-4" />
                  System
                </Button>
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
              </div>
            </FieldGroup>
          ) : null}
        </div>

        {status ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {status}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          {mode === "settings" ? (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </span>
            ) : mode === "onboarding" ? (
              "Continue"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

type FieldGroupProps = {
  label: string;
  note?: string;
  children: ReactNode;
};

function FieldGroup({ label, note, children }: FieldGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
