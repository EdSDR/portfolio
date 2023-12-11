interface ToolCardProps {
  title: string;
  icon: string;
  category: string;
}

export default function ToolCard(props: ToolCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-12 rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 p-6 pt-16 text-blue-950 transition duration-500 hover:bg-opacity-50 dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200 dark:hover:bg-opacity-30">
      <picture className="rounded-2xl bg-white bg-opacity-40 p-4 transition duration-300 ease-in-out hover:scale-105 dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200">
        <img
          src={`logos/${props.icon}.png`}
          alt={props.title}
          className="h-auto w-16"
        />
      </picture>
      <div className="flex w-full flex-row justify-between">
        <p>{props.title}</p>
        <p className="rounded-2xl border border-blue-500 px-2 text-blue-500">
          {props.category}
        </p>
      </div>
    </div>
  );
}
