import "~/styles/globals.css";
import { Theme } from "~/types";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import HeaderNav from "~/components/HeaderNav";
import FooterNav from "~/components/FooterNav";
import MobileNav from "~/components/MobileNav";
import Background from "~/components/Background";
import ThemeProvider from "~/providers/ThemeContext";

export const metadata = {
  title: "EdSDR",
  description: "A Place to showcase my work",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme =
    cookies().get("theme")?.value === "dark" ? Theme.dark : Theme.light;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-blue-300 px-3 pt-12 md:pt-44">
        <ThemeProvider initialTheme={theme}>
          <HeaderNav />
          <MobileNav />
          <main className="flex justify-center">
            <div className="container flex max-w-6xl flex-col">{children}</div>
          </main>
          <FooterNav />
          <Background />
        </ThemeProvider>
      </body>
    </html>
  );
}
