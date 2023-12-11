"use client";

import React from "react";
import { Theme } from "~/types";
import { gradient } from "./Gradient";
import { useTheme } from "~/providers/ThemeContext";

export default function Background() {
  const { theme } = useTheme();

  React.useEffect(() => {
    gradient.initGradient(
      theme === Theme.light ? "#gradient-canvas" : "#dark-gradient-canvas",
    );
  }, [theme]);

  return (
    <canvas
      id={theme === Theme.light ? "gradient-canvas" : "dark-gradient-canvas"}
      data-transition-in
      className={`fixed left-0 top-0 z-[-1] h-full w-full ${
        theme === Theme.light ? "bg-blue-200" : "bg-gray-900"
      }`}
    />
  );
}
