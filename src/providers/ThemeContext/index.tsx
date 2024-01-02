"use client";

import React from "react";
import { Theme } from "~/types";

const ThemeContext = React.createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: Theme.light,
  toggleTheme: () => {
    return;
  },
});

export default function ThemeProvider({
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = React.useState(Theme.light);

  const toggleTheme = () => {
    const root = document.getElementsByTagName("html")[0];
    root?.classList.toggle(Theme.dark);
    if (root?.classList.contains(Theme.dark)) {
      setTheme(Theme.dark);
      document.cookie = `theme=${Theme.dark}`;
    } else {
      setTheme(Theme.light);
      document.cookie = `theme=${Theme.light}`;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
