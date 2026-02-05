import {
  Check,
  Download,
  FolderOpen,
  Laptop,
  Loader2,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/theme-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { OLLAMA_MODEL } from "@/shared/library";
import type { DownloadProgress, OllamaStatus } from "@/shared/library";

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
  onClose,
  onChooseFolder,
  onSave,
  onDownloadOllama,
  onDownloadModel,
  onRestartOllama,
  onDeleteOllamaModel,
  onDeleteOllamaBinary,
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
  onClose: () => void;
  onChooseFolder: () => void;
  onSave: () => void;
  onDownloadOllama: () => void;
  onDownloadModel: () => void;
  onRestartOllama: () => void;
  onDeleteOllamaModel: () => void;
  onDeleteOllamaBinary: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {/* Welcome alert - shown inside modal on first time */}
        {showWelcome && (
          <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
            Welcome to Rune! Your library folder has been set to Documents/Rune. Click Save to continue.
          </div>
        )}

        <DialogHeader>
          <h2 className="text-lg font-semibold">Settings</h2>
        </DialogHeader>

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
                variant="outline"
                size="icon"
                onClick={onChooseFolder}
                aria-label="Choose folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
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
        </div>

        {/* Error message */}
        {status && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {status}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

  // Binary not installed
  if (!status.binaryInstalled && !isDownloadingOllama) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Not installed</span>
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

  // Downloading binary
  if (isDownloadingOllama) {
    if (ollamaProgress) {
      return (
        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm">Downloading...</span>
          </div>
          <Progress value={ollamaProgress.percent} />
          <p className="text-xs text-muted-foreground">
            {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)} ({ollamaProgress.percent}%)
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Starting download...</span>
        </div>
      </div>
    );
  }

  // Binary installed
  return (
    <div className={`rounded-md border p-3 space-y-3 ${status.serverRunning ? 'border-green-500/30 bg-green-500/10' : 'bg-muted/20'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className={`text-sm ${status.serverRunning ? 'text-green-700 dark:text-green-400' : ''}`}>
            Installed
          </span>
          {status.serverRunning && (
            <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Running
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestartOllama}
            disabled={isRestartingOllama}
            className="h-7 px-2"
            title="Restart"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRestartingOllama ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteOllamaBinary}
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Uninstall"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ollama server binary for running AI models.
      </p>
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

  // Binary not installed - show disabled state
  if (!status.binaryInstalled) {
    return (
      <div className="rounded-md border border-dashed bg-muted/10 p-3 space-y-3 opacity-60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Not available</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Install Ollama binary first to download the AI model.
        </p>
      </div>
    );
  }

  // Downloading model
  if (isDownloadingModel) {
    if (modelProgress) {
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
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Starting download...</span>
        </div>
      </div>
    );
  }

  // Model not installed
  if (!status.modelInstalled) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Not installed</span>
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

  // Model installed
  return (
    <div className={`rounded-md border p-3 space-y-3 ${status.serverRunning ? 'border-green-500/30 bg-green-500/10' : 'bg-muted/20'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className={`text-sm ${status.serverRunning ? 'text-green-700 dark:text-green-400' : ''}`}>
            {OLLAMA_MODEL}
          </span>
          {status.serverRunning && (
            <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Running
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteOllamaModel}
          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete model"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Vision model for generating image tags.
      </p>
    </div>
  );
}
