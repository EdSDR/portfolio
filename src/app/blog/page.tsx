import HeaderContainer from "~/components/HeaderContainer";

export default function BlogPage() {
  return (
    <HeaderContainer
      title="Blog"
      description="My throughts, ideas and reflections."
    >
      <div className="space-y-5">
        <div className="flex animate-fade-up flex-col  items-center justify-center gap-6 rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 p-12 text-blue-950 transition duration-500 hover:bg-opacity-40 dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200 dark:hover:bg-opacity-30">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold">Well...</h2>
            <p> Looks like I haven’t written anything yet.</p>
          </div>
        </div>
      </div>
    </HeaderContainer>
  );
}
