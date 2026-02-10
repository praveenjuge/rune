import {
  App,
  Card,
  Modal,
  Image,
  Masonry,
  Dropdown,
  Space,
  Typography,
  Tag,
  Spin,
} from "antd";
import {
  DownloadOutlined,
  WarningOutlined,
  ReloadOutlined,
  SyncOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { AiTagStatus, LibraryImage } from "@/shared/library";
import {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

const { PreviewGroup } = Image;

export function ImageGrid({
  images,
  deletingId,
  onDelete,
  onRetryTagging,
}: {
  images: LibraryImage[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onRetryTagging: (id: string) => void;
}) {
  const { modal, message } = App.useApp();
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const selectedImage = useMemo(
    () =>
      selectedImageId ? images.find((image) => image.id === selectedImageId) ?? null : null,
    [images, selectedImageId],
  );

  const selectedTags = useMemo(
    () => parseAiTags(selectedImage?.aiTags ?? null),
    [selectedImage?.aiTags],
  );

  const handleDelete = (image: LibraryImage) => {
    modal.confirm({
      title: "Delete image?",
      content: `"${image.originalName}" will be removed from your library.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => onDelete(image.id),
    });
  };

  const getContextMenuItems = (image: LibraryImage): MenuProps["items"] => [
    {
      key: "regenerate",
      label: (
        <Space size="small">
          <SyncOutlined />
          Regenerate AI Tags
        </Space>
      ),
      onClick: () => onRetryTagging(image.id),
    },
    ...(image.aiTagStatus === "failed"
      ? [
          {
            key: "retry",
            label: (
              <Space size="small">
                <ReloadOutlined />
                Retry AI Tags
              </Space>
            ),
            onClick: () => onRetryTagging(image.id),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "delete",
      label: deletingId === image.id ? "Deleting…" : "Delete",
      danger: true,
      disabled: deletingId === image.id,
      onClick: () => handleDelete(image),
    },
  ];

  const handleOpenTagModal = (image: LibraryImage) => {
    setSelectedImageId(image.id);
    setIsTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setIsTagModalOpen(false);
  };

  const handleDownloadImage = async (image: LibraryImage) => {
    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error("Failed to fetch image.");
      }

      const imageBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(imageBlob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = image.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      message.error("Unable to download image.");
    }
  };

  const renderPreviewActions = (originalNode: ReactElement, current: number) => {
    const image = images[current];
    if (!image) {
      return originalNode;
    }

    if (!isValidElement(originalNode)) {
      return originalNode;
    }

    const originalChildren = Children.toArray(
      (originalNode.props as { children?: ReactNode }).children,
    );
    const existingActionClassName = originalChildren.reduce<string | undefined>(
      (className, child) => {
        if (className || !isValidElement(child)) {
          return className;
        }

        const childClassName = (child.props as { className?: string }).className;
        return childClassName?.includes("actions-action")
          ? childClassName
          : className;
      },
      undefined,
    );
    const actionBaseClassName = existingActionClassName
      ?.split(" ")
      .find((className) => className.endsWith("-actions-action"));
    const fallbackActionStyle = actionBaseClassName
      ? undefined
      : { display: "flex", padding: 8, cursor: "pointer" };
    const handleActionKeyDown =
      (action: () => void) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          action();
        }
      };

    return cloneElement(
      originalNode,
      undefined,
      ...originalChildren,
      <div
        key="download-image-action"
        className={actionBaseClassName}
        style={fallbackActionStyle}
        role="button"
        tabIndex={0}
        aria-label="Download image"
        onClick={() => void handleDownloadImage(image)}
        onKeyDown={handleActionKeyDown(() => void handleDownloadImage(image))}
      >
        <DownloadOutlined />
      </div>,
      <div
        key="manage-tags-action"
        className={actionBaseClassName}
        style={fallbackActionStyle}
        role="button"
        tabIndex={0}
        aria-label="Manage tags"
        onClick={() => handleOpenTagModal(image)}
        onKeyDown={handleActionKeyDown(() => handleOpenTagModal(image))}
      >
        <TagsOutlined />
      </div>,
    );
  };

  return (
    <>
      <PreviewGroup
        preview={{
          actionsRender: (originalNode, info) =>
            renderPreviewActions(originalNode, info.current),
        }}
      >
        <Masonry
          columns={{
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
            xl: 5,
            xxl: 6,
          }}
          gutter={4}
          items={images}
          itemRender={(image) => (
            <Dropdown
              menu={{ items: getContextMenuItems(image) }}
              trigger={["contextMenu"]}
            >
              <Card
                size="small"
                hoverable
                cover={
                  <Image
                    src={image.url}
                    alt={image.originalName}
                    preview={{ mask: "Click to preview" }}
                  />
                }
              >
                <ImageCaption status={image.aiTagStatus} tags={image.aiTags} />
              </Card>
            </Dropdown>
          )}
        />
      </PreviewGroup>

      <Modal
        open={isTagModalOpen}
        title={selectedImage ? `Manage Tags · ${selectedImage.originalName}` : "Manage Tags"}
        onCancel={handleCloseTagModal}
        footer={null}
        zIndex={2200}
      >
        {selectedTags.length > 0 ? (
          <Space wrap size={[4, 8]}>
            {selectedTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">
            No AI-generated tags available for this image yet.
          </Typography.Text>
        )}
      </Modal>
    </>
  );
}

type ImageCaptionProps = {
  status: AiTagStatus;
  tags: string | null;
};

function ImageCaption({ status, tags }: ImageCaptionProps) {
  if (status === "pending") {
    return null;
  }

  if (status === "generating") {
    return (
      <Space size="small">
        <Spin size="small" />
        <Typography.Text type="secondary">Generating...</Typography.Text>
      </Space>
    );
  }

  if (status === "failed") {
    return (
      <Tag color="error" icon={<WarningOutlined />}>
        Failed
      </Tag>
    );
  }

  if (status === "complete" && tags) {
    return (
      <Space wrap size={[4, 4]}>
        {tags.split(", ").map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>
    );
  }

  return null;
}

function parseAiTags(tags: string | null): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => Boolean(tag));
}
