import Link from "next/link";
import ThemeSwitch from "../ThemeSwitch";

export default function HeaderNav() {
  return (
    <div className="blur-40 fixed left-3 right-3 top-3 z-50 mx-auto hidden h-14 max-w-6xl justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 px-4 text-blue-950 backdrop-blur-md  dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200 dark:hover:bg-opacity-30 md:flex">
      <div className="flex items-center space-x-6">
        <Link href="/">
          <picture>
            <img src="logo.svg" alt="Logo" className="h-7 w-auto" />
          </picture>
        </Link>
        <nav className="hidden space-x-8 md:flex">
          <Link href="/" className="hover:text-blue-800">
            Home
          </Link>
          <Link href="/about" className="hover:text-blue-800">
            About
          </Link>
          <Link href="/tools" className="hover:text-blue-800">
            Tools
          </Link>
          <Link href="/projects" className="hover:text-blue-800">
            Projects
          </Link>
          <Link href="/blog" className="hover:text-blue-800">
            Blog
          </Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4 opacity-70">
        <a href="https://github.com/EdSDR" target="_blank">
          <picture>
            <img
              src="github.svg"
              alt="GitHub"
              className="h-5 w-auto hover:opacity-90"
            />
          </picture>
        </a>
        <a href="https://www.linkedin.com/in/edsdr/" target="_blank">
          <picture>
            <img
              src="linkedin.svg"
              alt="LinkedIn"
              className="h-5 w-auto hover:opacity-90"
            />
          </picture>
        </a>
        <div className="h-6 w-px bg-blue-950 dark:bg-gray-200" />
        <ThemeSwitch />
      </div>
    </div>
  );
}
