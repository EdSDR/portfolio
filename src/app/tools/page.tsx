import ToolCard from "~/components/ToolCard";
import HeaderContainer from "~/components/HeaderContainer";

export default function TechStackPage() {
  return (
    <HeaderContainer title="Tools" description="The dev tools I use.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 md:gap-5">
        <ToolCard title="Figma" icon="figma" category="Design" />
        <ToolCard title="Tailwind" icon="tailwind" category="CSS" />
        <ToolCard title="TypeScript" icon="typescript" category="Language" />
        <ToolCard title="Next.js" icon="next" category="Web Framework" />
      </div>
    </HeaderContainer>
  );
}
