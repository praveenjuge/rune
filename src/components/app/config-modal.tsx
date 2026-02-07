import { Button, Badge, Progress, Modal, Alert } from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  LaptopOutlined,
  LoadingOutlined,
  MoonOutlined,
  ReloadOutlined,
  SunOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useTheme } from "@/components/theme-provider";
import { OLLAMA_MODEL } from "@/shared/library";
import type { DownloadProgress, OllamaStatus, UpdateStatus } from "@/shared/library";

export function ConfigModal({
  isOpen,
  libraryPath,
  defaultPath,
  status,
  isSaving,
  ollamaStatus,
  ollamaProgress,
  modelProgress,
  isDownloadingOllama,
  isDownloadingModel,
  isRestartingOllama,
  showWelcome,
  updateStatus,
  currentVersion,
  onClose,
  onChooseFolder,
  onSave,
  onDownloadOllama,
  onDownloadModel,
  onRestartOllama,
  onDeleteOllamaModel,
  onDeleteOllamaBinary,
  onCheckForUpdates,
  onInstallUpdate,
}: {
  isOpen: boolean;
  libraryPath: string;
  defaultPath: string;
  status: string | null;
  isSaving: boolean;
  ollamaStatus: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  modelProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isDownloadingModel: boolean;
  isRestartingOllama: boolean;
  showWelcome: boolean;
  updateStatus: UpdateStatus;
  currentVersion: string;
  onClose: () => void;
  onChooseFolder: () => void;
  onSave: () => void;
  onDownloadOllama: () => void;
  onDownloadModel: () => void;
  onRestartOllama: () => void;
  onDeleteOllamaModel: () => void;
  onDeleteOllamaBinary: () => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Settings"
      footer={null}
      width={480}
    >
      {/* Welcome alert - shown inside modal on first time */}
      {showWelcome && (
        <Alert
          message="Welcome to Rune! Your library folder has been set to Documents/Rune. Click Save to continue."
          type="info"
          className="mb-4"
        />
      )}

      <div className="space-y-5 text-sm">
        {/* Library folder */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Library folder
          </label>
          <div className="flex items-center gap-2">
            <input
              value={libraryPath || defaultPath}
              readOnly
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
            />
            <Button
              onClick={onChooseFolder}
              aria-label="Choose folder"
              icon={<FolderOpenOutlined className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Ollama Binary */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Ollama Binary
          </label>
          <OllamaBinarySetup
            status={ollamaStatus}
            ollamaProgress={ollamaProgress}
            isDownloadingOllama={isDownloadingOllama}
            isRestartingOllama={isRestartingOllama}
            onDownloadOllama={onDownloadOllama}
            onRestartOllama={onRestartOllama}
            onDeleteOllamaBinary={onDeleteOllamaBinary}
          />
        </div>

        {/* AI Model */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            AI Model
          </label>
          <OllamaModelSetup
            status={ollamaStatus}
            modelProgress={modelProgress}
            isDownloadingModel={isDownloadingModel}
            onDownloadModel={onDownloadModel}
            onDeleteOllamaModel={onDeleteOllamaModel}
          />
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Theme
          </label>
          <div className="flex items-center gap-2">
            <Button
              type={theme === "system" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("system")}
              icon={<LaptopOutlined className="h-4 w-4" />}
            />
            <Button
              type={theme === "light" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("light")}
              icon={<SunOutlined className="h-4 w-4" />}
            />
            <Button
              type={theme === "dark" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("dark")}
              icon={<MoonOutlined className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* App Updates */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            App Updates
          </label>
          <AppUpdateSection
            updateStatus={updateStatus}
            currentVersion={currentVersion}
            onCheckForUpdates={onCheckForUpdates}
            onInstallUpdate={onInstallUpdate}
          />
        </div>
      </div>

      {/* Error message */}
      {status && (
        <Alert message={status} type="error" className="mt-4" />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button type="primary" onClick={onSave} loading={isSaving}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

function OllamaBinarySetup({
  status,
  ollamaProgress,
  isDownloadingOllama,
  isRestartingOllama,
  onDownloadOllama,
  onRestartOllama,
  onDeleteOllamaBinary,
}: {
  status: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isRestartingOllama: boolean;
  onDownloadOllama: () => void;
  onRestartOllama: () => void;
  onDeleteOllamaBinary: () => void;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (isDownloadingOllama && ollamaProgress) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <LoadingOutlined className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)}
          </span>
          <Progress percent={ollamaProgress.percent} size="small" className="flex-1" />
        </div>
      </div>
    );
  }

  if (!status.binaryInstalled) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border border-dashed bg-muted/10">
        <span className="text-sm text-muted-foreground">Not installed</span>
        <Button onClick={onDownloadOllama} size="small" icon={<DownloadOutlined className="h-4 w-4" />}>
          Download
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2">
        <CheckCircleOutlined className="h-4 w-4 text-green-500" />
        {status.serverRunning && (
          <Badge
            status="processing"
            text="Running"
          />
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="text"
          size="small"
          onClick={onRestartOllama}
          disabled={isRestartingOllama}
          icon={<ReloadOutlined className={`h-3.5 w-3.5 ${isRestartingOllama ? 'animate-spin' : ''}`} />}
        />
        <Button
          type="text"
          size="small"
          onClick={onDeleteOllamaBinary}
          danger
          icon={<DeleteOutlined className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}

function OllamaModelSetup({
  status,
  modelProgress,
  isDownloadingModel,
  onDownloadModel,
  onDeleteOllamaModel,
}: {
  status: OllamaStatus;
  modelProgress: DownloadProgress | null;
  isDownloadingModel: boolean;
  onDownloadModel: () => void;
  onDeleteOllamaModel: () => void;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (!status.binaryInstalled) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border border-dashed bg-muted/10 opacity-60">
        <span className="text-sm text-muted-foreground">Install Ollama first</span>
      </div>
    );
  }

  if (isDownloadingModel && modelProgress) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <LoadingOutlined className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatBytes(modelProgress.downloaded)} / {formatBytes(modelProgress.total)}
          </span>
          <Progress percent={modelProgress.percent} size="small" className="flex-1" />
        </div>
      </div>
    );
  }

  if (!status.modelInstalled) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <span className="text-sm text-muted-foreground">Not installed</span>
        <Button onClick={onDownloadModel} size="small" icon={<DownloadOutlined className="h-4 w-4" />}>
          Download
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2">
        <CheckCircleOutlined className="h-4 w-4 text-green-500" />
        {status.serverRunning && (
          <Badge
            status="success"
            text="Ready"
          />
        )}
      </div>
      <Button
        type="text"
        size="small"
        onClick={onDeleteOllamaModel}
        danger
        icon={<DeleteOutlined className="h-3.5 w-3.5" />}
      />
    </div>
  );
}

function AppUpdateSection({
  updateStatus,
  currentVersion,
  onCheckForUpdates,
  onInstallUpdate,
}: {
  updateStatus: UpdateStatus;
  currentVersion: string;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
}) {
  const isChecking = updateStatus.state === "checking";
  const isDownloading = updateStatus.state === "downloading";
  const isDownloaded = updateStatus.state === "downloaded";
  const hasError = updateStatus.state === "error";
  const isAvailable = updateStatus.state === "available";
  const isNotAvailable = updateStatus.state === "not-available";

  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          v{currentVersion || "..."}
        </span>

        {isDownloaded && (
          <Badge status="success" text="Update Ready" />
        )}

        {isAvailable && (
          <Badge status="processing" text="Update Available" />
        )}

        {isNotAvailable && (
          <Badge status="default" text="Up to date" />
        )}

        {hasError && (
          <span className="text-xs text-destructive" title={updateStatus.error}>
            Update check failed
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {(isChecking || isDownloading) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoadingOutlined className="h-4 w-4 animate-spin" />
            <span>{isDownloading ? "Downloading..." : "Checking..."}</span>
          </div>
        )}

        {updateStatus.state === "idle" && (
          <Button
            size="small"
            onClick={onCheckForUpdates}
            icon={<ReloadOutlined className="h-3.5 w-3.5" />}
          >
            Check
          </Button>
        )}

        {isNotAvailable && (
          <Button
            type="text"
            size="small"
            onClick={onCheckForUpdates}
            icon={<ReloadOutlined className="h-3.5 w-3.5" />}
          />
        )}

        {hasError && (
          <Button
            size="small"
            onClick={onCheckForUpdates}
          >
            Retry
          </Button>
        )}

        {isDownloaded && (
          <Button
            type="primary"
            size="small"
            onClick={onInstallUpdate}
            icon={<ReloadOutlined className="h-3.5 w-3.5" />}
          >
            Restart & Update
          </Button>
        )}
      </div>
    </div>
  );
}
