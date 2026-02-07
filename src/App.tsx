import { useEffect, useRef, useState } from "react";
import { App as AntdApp, Flex, Layout, theme } from "antd";
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

const { Content } = Layout;

function AppContent() {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<any>(null);
  const { message } = AntdApp.useApp();
  const { token } = theme.useToken();

  const {
    settings,
    libraryPath,
    defaultLibraryPath,
    status,
    isBootstrapping,
    isImporting,
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
    handleDownloadOllama,
    handleDownloadModel,
    handleCancelModelDownload,
    handleRestartOllama,
    handleDeleteOllamaModel,
    handleDeleteOllamaBinary,
    handleSetCurrentModel,
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

  useEffect(() => {
    if (status) {
      message.error(status);
    }
  }, [status, message]);

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
    <>
      <Header
        search={search}
        onSearch={setSearch}
        onAdd={handleAddImagesWrapper}
        onOpenSettings={handleOpenSettings}
        isImporting={isImporting}
        onFocusSearch={() => searchInputRef.current?.focus()}
        searchInputRef={searchInputRef}
      />

      <Content style={{ overflowY: "auto", paddingBlock: token.paddingSM }}>
        <Flex vertical>
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
              <div ref={sentinelRef} style={{ height: token.paddingLG }} />
              {isLoadingMore ? <LoadingMore /> : null}
            </>
          ) : null}
        </Flex>
      </Content>

      {isConfigOpen ? (
        <ConfigModal
          isOpen={isConfigOpen}
          libraryPath={libraryPath}
          defaultPath={defaultLibraryPath}
          status={status}
          ollamaStatus={ollamaStatus}
          ollamaProgress={ollamaProgress}
          modelProgress={modelProgress}
          isDownloadingOllama={isDownloadingOllama}
          isDownloadingModel={isDownloadingModel}
          isRestartingOllama={isRestartingOllama}
          showWelcome={!settings}
          updateStatus={updateStatus}
          currentVersion={currentVersion}
          availableModels={availableModels}
          currentModel={currentModel}
          installedModels={installedModels}
          onClose={() => setIsConfigOpen(false)}
          onChooseFolder={handleSelectLibrary}
          onDownloadOllama={handleDownloadOllama}
          onDownloadModel={handleDownloadModel}
          onCancelModelDownload={handleCancelModelDownload}
          onRestartOllama={handleRestartOllama}
          onDeleteOllamaModel={handleDeleteOllamaModel}
          onDeleteOllamaBinary={handleDeleteOllamaBinary}
          onSetCurrentModel={handleSetCurrentModel}
          onCheckForUpdates={handleCheckForUpdates}
          onInstallUpdate={handleInstallUpdate}
        />
      ) : null}
    </>
  );
}

export function App() {
  return (
    <AntdApp>
      <AppContent />
    </AntdApp>
  );
}
