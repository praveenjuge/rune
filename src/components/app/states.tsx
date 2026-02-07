import { Empty, Skeleton, Spin } from "antd";
import { FileImageOutlined, SearchOutlined } from "@ant-design/icons";

export function LoadingState() {
  return <Empty description="Loading images..." image={<Skeleton.Image active />} />;
}

export function EmptyState() {
  return <Empty description="No images yet" image={<FileImageOutlined style={{ fontSize: 48 }} />} />;
}

export function EmptySearchState({ query }: { query: string }) {
  return <Empty description={`No results for "${query.trim()}"`} image={<SearchOutlined style={{ fontSize: 48 }} />} />;
}

export function LoadingMore() {
  return <Empty description={null} image={<Spin size="small" />} />;
}
