"use client";

import Link from "next/link";
import { Theme } from "~/types";
import { useTheme } from "~/providers/ThemeContext";

export default function SvgImage({
  src,
  href,
  height,
  target,
}: {
  src: string;
  href?: string;
  height: string;
  target?: string;
}) {
  const { theme } = useTheme();

  return (
    <Link href={href ?? "/"} target={target ?? ""}>
      <picture>
        <img
          alt="Image"
          className={`h-${height} w-auto hover:opacity-90`}
          src={theme === Theme.light ? `${src}.svg` : `${src}-dark.svg`}
        />
      </picture>
    </Link>
  );
}
