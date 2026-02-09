import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DownloadProgress,
  ImageTagsUpdated,
  LibraryImage,
  LibrarySettings,
  OllamaStatus,
  SearchCursor,
  UpdateStatus,
  VlModelInfo,
} from "@/shared/library";
import { SEARCH_PAGE_SIZE, AVAILABLE_VL_MODELS } from "@/shared/library";

export function useAppState() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [defaultLibraryPath, setDefaultLibraryPath] = useState("");
  const [libraryPath, setLibraryPath] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
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
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);

  // Auto-update state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: "idle",
  });
  const [currentVersion, setCurrentVersion] = useState<string>("");

  // VL model state
  const [availableModels, setAvailableModels] = useState<readonly VlModelInfo[]>(AVAILABLE_VL_MODELS);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [installedModels, setInstalledModels] = useState<string[]>([]);

  const resetResults = () => {
    // This will be called by the search hook
  };

  const setConfigDefaults = (
    nextSettings: LibrarySettings | null,
    defaultPath: string,
  ) => {
    // Initialize libraryPath if not already set
    // libraryPath is managed in state and selected via file dialog
    setLibraryPath((current) => current || defaultPath);
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
    handleLoadCurrentModel();
    handleLoadInstalledModels();
  };

  const handleSelectLibrary = async () => {
    const chosen = await window.rune.selectLibrary(libraryPath);
    if (chosen) {
      setLibraryPath(chosen);
      // Auto-save settings when library path is changed
      await window.rune.saveSettings();
    }
  };

  const handleAddImages = async () => {
    setStatus(null);
    if (!settings) {
      setConfigDefaults(null, defaultLibraryPath);
      setIsConfigOpen(true);
      return;
    }

    setIsImporting(true);
    try {
      const result = await window.rune.importImages();

      if (result.ok === false) {
        setStatus(result.error);
        return;
      }

      return result.data.length > 0;
    } finally {
      setIsImporting(false);
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

    return true;
  };

  const handleRetryTagging = async (id: string) => {
    const result = await window.rune.retryTagging(id);
    if (result.ok === false) {
      setStatus(result.error);
    }
  };

  const handleDownloadModel = async (model?: string) => {
    setIsDownloadingModel(true);
    setModelProgress(null);
    setStatus(null);

    const result = await window.rune.downloadModel(model);
    if (result.ok === false) {
      setStatus(result.error);
      setIsDownloadingModel(false);
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

  const handleCancelModelDownload = async () => {
    setStatus(null);
    const result = await window.rune.cancelModelDownload();
    if (result.ok === false) {
      setStatus(result.error);
    }
  };

  const handleSetCurrentModel = async (model: string) => {
    setStatus(null);
    const result = await window.rune.setCurrentModel(model);
    if (result.ok === false) {
      setStatus(result.error);
    } else {
      setCurrentModel(model);
    }
  };

  const handleLoadAvailableModels = async () => {
    const result = await window.rune.getAvailableVlModels();
    if (result.ok === true) {
      setAvailableModels(result.data);
    }
  };

  const handleLoadCurrentModel = async () => {
    const result = await window.rune.getCurrentModel();
    if (result.ok === true) {
      setCurrentModel(result.data);
    }
  };

  const handleLoadInstalledModels = async () => {
    const result = await window.rune.getInstalledModels();
    if (result.ok === true) {
      setInstalledModels(result.data);
    }
  };

  // Auto-update handlers
  const handleCheckForUpdates = async () => {
    setUpdateStatus({ state: "checking" });
    await window.rune.checkForUpdates();
  };

  const handleInstallUpdate = async () => {
    await window.rune.installUpdate();
  };

  // Set up event listeners for Ollama progress and tag updates
  useEffect(() => {
    const unsubModel = window.rune.onModelDownloadProgress((progress) => {
      setModelProgress(progress);
      if (progress.status === "complete") {
        setIsDownloadingModel(false);
        window.rune.getOllamaStatus().then(setOllamaStatus);
        handleLoadInstalledModels();
      } else if (progress.status === "error") {
        setIsDownloadingModel(false);
        setStatus(progress.error || "Failed to download model");
      }
    });

    // Listen for update status changes
    const unsubUpdate = window.rune.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    // Load current version
    window.rune.getVersion().then(setCurrentVersion);

    // Load initial update status
    window.rune.getUpdateStatus().then(setUpdateStatus);

    return () => {
      unsubModel();
      unsubUpdate();
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
    isConfigOpen,
    hasSeenWelcome,
    deletingId,
    ollamaStatus,
    modelProgress,
    isDownloadingModel,
    updateStatus,
    currentVersion,
    availableModels,
    currentModel,
    installedModels,
    setStatus,
    setIsConfigOpen,
    resetResults,
    handleOpenSettings,
    handleSelectLibrary,
    handleAddImages,
    handleDeleteImage,
    handleRetryTagging,
    handleDownloadModel,
    handleCancelModelDownload,
    handleDeleteOllamaModel,
    handleSetCurrentModel,
    handleCheckForUpdates,
    handleInstallUpdate,
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
