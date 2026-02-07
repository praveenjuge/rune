import {
  App,
  Button,
  Badge,
  Card,
  Flex,
  Form,
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
import type { DownloadProgress, OllamaStatus, UpdateStatus } from "@/shared/library";

const { Text } = Typography;

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
  const { theme: currentTheme, setTheme } = useTheme();

  const setupStep = !ollamaStatus.binaryInstalled ? 0 : !ollamaStatus.modelInstalled ? 1 : 2;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Settings"
      onOk={onSave}
      okText="Save"
      confirmLoading={isSaving}
      width={480}
    >
      {showWelcome && (
        <Space direction="vertical" size="middle">
          <Alert
            banner
            message="Welcome to Rune! Your library folder has been set to Documents/Rune. Click Save to continue."
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

      <Form layout="vertical">
        <Form.Item label="Library folder">
          <Space.Compact block>
            <Input
              value={libraryPath || defaultPath}
              readOnly
            />
            <Tooltip title="Choose folder">
              <Button onClick={onChooseFolder} icon={<FolderOpenOutlined />} />
            </Tooltip>
          </Space.Compact>
        </Form.Item>

        <Form.Item label="Ollama Binary">
          <OllamaBinarySetup
            status={ollamaStatus}
            ollamaProgress={ollamaProgress}
            isDownloadingOllama={isDownloadingOllama}
            isRestartingOllama={isRestartingOllama}
            onDownloadOllama={onDownloadOllama}
            onRestartOllama={onRestartOllama}
            onDeleteOllamaBinary={onDeleteOllamaBinary}
          />
        </Form.Item>

        <Form.Item label="AI Model">
          <OllamaModelSetup
            status={ollamaStatus}
            modelProgress={modelProgress}
            isDownloadingModel={isDownloadingModel}
            onDownloadModel={onDownloadModel}
            onDeleteOllamaModel={onDeleteOllamaModel}
          />
        </Form.Item>

        <Form.Item label="Theme">
          <Segmented
            value={currentTheme}
            onChange={(value) => setTheme(value as "system" | "light" | "dark")}
            options={[
              { label: "System", value: "system", icon: <LaptopOutlined /> },
              { label: "Light", value: "light", icon: <SunOutlined /> },
              { label: "Dark", value: "dark", icon: <MoonOutlined /> },
            ]}
          />
        </Form.Item>

        <Form.Item label="App Updates" style={{ marginBottom: 0 }}>
          <AppUpdateSection
            updateStatus={updateStatus}
            currentVersion={currentVersion}
            onCheckForUpdates={onCheckForUpdates}
            onInstallUpdate={onInstallUpdate}
          />
        </Form.Item>
      </Form>

      {status && (
        <Alert message={status} type="error" />
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

  if (isDownloadingOllama && ollamaProgress) {
    return (
      <Card size="small">
        <Space>
          <LoadingOutlined spin />
          <Text type="secondary">
            {formatBytes(ollamaProgress.downloaded)} / {formatBytes(ollamaProgress.total)}
          </Text>
          <Progress percent={ollamaProgress.percent} size="small" />
        </Space>
      </Card>
    );
  }

  if (!status.binaryInstalled) {
    return (
      <Card size="small">
        <Flex align="center" justify="space-between">
          <Text type="secondary">Not installed</Text>
          <Button onClick={onDownloadOllama} size="small" icon={<DownloadOutlined />}>
            Download
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="small">
      <Flex align="center" justify="space-between">
        <Space>
          <CheckCircleOutlined style={{ color: "var(--ant-color-success)" }} />
          {status.serverRunning && <Badge status="processing" text="Running" />}
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
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      </Flex>
    </Card>
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
  const { modal } = App.useApp();

  if (!status.binaryInstalled) {
    return (
      <Card size="small">
        <Text type="secondary">Install Ollama first</Text>
      </Card>
    );
  }

  if (isDownloadingModel && modelProgress) {
    return (
      <Card size="small">
        <Space>
          <LoadingOutlined spin />
          <Text type="secondary">
            {formatBytes(modelProgress.downloaded)} / {formatBytes(modelProgress.total)}
          </Text>
          <Progress percent={modelProgress.percent} size="small" />
        </Space>
      </Card>
    );
  }

  if (!status.modelInstalled) {
    return (
      <Card size="small">
        <Flex align="center" justify="space-between">
          <Text type="secondary">Not installed</Text>
          <Button onClick={onDownloadModel} size="small" icon={<DownloadOutlined />}>
            Download
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="small">
      <Flex align="center" justify="space-between">
        <Space>
          <CheckCircleOutlined style={{ color: "var(--ant-color-success)" }} />
          {status.serverRunning && <Badge status="success" text="Ready" />}
        </Space>
        <Popconfirm
          title="Delete model?"
          description="This will remove the local AI model files."
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
              onOk: onDeleteOllamaModel,
            });
          }}
        >
          <Tooltip title="Delete model">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      </Flex>
    </Card>
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
    <Card size="small">
      <Flex align="center" justify="space-between">
        <Space>
          <Text type="secondary">v{currentVersion || "..."}</Text>

          {isDownloaded && <Badge status="success" text="Update Ready" />}
          {isAvailable && <Badge status="processing" text="Update Available" />}
          {isNotAvailable && <Badge status="default" text="Up to date" />}
          {hasError && (
            <Tooltip title={updateStatus.error}>
              <Text type="danger">Update check failed</Text>
            </Tooltip>
          )}
        </Space>

        <Space size="small">
          {(isChecking || isDownloading) && (
            <Space size="small">
              <LoadingOutlined spin />
              <Text type="secondary">
                {isDownloading ? "Downloading..." : "Checking..."}
              </Text>
            </Space>
          )}

          {updateStatus.state === "idle" && (
            <Button size="small" onClick={onCheckForUpdates} icon={<ReloadOutlined />}>
              Check
            </Button>
          )}

          {isNotAvailable && (
            <Tooltip title="Check again">
              <Button type="text" size="small" onClick={onCheckForUpdates} icon={<ReloadOutlined />} />
            </Tooltip>
          )}

          {hasError && (
            <Button size="small" onClick={onCheckForUpdates}>Retry</Button>
          )}

          {isDownloaded && (
            <Button type="primary" size="small" onClick={onInstallUpdate} icon={<ReloadOutlined />}>
              Restart & Update
            </Button>
          )}
        </Space>
      </Flex>
    </Card>
  );
}
