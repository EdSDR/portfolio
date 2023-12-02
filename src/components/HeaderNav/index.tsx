import Link from "next/link";

export default function HeaderNav() {
  return (
    <div className="blur-40 fixed inset-x-0 left-3 right-3 top-3 z-50 mx-auto flex h-14 max-w-6xl justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 px-4 text-blue-950 backdrop-blur-md">
      <div className="flex items-center space-x-6">
        <picture>
          <img src="logo.svg" alt="Logo" className="h-7 w-auto" />
        </picture>
        <nav className="hidden space-x-6 md:flex">
          <Link href="/" className="hover:text-blue-800">
            Home
          </Link>
          <Link href="/about" className="hover:text-blue-800">
            About
          </Link>
          <Link href="/tech-stack" className="hover:text-blue-800">
            Tech Stack
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
      </div>
    </div>
  );
}
