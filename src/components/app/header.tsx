import { Button } from "antd";
import { LoadingOutlined, PlusOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";

const searchInputClassName =
  "h-10 w-full rounded-md border-0 bg-transparent pr-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

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
  searchInputRef: React.RefObject<HTMLInputElement>;
}) {
  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (target.tagName === "INPUT") return;
    onFocusSearch();
  };

  return (
    <header className="shrink-0 bg-background border-b">
      <div className="w-full px-4 py-2" onClick={handleHeaderClick}>
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
  searchInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative flex min-w-0 flex-1 items-center">
        <SearchOutlined className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search images"
          className={`${searchInputClassName} min-w-0 flex-1`}
        />
      </div>
      <Button
        onClick={onAdd}
        disabled={isImporting}
        className="shrink-0"
        icon={isImporting ? <LoadingOutlined className="h-4 w-4 animate-spin" /> : <PlusOutlined className="h-4 w-4" />}
      />
      <Button
        onClick={onOpenSettings}
        className="shrink-0"
        icon={<SettingOutlined className="h-4 w-4" />}
      />
    </div>
  );
}
