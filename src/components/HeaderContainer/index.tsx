interface HeaderContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function HeaderContainer(props: HeaderContainerProps) {
  return (
    <div className="items-left flex flex-col gap-10">
      <div className="animate-fade-down space-y-3 text-blue-950 dark:text-gray-200">
        <h1 className="text-6xl font-bold">{props.title}</h1>
        <p className="text-lg">{props.description}</p>
      </div>
      <div className="animate-fade-right border-t border-gray-200 border-opacity-60 pt-10" />
      <div className="flex flex-col  text-blue-950 dark:text-gray-200">
        {props.children}
      </div>
    </div>
  );
}
