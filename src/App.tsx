import { useRef, useState } from "react";
import { ConfigModal } from "./components/app/config-modal";
import {
  EmptySearchState,
  EmptyState,
  LoadingMore,
  LoadingState,
} from "./components/app/states";
import { Header } from "./components/app/header";
import { ImageGrid } from "./components/app/image-grid";
import { useAppState, useSearch } from "./components/app/use-app-state";

export function App() {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    settings,
    libraryPath,
    status,
    isBootstrapping,
    isImporting,
    isSaving,
    isConfigOpen,
    configMode,
    deletingId,
    ollamaStatus,
    ollamaProgress,
    modelProgress,
    isDownloadingOllama,
    isDownloadingModel,
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
  } = useAppState();

  const {
    images,
    isSearching,
    isLoadingMore,
    sentinelRef,
    runSearch,
    deleteImageFromState,
  } = useSearch(search, settings, resetResults, setStatus);

  const handleAddImagesWrapper = async () => {
    const hasImages = await handleAddImages();
    if (hasImages) {
      resetResults();
      await runSearch(true);
    }
  };

  const handleDeleteImageWrapper = async (id: string) => {
    const deleted = await handleDeleteImage(id);
    if (deleted) {
      deleteImageFromState(id);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        search={search}
        onSearch={setSearch}
        onAdd={handleAddImagesWrapper}
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
              <EmptyState />
            )
          ) : null}
        </div>

        {!isBootstrapping && images.length > 0 ? (
          <>
            <ImageGrid
              images={images}
              deletingId={deletingId}
              onDelete={handleDeleteImageWrapper}
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
