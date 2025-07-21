// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
Sentry.init({
	dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: false,

	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 1.0,

	// Enable experimental features
	_experiments: {
		enableLogs: true,
	},

	// Environment
	environment: process.env.NODE_ENV,

	// BeforeSend callback for filtering/modifying events
	beforeSend(event, hint) {
		// Filter out certain errors in production
		if (process.env.NODE_ENV === "production") {
			const error = hint.originalException;

			// Don't send events for expected errors
			if (error && typeof error === "object" && "code" in error) {
				const errorCode = (error as any).code;
				if (["NEXT_NOT_FOUND", "NEXT_REDIRECT"].includes(errorCode)) {
					return null;
				}
			}
		}

		return event;
	},
});
