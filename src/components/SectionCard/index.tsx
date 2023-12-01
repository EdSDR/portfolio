interface SectionCardProps {
  title: string;
  description: string;
  image: string;
}

export default function SectionCard(props: SectionCardProps) {
  return (
    <div className="align-center flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-40 px-8 py-4 text-blue-950 transition duration-500 hover:bg-opacity-60 sm:flex-row">
      <div className="flex flex-col justify-center gap-2">
        <h3 className="text-3xl font-bold text-blue-600">{props.title}</h3>
        <div className="text-lg">{props.description}</div>
      </div>
      <picture>
        <img src={props.image} alt="Logo" className="h-44 w-auto pt-4" />
      </picture>
    </div>
  );
}
