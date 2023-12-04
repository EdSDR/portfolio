import Link from "next/link";
import HeaderContainer from "~/components/HeaderContainer";

export default function AboutPage() {
  return (
    <HeaderContainer title="About me" description="Who I am and what I do.">
      <div className="flex flex-col-reverse gap-16 md:flex-row">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h2 className="font-bold">WHO I AM</h2>
            <p className="text-lg">
              I always thought that my biggest dream was to become a commercial
              pilot, but since my first contact with programming, a greater
              desire grew within me, the desire to develop whatever my
              imagination allows. Since then, I have been learning to make this
              dream a reality.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-bold">WHAT I DO</h2>
            <p className="text-lg">
              Currently I’m working as a Software Engineer at a cool startup in
              Brazil called{" "}
              <Link
                href="https://www.futureme.tech/"
                target="_blank"
                className="underline hover:text-blue-600"
              >
                FutureMe
              </Link>
              , where I’m helping to build a platform that helps students to
              choose the best career path.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-bold">WHAT I DID</h2>
            <p className="text-lg">
              I’ve been working as a Software Engineer since 2020, and I’ve
              worked with a lot of different technologies and languages, such as
              TypeScript, Next.js, React, Tailwind and many others.
            </p>
          </div>
        </div>
        <div className="flex min-w-fit flex-col items-center gap-4">
          <picture>
            <img
              src="me.png"
              alt="About"
              className="max-w-xs rounded-2xl border border-white border-opacity-40 opacity-80 transition duration-300 ease-in-out hover:opacity-90"
            />
          </picture>
          <div className="hidden md:flex">
            <Link
              href="mailto:contact@edsdr.com?subject=Hi, Let's work together"
              className="rounded-2xl bg-white bg-opacity-30 px-12 py-4 text-center text-blue-950 transition duration-500 hover:bg-opacity-60"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </HeaderContainer>
  );
}
