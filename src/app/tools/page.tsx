import { toolsData } from "~/data";
import ToolCard from "~/components/ToolCard";
import HeaderContainer from "~/components/HeaderContainer";

export default function TechStackPage() {
  return (
    <HeaderContainer title="Tools" description="Some of the dev tools I use.">
      <div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 md:gap-5">
          {toolsData.map(({ icon, title, category }) => (
            <ToolCard
              key={title}
              icon={icon}
              title={title}
              category={category}
            />
          ))}
        </div>
      </div>
      <p className="pt-8">
        There are many more tools I use, but these are the ones I use the most.
      </p>
    </HeaderContainer>
  );
}
