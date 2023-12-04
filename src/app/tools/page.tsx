import HeaderContainer from "~/components/HeaderContainer";
import ToolCard from "~/components/ToolCard";

export default function TechStackPage() {
  return (
    <HeaderContainer title="Tools" description="The dev tools I use.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 md:gap-5">
        <ToolCard title="Figma" icon="logos/figma.png" category="Design" />
        <ToolCard title="Tailwind" icon="logos/tailwind.png" category="CSS" />
        <ToolCard
          title="TypeScript"
          icon="logos/typescript.png"
          category="Language"
        />
        <ToolCard
          title="Next.js"
          icon="logos/next.png"
          category="Web Framework"
        />
      </div>
    </HeaderContainer>
  );
}
