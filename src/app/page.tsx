import Background from "~/components/Background";
import SectionCard from "~/components/SectionCard";
import { sectionCardData } from "~/data";

export default function HomePage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="container flex max-w-6xl flex-col gap-36 p-3">
        <div className="items-left container flex max-w-6xl flex-col gap-10">
          <h1 className="text-6xl font-extrabold text-blue-950">
            Hi, I’m <span className="text-blue-600">Ed</span>.
          </h1>
          <p className="max-w-2xl text-lg text-blue-950">
            Self-taught <b>Full Stack</b> Developer and <b>UI/UX</b> designer
            with a deep interest in building web applications that solve
            real-world problems.
          </p>
          <div className="flex gap-3">
            <button className=" rounded-md bg-blue-950 px-8 py-4 text-white transition duration-500 hover:bg-blue-900">
              Resume
            </button>
            <button className="rounded-md bg-white bg-opacity-40 px-8 py-4 text-blue-950 transition duration-500 hover:bg-opacity-70">
              Get in touch
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <h3 className="text-4xl font-bold text-blue-950">Get to know me</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3">
            {sectionCardData.map((card) => (
              <SectionCard
                key={card.title}
                title={card.title}
                description={card.description}
                image={card.image}
              />
            ))}
          </div>
        </div>
      </div>
      <Background />
    </main>
  );
}
