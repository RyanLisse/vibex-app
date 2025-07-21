"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import {
	useSentryAction,
	withSentryInstrumentation,
} from "@/components/sentry/SentryInstrumentation";

/**
 * Example component with Sentry instrumentation
 */
function ExampleComponent() {
	const [count, setCount] = useState(0);
	const sentryAction = useSentryAction();

	const handleClick = () => {
		sentryAction("button_click", () => {
			setCount((prev) => prev + 1);
		});
	};

	return (
		<div>
			<h2>Instrumented Component</h2>
			<p>Count: {count}</p>
			<button onClick={handleClick}>Increment</button>
		</div>
	);
}

export default withSentryInstrumentation(ExampleComponent);
