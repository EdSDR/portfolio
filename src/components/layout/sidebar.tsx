import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Lucide outline icons (matching the reference's @lucide set).
const lucideProps = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.5,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
} as const;

const SOCIAL_ICONS: Record<string, ReactNode> = {
	github: (
		<svg {...lucideProps}>
			<title>GitHub</title>
			<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
			<path d="M9 18c-4.51 2-5-2-7-2" />
		</svg>
	),
	email: (
		<svg {...lucideProps}>
			<title>Email</title>
			<rect width="20" height="16" x="2" y="4" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	),
	linkedin: (
		<svg {...lucideProps}>
			<title>LinkedIn</title>
			<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
			<rect width="4" height="12" x="2" y="9" />
			<circle cx="4" cy="4" r="2" />
		</svg>
	),
};

const profile = {
	name: "Ed Castro",
	role: "Software Engineer & Frontend Specialist",
	avatar: "https://github.com/EdSDR.png",
	available: true,
	availableText: "Available for new projects",
	bio: "Passionate software developer with 5+ years of experience creating fun and innovative ways to interact with complex software and visualizations.",
	buttons: {
		call: { text: "Book a call", url: "mailto:contact@edsdr.com" },
		chat: { text: "Chat", url: "mailto:contact@edsdr.com" },
	},
	experience: [
		{
			company: "Renlabs",
			year: "2024 — Present",
			note: "Lead a 5-person web team; built a Torus→Base token bridge that has moved $5M+ with zero security incidents.",
		},
		{
			company: "Nitro Academy",
			year: "2024",
			note: "Sole developer — took an edtech platform from zero to production serving 10,000+ students in 5 months.",
		},
		{
			company: "FutureMe",
			year: "2022 — 2024",
			note: "Grew a gamified career-discovery platform to 5,000+ students; led the Next.js Pages → App Router rewrite.",
		},
	],
	socials: [
		{ label: "GitHub", url: "https://github.com/EdSDR", icon: "github" },
		{
			label: "LinkedIn",
			url: "https://linkedin.com/in/edsdr",
			icon: "linkedin",
		},
		{ label: "Email", url: "mailto:contact@edsdr.com", icon: "email" },
	],
	footer:
		"Based in Rio de Janeiro, Brazil. Working remotely with teams across the world.",
	copyright: "© 2026 Ed Castro. All rights reserved.",
};

export function Sidebar() {
	return (
		<aside className="flex w-full shrink-0 flex-col gap-8 px-4 py-8 lg:sticky lg:top-0 lg:h-screen lg:max-w-sm lg:justify-between">
			<div className="flex w-full flex-col gap-6">
				<div className="flex items-center gap-3">
					<img
						src={profile.avatar}
						alt={profile.name}
						width={32}
						height={32}
						className="size-8 rounded-full"
					/>
					<div className="flex items-center gap-2">
						<span className="relative flex size-2">
							<span
								className={cn(
									"absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
									profile.available ? "bg-emerald-400" : "bg-red-400",
								)}
							/>
							<span
								className={cn(
									"relative inline-flex size-2 rounded-full",
									profile.available ? "bg-emerald-500" : "bg-red-500",
								)}
							/>
						</span>
						<span className="font-medium text-muted-foreground text-xs">
							{profile.availableText}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<h1 className="text-balance font-semibold text-2xl">
						{profile.name}
					</h1>
					<h2 className="text-balance font-normal text-2xl text-muted-foreground">
						{profile.role}
					</h2>
					<p className="text-muted-foreground text-sm">{profile.bio}</p>
				</div>

				<div className="flex items-center gap-3">
					<a
						href={profile.buttons.call.url}
						className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 font-medium text-background text-sm transition-transform active:scale-[0.97]"
					>
						{profile.buttons.call.text}
					</a>
					<a
						href={profile.buttons.chat.url}
						className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 font-medium text-sm transition-transform active:scale-[0.97] hover:bg-muted"
					>
						{profile.buttons.chat.text}
					</a>
				</div>

				<div className="flex w-full flex-col gap-1">
					{profile.experience.map((exp) => (
						<div
							key={exp.company}
							className="group relative flex cursor-default flex-col rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-muted"
						>
							<div className="flex w-full items-center justify-between">
								<h3 className="font-medium text-sm">{exp.company}</h3>
								<span className="text-muted-foreground text-xs">
									{exp.year}
								</span>
							</div>
							<div className="max-h-20 overflow-hidden transition-all duration-300 ease-in-out lg:max-h-0 lg:group-hover:max-h-20">
								<p className="pt-2 text-muted-foreground text-xs leading-relaxed">
									{exp.note}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			<footer className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-4">
					{profile.socials.map((s) => (
						<a
							key={s.label}
							href={s.url}
							target="_blank"
							rel="noreferrer"
							aria-label={s.label}
							className="[&>svg]:size-4.5 text-muted-foreground transition-colors hover:text-foreground"
						>
							{SOCIAL_ICONS[s.icon]}
						</a>
					))}
				</div>
				<p className="text-muted-foreground text-xs leading-relaxed">
					{profile.footer}
				</p>
				<p className="text-muted-foreground text-xs">{profile.copyright}</p>
			</footer>
		</aside>
	);
}
