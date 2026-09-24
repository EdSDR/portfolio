import { useEffect, useState } from "react";

/** True only after the first client-side commit — used to defer WebGL to the client. */
export function useMounted(): boolean {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	return mounted;
}
