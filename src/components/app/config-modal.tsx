import {
  App,
  Button,
  Badge,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Space,
  Steps,
  Tooltip,
  Typography,
  Alert,
  theme,
  Tag,
  Divider,
} from "antd";
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
import type {
  DownloadProgress,
  OllamaStatus,
  UpdateStatus,
  VlModelInfo,
} from "@/shared/library";
import { useState } from "react";

const { Text, Title, Paragraph } = Typography;

export function ConfigModal({
  isOpen,
  libraryPath,
  defaultPath,
  status,
  ollamaStatus,
  ollamaProgress,
  modelProgress,
  isDownloadingOllama,
  isDownloadingModel,
  isRestartingOllama,
  showWelcome,
  updateStatus,
  currentVersion,
  availableModels,
  currentModel,
  installedModels,
  onClose,
  onChooseFolder,
  onDownloadOllama,
  onDownloadModel,
  onCancelModelDownload,
  onRestartOllama,
  onDeleteOllamaModel,
  onDeleteOllamaBinary,
  onSetCurrentModel,
  onCheckForUpdates,
  onInstallUpdate,
}: {
  isOpen: boolean;
  libraryPath: string;
  defaultPath: string;
  status: string | null;
  ollamaStatus: OllamaStatus;
  ollamaProgress: DownloadProgress | null;
  modelProgress: DownloadProgress | null;
  isDownloadingOllama: boolean;
  isDownloadingModel: boolean;
  isRestartingOllama: boolean;
  showWelcome: boolean;
  updateStatus: UpdateStatus;
  currentVersion: string;
  availableModels: readonly VlModelInfo[];
  currentModel: string;
  installedModels: string[];
  onClose: () => void;
  onChooseFolder: () => void;
  onDownloadOllama: () => void;
  onDownloadModel: (model?: string) => void;
  onCancelModelDownload: () => void;
  onRestartOllama: () => void;
  onDeleteOllamaModel: () => void;
  onDeleteOllamaBinary: () => void;
  onSetCurrentModel: (model: string) => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
}) {
  const { theme: currentTheme, setTheme } = useTheme();

  const setupStep = !ollamaStatus.binaryInstalled
    ? 0
    : !ollamaStatus.modelInstalled
      ? 1
      : 2;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Settings"
      footer={null}
      width={600}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {showWelcome && (
          <Space
            orientation="vertical"
            size="middle"
            style={{ marginBottom: 16 }}
          >
            <Alert
              banner
              message="Welcome to Rune! Your library folder has been set to Documents/Rune."
              type="info"
            />
            <Steps
              size="small"
              current={setupStep}
              items={[
                { title: "Install Ollama" },
                { title: "Download Model" },
                { title: "Ready" },
              ]}
            />
          </Space>
        )}
        <Divider style={{ margin: 1 }} />
        {/* Library folder */}
        <Flex align="center" justify="space-between">
          <Text type="secondary" strong>
            Library
          </Text>
          <Button onClick={onChooseFolder} icon={<FolderOpenOutlined />}>
            {libraryPath || defaultPath}
          </Button>
        </Flex>

        <Divider style={{ margin: 1 }} />

        {/* Ollama Binary */}
        <OllamaBinarySetup
          status={ollamaStatus}
          ollamaProgress={ollamaProgress}
          isDownloadingOllama={isDownloadingOllama}
          isRestartingOllama={isRestartingOllama}
          onDownloadOllama={onDownloadOllama}
          onRestartOllama={onRestartOllama}
          onDeleteOllamaBinary={onDeleteOllamaBinary}
        />

        <Divider style={{ margin: 1 }} />

        {/* Models */}
        <OllamaModelSetup
          status={ollamaStatus}
          modelProgress={modelProgress}
          isDownloadingModel={isDownloadingModel}
          availableModels={availableModels}
          currentModel={currentModel}
          installedModels={installedModels}
          onDownloadModel={onDownloadModel}
          onCancelModelDownload={onCancelModelDownload}
          onDeleteOllamaModel={onDeleteOllamaModel}
          onSetCurrentModel={onSetCurrentModel}
        />

        <Divider style={{ margin: 1 }} />

        {/* Theme */}
        <Flex justify="space-between" align="center">
          <Text type="secondary" strong>
            Theme
          </Text>
          <Segmented
            value={currentTheme}
            onChange={(value) => setTheme(value as "system" | "light" | "dark")}
            options={[
              { label: "System", value: "system", icon: <LaptopOutlined /> },
              { label: "Light", value: "light", icon: <SunOutlined /> },
              { label: "Dark", value: "dark", icon: <MoonOutlined /> },
            ]}
          />
        </Flex>

        <Divider style={{ margin: 1 }} />

        {/* App Updates */}
        <Flex justify="space-between" align="center" gap={4}>
          <Text type="secondary" strong>
            Updates
          </Text>
          <AppUpdateSection
            updateStatus={updateStatus}
            currentVersion={currentVersion}
            onCheckForUpdates={onCheckForUpdates}
            onInstallUpdate={onInstallUpdate}
          />
        </Flex>
      </Space>

      {status && (
        <Alert message={status} type="error" style={{ marginTop: 16 }} />
      )}
    </Modal>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
  const { modal } = App.useApp();
  const { token } = theme.useToken();

  if (isDownloadingOllama && ollamaProgress) {
    return (
      <Flex align="center" justify="space-between">
        <Text type="secondary" strong>
          Ollama
        </Text>
        <Space>
          <LoadingOutlined spin />
          <Text type="secondary">
            {formatBytes(ollamaProgress.downloaded)} /{" "}
            {formatBytes(ollamaProgress.total)}
          </Text>
          <Progress percent={ollamaProgress.percent} size="small" />
        </Space>
      </Flex>
    );
  }

  if (!status.binaryInstalled) {
    return (
      <Flex align="center" justify="space-between">
        <Text type="secondary" strong>
          Ollama
        </Text>
        <Space size="small">
          <Text type="secondary">Not installed</Text>
          <Button
            onClick={onDownloadOllama}
            size="small"
            icon={<DownloadOutlined />}
          >
            Download
          </Button>
        </Space>
      </Flex>
    );
  }

  return (
    <Flex align="center" justify="space-between">
      <Space>
        <Text type="secondary" strong>
          Ollama
        </Text>
        {status.serverRunning && <Tag color="green">Running</Tag>}
      </Space>
      <Space size="small">
        <Tooltip title="Restart Ollama">
          <Button
            type="text"
            size="small"
            onClick={onRestartOllama}
            disabled={isRestartingOllama}
            icon={<ReloadOutlined spin={isRestartingOllama} />}
          />
        </Tooltip>
        <Popconfirm
          title="Delete Ollama?"
          description="This will remove the Ollama binary."
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            modal.confirm({
              title: "Confirm delete",
              content: "This action cannot be undone.",
              okText: "Delete",
              okType: "danger",
              cancelText: "Cancel",
              onOk: onDeleteOllamaBinary,
            });
          }}
        >
          <Tooltip title="Delete Ollama">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    </Flex>
  );
}

