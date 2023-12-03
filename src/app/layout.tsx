import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import HeaderNav from "~/components/HeaderNav";
import FooterNav from "~/components/FooterNav";
import Background from "~/components/Background";

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
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-blue-300 px-3 pt-44">
        <HeaderNav />
        <main className="flex justify-center">
          <div className="container flex max-w-6xl flex-col">{children}</div>
        </main>
        <FooterNav />
        <Background />
      </body>
    </html>
  );
}
