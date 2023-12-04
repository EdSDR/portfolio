import Link from "next/link";

export default function FooterNav() {
  return (
    <footer className="mt-36 border-t border-gray-200 border-opacity-60 py-12 text-blue-950">
      <div className="flex justify-center">
        <div className="container flex max-w-6xl flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <picture>
                <img src="logo.svg" alt="Logo" className="h-16 w-auto" />
              </picture>
              <p>Thanks for visiting ッ</p>
            </div>
            <p className="text-sm">© 2023 Ed Castro. All Rights Reserved.</p>
          </div>
          <div className="hidden gap-36 md:flex">
            <div className="flex flex-col gap-6">
              <div className="font-bold">Links</div>
              <div className="flex flex-col gap-3">
                <Link href="/" className="hover:text-blue-600">
                  Home
                </Link>
                <Link href="/about" className="hover:text-blue-600">
                  About
                </Link>
                <Link href="/tools" className="hover:text-blue-600">
                  Tools
                </Link>
                <Link href="/projects" className="hover:text-blue-600">
                  Projects
                </Link>
                <Link href="/blog" className="hover:text-blue-600">
                  Blog
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="font-bold">Socials</div>
              <div className="flex flex-col gap-3">
                <Link
                  href="mailto:contact@edsdr.com?subject=Hi, Let's work together"
                  className="hover:text-blue-600"
                >
                  Email
                </Link>
                <Link
                  href="https://www.linkedin.com/in/edsdr/"
                  target="_blank"
                  className="hover:text-blue-600"
                >
                  LinkedIn
                </Link>
                <Link
                  href="https://github.com/EdSDR"
                  target="_blank"
                  className="hover:text-blue-600"
                >
                  GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
