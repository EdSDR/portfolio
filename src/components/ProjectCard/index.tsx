import Link from "next/link";

interface ProjectCardProps {
  image: string;
  title: string;
  description: string;
  websitePath: string;
  repositoryPath: string;
}

export default function ProjectCard(props: ProjectCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 px-12 text-blue-950 transition duration-500 hover:bg-opacity-40 sm:flex-row">
      <div className="flex flex-col justify-between gap-3 py-12">
        <div className="flex flex-col justify-start gap-3">
          <h3 className="text-3xl font-bold text-blue-600">{props.title}</h3>
          <p className="max-w-lg text-lg">{props.description}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:gap-12">
          <Link
            href={props.websitePath}
            target="_blank"
            className="hover:text-blue-600"
          >
            Visit Site →
          </Link>
          <Link
            href={props.repositoryPath}
            target="_blank"
            className="hover:text-blue-600"
          >
            View GitHub Repository →
          </Link>
        </div>
      </div>
      <div>
        <picture>
          <img
            src={props.image}
            alt="Phone"
            className="h-auto w-72 pt-6 transition duration-300 ease-in-out hover:-translate-y-2 hover:scale-105"
          />
        </picture>
      </div>
    </div>
  );
}
