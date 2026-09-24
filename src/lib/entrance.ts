/**
 * Tracks whether the page-load entrance cascade has already played, so cards
 * re-appearing after an open/close don't replay their staggered entrance.
 */
let entered = false;

export const hasEnteredOnce = (): boolean => entered;
export const markEntered = (): void => {
	entered = true;
};
