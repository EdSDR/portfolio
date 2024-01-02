import Link from "next/link";
import SvgImage from "../SvgImage";

export default function FooterNav() {
  return (
    <footer className="mt-36 border-t border-gray-200 border-opacity-60 py-12 pb-32 text-blue-950 dark:text-gray-200 md:pb-12">
      <div className="flex justify-center">
        <div className="container flex max-w-6xl flex-col-reverse justify-between gap-10 md:flex-row">
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <SvgImage src="logo" height="16" href="/" />
              <p>Thanks for visiting ッ</p>
            </div>
            <p className="text-sm">© 2023 Ed Castro. All Rights Reserved.</p>
          </div>
          <div className="flex flex-col gap-10 md:flex-row md:gap-36">
            <div className="hidden flex-col gap-6 md:flex">
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
              <div className="flex flex-row gap-10 md:flex-col md:gap-3">
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
