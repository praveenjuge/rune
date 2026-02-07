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
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 14 }}>
        {/* Library folder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--rune-muted-foreground)" }}>
            Library folder
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={libraryPath || defaultPath}
              readOnly
              style={{ display: "flex", height: 36, width: "100%", borderRadius: 6, border: "1px solid var(--rune-input)", backgroundColor: "var(--rune-background)", padding: "6px 12px", fontSize: 14, color: "var(--rune-muted-foreground)" }}
            />
            <Button
              onClick={onChooseFolder}
              aria-label="Choose folder"
              icon={<FolderOpenOutlined />}
            />
          </div>
        </div>

        {/* Ollama Binary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--rune-muted-foreground)" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--rune-muted-foreground)" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--rune-muted-foreground)" }}>
            Theme
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              type={theme === "system" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("system")}
              icon={<LaptopOutlined />}
            />
            <Button
              type={theme === "light" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("light")}
              icon={<SunOutlined />}
            />
            <Button
              type={theme === "dark" ? "primary" : "default"}
              size="small"
              onClick={() => setTheme("dark")}
              icon={<MoonOutlined />}
            />
          </div>
        </div>

        {/* App Updates */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--rune-muted-foreground)" }}>
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
        <Alert message={status} type="error" style={{ marginTop: 16 }} />
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <LoadingOutlined spin style={{ color: "var(--rune-muted-foreground)" }} />
          <span style={{ fontSize: 12, color: "var(--rune-muted-foreground)" }}>
            {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)}
          </span>
          <Progress percent={ollamaProgress.percent} size="small" style={{ flex: 1 }} />
        </div>
      </div>
    );
  }

  if (!status.binaryInstalled) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px dashed var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
        <span style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>Not installed</span>
        <Button onClick={onDownloadOllama} size="small" icon={<DownloadOutlined />}>
          Download
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircleOutlined style={{ color: "var(--rune-green)" }} />
        {status.serverRunning && (
          <Badge
            status="processing"
            text="Running"
          />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          type="text"
          size="small"
          onClick={onRestartOllama}
          disabled={isRestartingOllama}
          icon={<ReloadOutlined spin={isRestartingOllama} />}
        />
        <Button
          type="text"
          size="small"
          onClick={onDeleteOllamaBinary}
          danger
          icon={<DeleteOutlined />}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px dashed var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)", opacity: 0.6 }}>
        <span style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>Install Ollama first</span>
      </div>
    );
  }

  if (isDownloadingModel && modelProgress) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <LoadingOutlined spin style={{ color: "var(--rune-muted-foreground)" }} />
          <span style={{ fontSize: 12, color: "var(--rune-muted-foreground)" }}>
            {formatBytes(modelProgress.downloaded)} / {formatBytes(modelProgress.total)}
          </span>
          <Progress percent={modelProgress.percent} size="small" style={{ flex: 1 }} />
        </div>
      </div>
    );
  }

  if (!status.modelInstalled) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
        <span style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>Not installed</span>
        <Button onClick={onDownloadModel} size="small" icon={<DownloadOutlined />}>
          Download
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircleOutlined style={{ color: "var(--rune-green)" }} />
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
        icon={<DeleteOutlined />}
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 6, border: "1px solid var(--rune-border)", backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>
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
          <span style={{ fontSize: 12, color: "var(--rune-destructive)" }} title={updateStatus.error}>
            Update check failed
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {(isChecking || isDownloading) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--rune-muted-foreground)" }}>
            <LoadingOutlined spin />
            <span>{isDownloading ? "Downloading..." : "Checking..."}</span>
          </div>
        )}

        {updateStatus.state === "idle" && (
          <Button
            size="small"
            onClick={onCheckForUpdates}
            icon={<ReloadOutlined />}
          >
            Check
          </Button>
        )}

        {isNotAvailable && (
          <Button
            type="text"
            size="small"
            onClick={onCheckForUpdates}
            icon={<ReloadOutlined />}
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
            icon={<ReloadOutlined />}
          >
            Restart & Update
          </Button>
        )}
      </div>
    </div>
  );
}
