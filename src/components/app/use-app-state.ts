import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DownloadProgress,
  ImageTagsUpdated,
  LibraryImage,
  LibrarySettings,
  OllamaStatus,
  SearchCursor,
} from "@/shared/library";
import { SEARCH_PAGE_SIZE } from "@/shared/library";

export function useAppState() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [defaultLibraryPath, setDefaultLibraryPath] = useState("");
  const [libraryPath, setLibraryPath] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    binaryInstalled: false,
    modelInstalled: false,
    serverRunning: false,
    status: "not-installed",
  });
  const [ollamaProgress, setOllamaProgress] =
    useState<DownloadProgress | null>(null);
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [isDownloadingOllama, setIsDownloadingOllama] = useState(false);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [isRestartingOllama, setIsRestartingOllama] = useState(false);

  const resetResults = () => {
    // This will be called by the search hook
  };

  const setConfigDefaults = (
    nextSettings: LibrarySettings | null,
    defaultPath: string,
  ) => {
    const nextPath = nextSettings?.libraryPath ?? defaultPath;
    setLibraryPath(nextPath);
  };

  const handleBootstrap = async () => {
    try {
      const bootstrap = await window.rune.getBootstrap();
      setDefaultLibraryPath(bootstrap.defaultLibraryPath);
      setSettings(bootstrap.settings);
      setOllamaStatus(bootstrap.ollamaStatus);
      setConfigDefaults(bootstrap.settings, bootstrap.defaultLibraryPath);

      if (bootstrap.settings) {
        resetResults();
        setHasSeenWelcome(true);
      } else {
        // First time: settings modal opens with default path already set
        setIsConfigOpen(true);
      }
    } catch (error) {
      setStatus("Unable to start Rune. Please restart the app.");
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleOpenSettings = () => {
    setStatus(null);
    setConfigDefaults(settings, defaultLibraryPath);
    setIsConfigOpen(true);
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
    const result = await window.rune.saveSettings();
    setIsSaving(false);

    if (result.ok === false) {
      setStatus(result.error);
      return;
    }

    setSettings(result.data);
    setHasSeenWelcome(true);
    setIsConfigOpen(false);
    resetResults();
  };

  const handleAddImages = async () => {
    setStatus(null);
    if (!settings) {
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

    return result.data.length > 0;
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

    return true;
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

  const handleRestartOllama = async () => {
    setIsRestartingOllama(true);
    setStatus(null);

    const result = await window.rune.restartOllama();
    setIsRestartingOllama(false);

    if (result.ok === false) {
      setStatus(result.error);
    } else {
      // Refresh status after restart
      window.rune.getOllamaStatus().then(setOllamaStatus);
    }
  };

  const handleDeleteOllamaModel = async () => {
    setStatus(null);
    const result = await window.rune.deleteOllamaModel();

    if (result.ok === false) {
      setStatus(result.error);
    } else {
      // Refresh status after deletion
      window.rune.getOllamaStatus().then(setOllamaStatus);
    }
  };

  const handleDeleteOllamaBinary = async () => {
    setStatus(null);
    const result = await window.rune.deleteOllamaBinary();

    if (result.ok === false) {
      setStatus(result.error);
    } else {
      // Refresh status after deletion
      window.rune.getOllamaStatus().then(setOllamaStatus);
    }
  };

  // Set up event listeners for Ollama progress and tag updates
  useEffect(() => {
    const unsubOllama = window.rune.onOllamaDownloadProgress((progress) => {
      setOllamaProgress(progress);
      if (progress.status === "complete") {
        setIsDownloadingOllama(false);
        window.rune.getOllamaStatus().then(setOllamaStatus);
      } else if (progress.status === "error") {
        setIsDownloadingOllama(false);
        setStatus(progress.error || "Failed to download Ollama");
      }
    });

    const unsubModel = window.rune.onModelDownloadProgress((progress) => {
      setModelProgress(progress);
      if (progress.status === "complete") {
        setIsDownloadingModel(false);
        window.rune.getOllamaStatus().then(setOllamaStatus);
      } else if (progress.status === "error") {
        setIsDownloadingModel(false);
        setStatus(progress.error || "Failed to download model");
      }
    });

    return () => {
      unsubOllama();
      unsubModel();
    };
  }, []);

  useEffect(() => {
    handleBootstrap();
  }, []);

  return {
    settings,
    libraryPath,
    defaultLibraryPath,
    status,
    isBootstrapping,
    isImporting,
    isSaving,
    isConfigOpen,
    hasSeenWelcome,
    deletingId,
    ollamaStatus,
    ollamaProgress,
    modelProgress,
    isDownloadingOllama,
    isDownloadingModel,
    isRestartingOllama,
    setStatus,
    setIsConfigOpen,
    resetResults,
    handleOpenSettings,
    handleSelectLibrary,
    handleSaveSettings,
    handleAddImages,
    handleDeleteImage,
    handleRetryTagging,
    handleDownloadOllama,
    handleDownloadModel,
    handleRestartOllama,
    handleDeleteOllamaModel,
    handleDeleteOllamaBinary,
  };
}

export function useSearch(
  search: string,
  settings: LibrarySettings | null,
  resetResults: () => void,
  setStatus: (status: string | null) => void,
) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [cursor, setCursor] = useState<SearchCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const searchRequestIdRef = useRef(0);
  const cursorRef = useRef<SearchCursor | null>(null);

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
    [search, settings, setStatus],
  );

  // Update cursor ref
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  // Debounced search
  useEffect(() => {
    if (!settings) return;
    const timeout = window.setTimeout(() => {
      resetResults();
      runSearch(true);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [runSearch, search, settings, resetResults]);

  // Infinite scroll
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

  // Listen for image tag updates
  useEffect(() => {
    const unsubTags = window.rune.onImageTagsUpdated(
      (update: ImageTagsUpdated) => {
        setImages((current) =>
          current.map((img) =>
            img.id === update.id
              ? { ...img, aiTags: update.aiTags, aiTagStatus: update.aiTagStatus }
              : img,
          ),
        );
      },
    );

    return () => {
      unsubTags();
    };
  }, []);

  const deleteImageFromState = useCallback((id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
  }, []);

  return {
    images,
    hasMore,
    isSearching,
    isLoadingMore,
    sentinelRef,
    runSearch,
    deleteImageFromState,
  };
}
