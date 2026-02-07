import { Spin } from "antd";
import { FileImageOutlined, SearchOutlined } from "@ant-design/icons";

export function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <Spin />
    </div>
  );
}

export function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "80px 0", textAlign: "center" }}>
      <FileImageOutlined style={{ fontSize: 48, color: "color-mix(in srgb, var(--rune-muted-foreground) 50%, transparent)" }} />
      <p style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>No images yet</p>
    </div>
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "80px 0", textAlign: "center" }}>
      <SearchOutlined style={{ fontSize: 48, color: "color-mix(in srgb, var(--rune-muted-foreground) 50%, transparent)" }} />
      <p style={{ fontSize: 14, color: "var(--rune-muted-foreground)" }}>No results for "{query.trim()}"</p>
    </div>
  );
}

export function LoadingMore() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0" }}>
      <Spin size="small" />
    </div>
  );
}
