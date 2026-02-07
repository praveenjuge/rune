import { App, Card, Image, Masonry, Dropdown, Space, Typography, Tag, Spin } from "antd";
import { DeleteOutlined, WarningOutlined, ReloadOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { AiTagStatus, LibraryImage } from "@/shared/library";

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
  const { modal } = App.useApp();

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
          { type: "divider" as const },
        ]
      : []),
    {
      key: "delete",
      label: deletingId === image.id ? "Deleting…" : "Delete",
      danger: true,
      disabled: deletingId === image.id,
      onClick: () => handleDelete(image),
    },
  ];

  const getCardActions = (image: LibraryImage) => {
    const actions: React.ReactNode[] = [];
    if (image.aiTagStatus === "failed") {
      actions.push(<ReloadOutlined key="retry" onClick={() => onRetryTagging(image.id)} />);
    }
    actions.push(
      <DeleteOutlined
        key="delete"
        onClick={() => handleDelete(image)}
      />
    );
    return actions;
  };

  return (
    <PreviewGroup>
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
          <Dropdown menu={{ items: getContextMenuItems(image) }} trigger={["contextMenu"]}>
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
              actions={getCardActions(image)}
            >
              <ImageCaption
                status={image.aiTagStatus}
                tags={image.aiTags}
              />
            </Card>
          </Dropdown>
        )}
      />
    </PreviewGroup>
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
      <Tag color="error" icon={<WarningOutlined />}>Failed</Tag>
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
