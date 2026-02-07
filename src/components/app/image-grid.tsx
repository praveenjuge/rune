import { Image, Masonry, Dropdown } from "antd";
import { WarningOutlined, LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
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
  const getContextMenuItems = (image: LibraryImage): MenuProps["items"] => [
    ...(image.aiTagStatus === "failed"
      ? [
          {
            key: "retry",
            label: (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <div style={{ overflow: "hidden", borderRadius: 6, backgroundColor: "var(--rune-card)" }}>
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
  if (status === "pending") {
    return null;
  }

  if (status === "generating") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)", padding: "6px 8px", fontSize: 12, color: "var(--rune-muted-foreground)" }}>
        <LoadingOutlined spin />
        <span>Generating...</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "color-mix(in srgb, var(--rune-destructive) 10%, transparent)", padding: "6px 8px", fontSize: 12, color: "var(--rune-destructive)" }}>
        <WarningOutlined />
        <span>Failed</span>
      </div>
    );
  }

  if (status === "complete" && tags) {
    return (
      <div style={{ backgroundColor: "color-mix(in srgb, var(--rune-muted) 100%, transparent)", padding: "6px 8px", fontSize: 12, color: "var(--rune-muted-foreground)", lineHeight: 1.6 }}>
        {tags}
      </div>
    );
  }

  return null;
}
