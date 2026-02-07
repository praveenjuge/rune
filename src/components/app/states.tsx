import { Result, Skeleton, Spin } from "antd";
import { FileImageOutlined, SearchOutlined } from "@ant-design/icons";

export function LoadingState() {
  return <Result icon={<Skeleton.Image active />} subTitle="Loading images..." />;
}

export function EmptyState() {
  return (
    <Result
      icon={<FileImageOutlined />}
      subTitle="No images yet"
    />
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <Result
      icon={<SearchOutlined />}
      subTitle={`No results for "${query.trim()}"`}
    />
  );
}

export function LoadingMore() {
  return <Result icon={<Spin size="small" />} />;
}
