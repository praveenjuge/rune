import { Empty, Flex, Spin, Typography } from "antd";
import { FileImageOutlined, SearchOutlined } from "@ant-design/icons";

export function LoadingState() {
  return (
    <Flex align="center" justify="center" style={{ padding: "80px 0" }}>
      <Spin />
    </Flex>
  );
}

export function EmptyState() {
  return (
    <Flex align="center" justify="center" style={{ padding: "80px 0" }}>
      <Empty
        image={<FileImageOutlined style={{ fontSize: 48 }} />}
        description={<Typography.Text type="secondary">No images yet</Typography.Text>}
      />
    </Flex>
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <Flex align="center" justify="center" style={{ padding: "80px 0" }}>
      <Empty
        image={<SearchOutlined style={{ fontSize: 48 }} />}
        description={<Typography.Text type="secondary">No results for "{query.trim()}"</Typography.Text>}
      />
    </Flex>
  );
}

export function LoadingMore() {
  return (
    <Flex align="center" justify="center" style={{ padding: "16px 0" }}>
      <Spin size="small" />
    </Flex>
  );
}
