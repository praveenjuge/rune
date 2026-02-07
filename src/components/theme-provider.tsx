import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConfigProvider, theme } from "antd";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const LIGHT_THEME = {
  token: {
    colorBgBase: "#ffffff",
    colorText: "rgba(0, 0, 0, 0.9)",
    colorBorder: "#d9d9d9",
    borderRadius: 6,
  },
};

const DARK_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: "#141414",
    colorText: "rgba(255, 255, 255, 0.85)",
    colorBorder: "#424242",
    borderRadius: 6,
  },
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      root.classList.remove("light", "dark");

      const shouldBeDark =
        theme === "system" ? media.matches : theme === "dark";

      root.classList.add(shouldBeDark ? "dark" : "light");
      setIsDark(shouldBeDark);
    };

    applyTheme();

    if (theme !== "system") {
      return;
    }

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme);
      setThemeState(nextTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      <ConfigProvider theme={isDark ? DARK_THEME : LIGHT_THEME}>
        {children}
      </ConfigProvider>
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
