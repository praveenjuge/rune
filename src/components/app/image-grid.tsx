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
              <span className="flex items-center gap-2">
                <ReloadOutlined className="h-4 w-4" />
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
            <div className="overflow-hidden rounded-md bg-card">
              <Image
                src={image.url}
                alt={image.originalName}
                preview={{
                  mask: "Click to preview",
                }}
                className="w-full"
                style={{ display: "block" }}
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
      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
        <LoadingOutlined className="h-3 w-3 animate-spin" />
        <span>Generating...</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
        <WarningOutlined className="h-3 w-3" />
        <span>Failed</span>
      </div>
    );
  }

  if (status === "complete" && tags) {
    return (
      <div className="bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground leading-relaxed">
        {tags}
      </div>
    );
  }

  return null;
}
