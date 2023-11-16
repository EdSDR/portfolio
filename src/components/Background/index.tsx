"use client";
import React from "react";
import { gradient } from "./Gradient";

function Background() {
  React.useEffect(() => {
    gradient.initGradient("#gradient-canvas");
  }, []);

  return (
    <canvas
      id="gradient-canvas"
      data-transition-in
      className="fixed left-0 top-0 z-[-1] h-full w-full"
    />
  );
}

export default Background;
