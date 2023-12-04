import { projectCardData } from "~/data";
import ProjectCard from "~/components/ProjectCard";
import HeaderContainer from "~/components/HeaderContainer";
import Link from "next/link";

export default function ProjectsPage() {
  return (
    <HeaderContainer
      title="Projects"
      description="Projects and ideas I’ve worked on."
    >
      <div className="space-y-5">
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
        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 p-12 text-blue-950 transition duration-500 hover:bg-opacity-40">
          <picture>
            <img src="sparkles.svg" alt="Sparkles" className="h-auto w-14" />
          </picture>
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold">YOUR PROJECT GOES HERE</h2>
            <p>Let’s turn your idea into a visual reality</p>
          </div>
          <Link
            href="mailto:contact@edsdr.com?subject=Hi, Let's work together"
            className="rounded-md bg-blue-950 px-8 py-4 text-white transition duration-500 hover:bg-blue-900"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </HeaderContainer>
  );
}
