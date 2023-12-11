import Link from "next/link";

interface SectionCardProps {
  path: string;
  title: string;
  description: string;
}

export default function SectionCard(props: SectionCardProps) {
  return (
    <Link
      href={props.path}
      className="flex cursor-pointer justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 px-6 text-blue-950 transition duration-500 hover:bg-opacity-50 dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200 dark:hover:bg-opacity-30 sm:justify-around sm:px-0"
    >
      <div className="flex flex-col justify-center gap-1">
        <h3 className="text-3xl font-bold text-blue-600">{props.title}</h3>
        <p className="text-lg">{props.description}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${props.path}.png`}
        alt="Section Card Image"
        className="h-auto w-28 transition duration-300 ease-in-out hover:scale-105 dark:opacity-60 sm:w-44"
      />
    </Link>
  );
}
