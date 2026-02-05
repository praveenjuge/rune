import {
  Check,
  Download,
  FolderOpen,
  Laptop,
  Loader2,
  Moon,
  RefreshCw,
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

  if (isDownloadingOllama && ollamaProgress) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)}
          </span>
          <Progress value={ollamaProgress.percent} className="flex-1 h-1.5" />
        </div>
      </div>
    );
  }

  if (!status.binaryInstalled) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border border-dashed bg-muted/10">
        <span className="text-sm text-muted-foreground">Not installed</span>
        <Button onClick={onDownloadOllama} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-green-500" />
        {status.serverRunning && (
          <Badge variant="outline" className="h-5 px-1.5 text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            Running
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-0.5">
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
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
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
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatBytes(modelProgress.downloaded)} / {formatBytes(modelProgress.total)}
          </span>
          <Progress value={modelProgress.percent} className="flex-1 h-1.5" />
        </div>
      </div>
    );
  }

  if (!status.modelInstalled) {
    return (
      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <span className="text-sm text-muted-foreground">Not installed</span>
        <Button onClick={onDownloadModel} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-green-500" />
        {status.serverRunning && (
          <Badge variant="outline" className="h-5 px-1.5 text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            Ready
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDeleteOllamaModel}
        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
