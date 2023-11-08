export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-ellipsis bg-gradient-to-b from-[#085078] to-[#85D8CE]">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          EdSDR <span className="text-[hsl(45,46%,5%)]">Portfolio</span>
        </h1>
        <div className="grid grid-cols-1  gap-2 sm:grid-cols-1 md:gap-8">
          <div className="flex max-w-lg flex-col gap-4 rounded-md bg-white/10 p-4 text-white hover:bg-white/20">
            <h3 className="text-2xl font-bold">WIP</h3>
            <div className="text-lg">
              This project is still in development. Please check back later. If
              you have any questions, please contact me.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
