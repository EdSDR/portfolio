import { cn } from "@/lib/cn";

// Placeholder profile — edit freely. Structure mirrors the visual reference.
const profile = {
	name: "Ed",
	role: "Designer & Frontend Developer",
	avatar: "https://github.com/EdSDR.png",
	available: true,
	availableText: "Available for new projects",
	bio: "Frontend developer and designer building fast, tactile web experiences where interface and motion do the talking.",
	buttons: {
		call: { text: "Book a call", url: "mailto:contact@edsdr.com" },
		chat: { text: "Chat", url: "mailto:contact@edsdr.com" },
	},
	experience: [
		{
			company: "Vercel",
			year: "2022 — Present",
			note: "Design + frontend for digital products and design systems.",
		},
		{
			company: "Cloudflare",
			year: "2020 — 2022",
			note: "User-centered product design and web development.",
		},
		{
			company: "Stripe",
			year: "2018 — 2020",
			note: "Visual identity and web solutions across teams.",
		},
		{
			company: "GitHub",
			year: "2016 — 2018",
			note: "Corporate communications and digital assets.",
		},
	],
	socials: [
		{ label: "GitHub", url: "https://github.com/EdSDR" },
		{ label: "LinkedIn", url: "https://linkedin.com/in/edsdr" },
		{ label: "X", url: "https://x.com/edsdr" },
		{ label: "Email", url: "mailto:contact@edsdr.com" },
	],
	footer:
		"Based in Spain. Collaborating with teams worldwide to build exceptional digital experiences.",
	copyright: "© 2026 Ed. All rights reserved.",
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
				<div className="flex flex-wrap gap-x-4 gap-y-1">
					{profile.socials.map((s) => (
						<a
							key={s.label}
							href={s.url}
							target="_blank"
							rel="noreferrer"
							className="text-muted-foreground text-xs transition-colors hover:text-foreground"
						>
							{s.label}
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
