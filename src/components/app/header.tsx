import { Button, Input } from "antd";
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
    <header style={{ flexShrink: 0, backgroundColor: "var(--rune-background)", borderBottom: "1px solid var(--rune-border)" }}>
      <div style={{ width: "100%", padding: "8px 16px" }} onClick={handleHeaderClick}>
        <HeaderActions
          search={search}
          onSearch={onSearch}
          onAdd={onAdd}
          onOpenSettings={onOpenSettings}
          isImporting={isImporting}
          searchInputRef={searchInputRef}
        />
      </div>
    </header>
  );
}

function HeaderActions({
  search,
  onSearch,
  onAdd,
  onOpenSettings,
  isImporting,
  searchInputRef,
}: {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onOpenSettings: () => void;
  isImporting: boolean;
  searchInputRef: React.RefObject<any>;
}) {
  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 8 }}>
      <Input
        ref={searchInputRef}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search"
        aria-label="Search images"
        allowClear
        style={{ minWidth: 0, flex: 1 }}
      />
      <Button
        onClick={onAdd}
        disabled={isImporting}
        icon={isImporting ? <LoadingOutlined spin /> : <PlusOutlined />}
      />
      <Button
        onClick={onOpenSettings}
        icon={<SettingOutlined />}
      />
    </div>
  );
}
