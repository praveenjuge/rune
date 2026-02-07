import { useRef, useState } from "react";
import { Alert } from "antd";
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
  const searchInputRef = useRef<any>(null);

  const {
    settings,
    libraryPath,
    defaultLibraryPath,
    status,
    isBootstrapping,
    isImporting,
    isSaving,
    isConfigOpen,
    deletingId,
    ollamaStatus,
    ollamaProgress,
    modelProgress,
    isDownloadingOllama,
    isDownloadingModel,
    isRestartingOllama,
    updateStatus,
    currentVersion,
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
    handleCheckForUpdates,
    handleInstallUpdate,
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
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--rune-background)", color: "var(--rune-foreground)" }}>
      <Header
        search={search}
        onSearch={setSearch}
        onAdd={handleAddImagesWrapper}
        onOpenSettings={handleOpenSettings}
        isImporting={isImporting}
        onFocusSearch={() => searchInputRef.current?.focus()}
        searchInputRef={searchInputRef}
      />

      <main style={{ display: "flex", width: "100%", flex: 1, flexDirection: "column", gap: 0, overflowY: "auto", paddingBottom: 24 }}>
        <div style={{ marginLeft: "auto", marginRight: "auto", display: "flex", width: "100%", maxWidth: "72rem", flexDirection: "column", gap: 16, padding: "0 24px" }}>
          {status ? (
            <Alert message={status} type="error" />
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

          {!isBootstrapping && images.length > 0 ? (
            <>
              <ImageGrid
                images={images}
                deletingId={deletingId}
                onDelete={handleDeleteImageWrapper}
                onRetryTagging={handleRetryTagging}
              />
              <div ref={sentinelRef} style={{ height: 24 }} />
              {isLoadingMore ? <LoadingMore /> : null}
            </>
          ) : null}
        </div>
      </main>

      {isConfigOpen ? (
        <ConfigModal
          isOpen={isConfigOpen}
          libraryPath={libraryPath}
          defaultPath={defaultLibraryPath}
          status={status}
          isSaving={isSaving}
          ollamaStatus={ollamaStatus}
          ollamaProgress={ollamaProgress}
          modelProgress={modelProgress}
          isDownloadingOllama={isDownloadingOllama}
          isDownloadingModel={isDownloadingModel}
          isRestartingOllama={isRestartingOllama}
          showWelcome={!settings}
          updateStatus={updateStatus}
          currentVersion={currentVersion}
          onClose={() => setIsConfigOpen(false)}
          onChooseFolder={handleSelectLibrary}
          onSave={handleSaveSettings}
          onDownloadOllama={handleDownloadOllama}
          onDownloadModel={handleDownloadModel}
          onRestartOllama={handleRestartOllama}
          onDeleteOllamaModel={handleDeleteOllamaModel}
          onDeleteOllamaBinary={handleDeleteOllamaBinary}
          onCheckForUpdates={handleCheckForUpdates}
          onInstallUpdate={handleInstallUpdate}
        />
      ) : null}
    </div>
  );
}
