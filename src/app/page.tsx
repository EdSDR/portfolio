import Link from "next/link";
import SectionCard from "~/components/SectionCard";
import ProjectCard from "~/components/ProjectCard";
import { projectCardData, sectionCardData } from "~/data";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-28">
      <div className="items-left flex flex-col gap-8">
        <h1 className="text-6xl font-extrabold text-blue-950">
          Hi, I’m <span className="text-blue-600">Ed</span>.
        </h1>
        <p className="max-w-2xl text-lg text-blue-950">
          Self-taught <b>Full Stack</b> Developer and <b>UI/UX</b> designer with
          a deep interest in building web applications that solve real-world
          problems.
        </p>
        <div className="flex gap-3">
          <Link
            target="_blank"
            href="https://read.cv/ed.sdr"
            className="rounded-md bg-blue-950 px-8 py-4 text-white transition duration-500 hover:bg-blue-900"
          >
            Resume
          </Link>
          <Link
            href="mailto:contact@edsdr.com?subject=Hi, Let's work together"
            className="rounded-md bg-white bg-opacity-30 px-8 py-4 text-blue-950 transition duration-500 hover:bg-opacity-60"
          >
            Get in touch
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <h3 className="text-4xl font-bold text-blue-950">Get to know me</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-5">
          {sectionCardData.map((card) => (
            <SectionCard
              key={card.title}
              path={card.path}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>
      <div className="items-left flex flex-col justify-between gap-6">
        <h3 className="text-4xl font-bold text-blue-950">Highlighted Work</h3>
        {projectCardData.map((card) => (
          <ProjectCard
            key={card.title}
            image={card.image}
            title={card.title}
            description={card.description}
            websitePath={card.websitePath}
            repositoryPath={card.repositoryPath}
          />
        ))}
      </div>
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
        <div className="flex flex-col gap-3">
          <h3 className="text-4xl font-bold text-blue-950">
            Let’s work together
          </h3>
          <p className="max-w-lg text-lg text-blue-950">
            Want to discuss an opportunity to create something great? I’m ready
            when you are.
          </p>
        </div>
        <Link
          href="mailto:contact@edsdr.com?subject=Hi, Let's work together"
          className="rounded-md bg-gradient-to-t from-blue-900 to-blue-700 px-10 py-4 text-white transition duration-500 hover:bg-gradient-to-t hover:from-blue-800 hover:to-blue-600"
        >
          Get in touch
        </Link>
      </div>
    </div>
  );
}
