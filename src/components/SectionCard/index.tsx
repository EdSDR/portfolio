interface SectionCardProps {
  title: string;
  description: string;
  image: string;
}

export default function SectionCard(props: SectionCardProps) {
  return (
    <div className="flex cursor-pointer justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-40 px-6 text-blue-950 transition duration-500 hover:bg-opacity-60 sm:justify-around sm:py-0">
      <div className="flex flex-col justify-center gap-1">
        <h3 className="text-3xl font-bold text-blue-600">{props.title}</h3>
        <div className="text-lg">{props.description}</div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={props.image} alt="Logo" className="h-auto w-28 sm:w-44" />
    </div>
  );
}
