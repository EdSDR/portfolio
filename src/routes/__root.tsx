import geistLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ogImageUrl } from "@/components/canvas/scenes/registry";
import { AppShell } from "@/components/layout/app-shell";
import { projects } from "@/content";
import { SITE_TITLE, SITE_URL } from "@/lib/site";
import appCss from "../styles.css?url";

const SITE_DESCRIPTION =
	"Portfolio of Ed (EdSDR) — project heroes rendered as live React Three Fiber scenes, built with TanStack Start.";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: SITE_TITLE },
			{ name: "description", content: SITE_DESCRIPTION },
			// Defaults; /work/$slug overrides title/description/image/url.
			{ property: "og:site_name", content: "Ed Castro" },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: SITE_TITLE },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/` },
			...(projects[0]
				? [{ property: "og:image", content: ogImageUrl(projects[0].slug) }]
				: []),
			{ name: "twitter:card", content: "summary_large_image" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			// The latin Geist face is needed for first paint; fetch it with the CSS.
			{
				rel: "preload",
				href: geistLatin,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
		],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
