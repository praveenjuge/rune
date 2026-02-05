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
              isRestartingOllama={isRestartingOllama}
              onDownloadOllama={onDownloadOllama}
              onDownloadModel={onDownloadModel}
              onRestartOllama={onRestartOllama}
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

function OllamaSetup({
  status,
  ollamaProgress,
  modelProgress,
  isDownloadingOllama,
  isDownloadingModel,
  isRestartingOllama,
  onDownloadOllama,
  onDownloadModel,
  onRestartOllama,
}: {
  status: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  modelProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isDownloadingModel: boolean;
  isRestartingOllama: boolean;
  onDownloadOllama: () => void;
  onDownloadModel: () => void;
  onRestartOllama: () => void;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
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
      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-400">AI Tagging Ready</span>
            {status.serverRunning && (
              <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                AI Model Running
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestartOllama}
            disabled={isRestartingOllama}
            className="h-7 px-2"
            title="Restart AI Model"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRestartingOllama ? 'animate-spin' : ''}`} />
          </Button>
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