function OllamaModelSetup({
  status,
  modelProgress,
  isDownloadingModel,
  availableModels,
  currentModel,
  installedModels,
  onDownloadModel,
  onCancelModelDownload,
  onDeleteOllamaModel,
  onSetCurrentModel,
}: {
  status: OllamaStatus;
  modelProgress: DownloadProgress | null;
  isDownloadingModel: boolean;
  availableModels: readonly VlModelInfo[];
  currentModel: string;
  installedModels: string[];
  onDownloadModel: (model?: string) => void;
  onCancelModelDownload: () => void;
  onDeleteOllamaModel: () => void;
  onSetCurrentModel: (model: string) => void;
}) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();

  if (!status.binaryInstalled) {
    return (
      <Flex align="center" justify="space-between">
        <Text type="secondary" strong>
          Models
        </Text>
        <Text type="secondary">Install Ollama first</Text>
      </Flex>
    );
  }

  return (
    <VlModelList
      availableModels={availableModels}
      currentModel={currentModel}
      installedModels={installedModels}
      serverRunning={status.serverRunning}
      isDownloadingModel={isDownloadingModel}
      modelProgress={modelProgress}
      onDownloadModel={onDownloadModel}
      onCancelModelDownload={onCancelModelDownload}
      onSelectModel={onSetCurrentModel}
      onDeleteOllamaModel={onDeleteOllamaModel}
    />
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
    <Flex align="center" justify="space-between" gap={8}>
      <Flex align="center" gap={4}>
        <Text type="secondary">v{currentVersion || "..."}</Text>

        {isDownloaded && <Badge status="success" text="Update Ready" />}
        {isAvailable && <Badge status="processing" text="Update Available" />}
        {isNotAvailable && <Badge status="default" text="Up to date" />}
        {hasError && (
          <Tooltip title={updateStatus.error}>
            <Text type="danger">Update check failed</Text>
          </Tooltip>
        )}
      </Flex>

      <Flex align="center" gap={4}>
        {(isChecking || isDownloading) && (
          <Space size="small">
            <LoadingOutlined spin />
            <Text type="secondary">
              {isDownloading ? "Downloading..." : "Checking..."}
            </Text>
          </Space>
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
          <Tooltip title="Check again">
            <Button
              type="text"
              size="small"
              onClick={onCheckForUpdates}
              icon={<ReloadOutlined />}
            />
          </Tooltip>
        )}

        {hasError && (
          <Button size="small" onClick={onCheckForUpdates}>
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
      </Flex>
    </Flex>
  );
}

function VlModelList({
  availableModels,
  currentModel,
  installedModels,
  serverRunning,
  isDownloadingModel,
  modelProgress,
  onDownloadModel,
  onCancelModelDownload,
  onSelectModel,
  onDeleteOllamaModel,
}: {
  availableModels: readonly VlModelInfo[];
  currentModel: string;
  installedModels: string[];
  serverRunning: boolean;
  isDownloadingModel: boolean;
  modelProgress: DownloadProgress | null;
  onDownloadModel: (model: string) => void;
  onCancelModelDownload: () => void;
  onSelectModel: (model: string) => void;
  onDeleteOllamaModel: () => void;
}) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();

  // Helper to check if model is installed (matches with or without tag)
  const isModelInstalled = (modelName: string) => {
    return installedModels.some(
      (installed) =>
        installed === modelName || installed.startsWith(modelName + ":"),
    );
  };

  return (
    <Flex vertical gap={2} style={{ width: "100%" }}>
      <Text type="secondary" strong>
        Models
      </Text>
      {Array.from(availableModels).map((model) => {
        const installed = isModelInstalled(model.name);
        const isCurrent = currentModel === model.name;
        const isDownloading = isDownloadingModel && isCurrent;

        return (
          <Flex
            key={model.name}
            vertical
            style={{
              padding: token.paddingXS,
              borderRadius: token.borderRadiusSM,
              backgroundColor: isCurrent ? token.colorBgLayout : "transparent",
              cursor: isDownloading ? "not-allowed" : "pointer",
              opacity: isDownloading && !isCurrent ? 0.5 : 1,
            }}
            onClick={() => !isDownloading && onSelectModel(model.name)}
          >
            <Flex align="center" justify="space-between">
              <Space size="small">
                <Text>{model.displayName}</Text>
                {model.recommended && <Tag color="blue">⭐</Tag>}
                {installed && isCurrent && serverRunning && (
                  <Tag color="green">Active</Tag>
                )}
                {installed && <Tag color="default">Downloaded</Tag>}
                <Tag>{model.size}</Tag>
              </Space>
              <Space size={4}>
                {isDownloadingModel && isCurrent && modelProgress ? (
                  <Space size="small">
                    <LoadingOutlined spin />
                    <Text type="secondary">
                      {Math.round(modelProgress.percent)}%
                    </Text>
                    <Progress percent={modelProgress.percent} size="small" />
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelModelDownload();
                      }}
                    >
                      Stop
                    </Button>
                  </Space>
                ) : !installed && isCurrent ? (
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadModel(model.name);
                    }}
                  >
                    Download
                  </Button>
                ) : null}
                {installed && isCurrent && (
                  <Popconfirm
                    title="Delete model?"
                    description="This will remove the local models files."
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    onConfirm={onDeleteOllamaModel}
                  >
                    <Tooltip title="Delete model">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            </Flex>
            <Text type="secondary">{model.description}</Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
