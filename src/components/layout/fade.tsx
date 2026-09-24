/** Soft blur/fade strips at the top and bottom of the viewport. */
export function Fade() {
	return (
		<>
			<div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-background to-transparent" />
			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-background to-transparent" />
		</>
	);
}
