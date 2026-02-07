import { Button, Flex, Input, Layout, Tooltip, theme } from "antd";
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
  const { token } = theme.useToken();

  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (target.tagName === "INPUT") return;
    onFocusSearch();
  };

  return (
    <Layout.Header
      style={{
        height: "auto",
        lineHeight: "normal",
        padding: `${token.paddingXS}px ${token.padding}px`,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
      onClick={handleHeaderClick}
    >
      <Flex flex={1} align="center" gap={token.paddingXS}>
        <Input.Search
          ref={searchInputRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search images"
          allowClear
          style={{ minWidth: 0, flex: 1 }}
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
      </Flex>
    </Layout.Header>
  );
}
