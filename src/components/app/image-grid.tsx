import { Image, Masonry, Dropdown, Flex, Typography, Tag, Spin, theme } from "antd";
import { WarningOutlined, ReloadOutlined } from "@ant-design/icons";
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
  const { token } = theme.useToken();

  const getContextMenuItems = (image: LibraryImage): MenuProps["items"] => [
    ...(image.aiTagStatus === "failed"
      ? [
          {
            key: "retry",
            label: (
              <span style={{ display: "flex", alignItems: "center", gap: token.paddingXS }}>
                <ReloadOutlined />
                Retry AI Tags
              </span>
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
      onClick: () => onDelete(image.id),
    },
  ];

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
            <div style={{ overflow: "hidden", borderRadius: token.borderRadius, backgroundColor: token.colorBgContainer }}>
              <Image
                src={image.url}
                alt={image.originalName}
                preview={{
                  mask: "Click to preview",
                }}
                style={{ width: "100%", display: "block" }}
              />
              <ImageCaption
                status={image.aiTagStatus}
                tags={image.aiTags}
              />
            </div>
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
  const { token } = theme.useToken();

  if (status === "pending") {
    return null;
  }

  if (status === "generating") {
    return (
      <Flex align="center" gap={token.paddingXS} style={{ backgroundColor: token.colorFillQuaternary, padding: `${token.paddingXS}px ${token.paddingXS}px` }}>
        <Spin size="small" />
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Generating...</Typography.Text>
      </Flex>
    );
  }

  if (status === "failed") {
    return (
      <Flex align="center" gap={token.paddingXS} style={{ backgroundColor: token.colorErrorBg, padding: `${token.paddingXS}px ${token.paddingXS}px` }}>
        <WarningOutlined style={{ color: token.colorError }} />
        <Typography.Text type="danger" style={{ fontSize: token.fontSizeSM }}>Failed</Typography.Text>
      </Flex>
    );
  }

  if (status === "complete" && tags) {
    return (
      <Flex wrap gap={4} style={{ backgroundColor: token.colorFillQuaternary, padding: `${token.paddingXS}px ${token.paddingXS}px` }}>
        {tags.split(", ").map((tag) => (
          <Tag key={tag} style={{ margin: 0 }}>{tag}</Tag>
        ))}
      </Flex>
    );
  }

  return null;
}
