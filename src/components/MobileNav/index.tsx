import Icons from "./icons";
import { redirectData } from "~/data";

export default function MobileNav() {
  return (
    <div className="blur-40 fixed bottom-3 left-3 right-3 z-50 mx-auto flex h-20 items-center justify-between rounded-2xl border border-white border-opacity-40 bg-white bg-opacity-30 px-4 text-blue-950 backdrop-blur-md dark:border-gray-700 dark:bg-black dark:bg-opacity-20 dark:text-gray-200 md:hidden">
      {redirectData.map((redirect) => (
        <Icons
          key={redirect.path}
          icon={redirect.icon}
          pathname={redirect.path}
        />
      ))}
    </div>
  );
}
