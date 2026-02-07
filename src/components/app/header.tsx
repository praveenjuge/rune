import { Button, Input, Layout, Space, Tooltip } from "antd";
import { LoadingOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";

export function Header({
  search,
  onSearch,
  onAdd,
  onOpenSettings,
  isImporting,
  onFocusSearch,
  searchInputRef,
}: {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onOpenSettings: () => void;
  isImporting: boolean;
  onFocusSearch: () => void;
  searchInputRef: React.RefObject<any>;
}) {
  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (target.tagName === "INPUT") return;
    onFocusSearch();
  };

  return (
    <Layout.Header onClick={handleHeaderClick}>
      <Space.Compact block>
        <Input.Search
          ref={searchInputRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search images"
          allowClear
        />
        <Tooltip title="Add images">
          <Button
            onClick={onAdd}
            disabled={isImporting}
            icon={isImporting ? <LoadingOutlined spin /> : <PlusOutlined />}
          />
        </Tooltip>
        <Tooltip title="Settings">
          <Button
            onClick={onOpenSettings}
            icon={<SettingOutlined />}
          />
        </Tooltip>
      </Space.Compact>
    </Layout.Header>
  );
}
