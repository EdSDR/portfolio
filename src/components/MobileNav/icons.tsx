"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface IconsProps {
  icon: string;
  pathname: string;
}

export default function Icons(props: IconsProps) {
  const pathname = usePathname();
  return (
    <Link href={props.pathname} className="hover:text-blue-800">
      <picture
        className={`flex rounded-2xl bg-blue-600 ${
          pathname === props.pathname ? "bg-opacity-10" : "bg-opacity-0"
        } p-2`}
      >
        <img
          src={
            pathname === props.pathname
              ? `icons/${props.icon}Solid.svg`
              : `icons/${props.icon}.svg`
          }
          alt={props.pathname}
          className="h-7 w-auto"
        />
      </picture>
    </Link>
  );
}
