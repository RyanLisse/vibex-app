"use client";

import { useRef, useEffect, useCallback } from "react";

interface UseAutoScrollOptions {
	enabled?: boolean;
	behavior?: ScrollBehavior;
	offset?: number;
}

export function useAutoScroll<T extends HTMLElement>({
	enabled = true,
	behavior = "smooth",
	offset = 0,
}: UseAutoScrollOptions = {}) {
	const ref = useRef<T>(null);

	const scrollToBottom = useCallback(() => {
		if (!ref.current || !enabled) return;

		const element = ref.current;
		const targetScroll = element.scrollHeight - element.clientHeight - offset;

		element.scrollTo({
			top: targetScroll,
			behavior,
		});
	}, [enabled, behavior, offset]);

	const scrollToTop = useCallback(() => {
		if (!ref.current || !enabled) return;

		ref.current.scrollTo({
			top: 0,
			behavior,
		});
	}, [enabled, behavior]);

	useEffect(() => {
		// Auto scroll to bottom when content changes
		if (!enabled) return;

		const observer = new MutationObserver(() => {
			scrollToBottom();
		});

		if (ref.current) {
			observer.observe(ref.current, {
				childList: true,
				subtree: true,
				attributes: true,
			});
		}

		return () => observer.disconnect();
	}, [enabled, scrollToBottom]);

	return {
		ref,
		scrollToBottom,
		scrollToTop,
	};
}
