"use client";
import React from "react";
import { gradient } from "./Gradient";

function Background({ darkMode }: { darkMode?: boolean }) {
  React.useEffect(() => {
    gradient.initGradient(
      darkMode ? "#dark-gradient-canvas" : "#gradient-canvas",
    );
  }, [darkMode]);

  return (
    <canvas
      id={darkMode ? "dark-gradient-canvas" : "gradient-canvas"}
      data-transition-in
      className={`fixed left-0 top-0 z-[-1] h-full w-full ${
        darkMode ? "bg-gray-800" : "bg-blue-200"
      }`}
    />
  );
}

export default Background;
