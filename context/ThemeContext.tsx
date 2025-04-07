import React, { createContext, useContext, ReactNode } from "react";

// Theme interface for type safety
interface Theme {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  pageBackground: string;
  textPrimary: string;
  textSecondary: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isLightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeProvider = ({
  children,
  theme,
  setTheme,
}: ThemeProviderProps) => {
  // Define light theme colors for comparison
  const lightThemeColors = {
    background: "#FFFFFF",
    text: "#121212",
  };

  const isLightMode = theme.background === lightThemeColors.background;

  const toggleTheme = () => {
    // This function will be implemented with actual light/dark themes
    // For now, it's a placeholder as the theme is managed at the layout level based on system settings
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isLightMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for accessing the theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
