"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Sentry Feedback Widget Component
 *
 * This component initializes the Sentry feedback widget that allows users
 * to report issues directly from the application.
 */
export function SentryFeedback() {
	useEffect(() => {
		// Initialize the feedback widget
		const feedback = Sentry.getFeedback();

		if (!feedback) {
			// Create feedback integration if it doesn't exist
			Sentry.init({
				integrations: [
					Sentry.feedbackIntegration({
						// Customization options
						colorScheme: "auto", // 'light', 'dark', or 'auto'
						showBranding: false,
						showName: true,
						showEmail: true,
						isNameRequired: false,
						isEmailRequired: true,

						// Custom button text
						buttonLabel: "Report an Issue",
						submitButtonLabel: "Send Report",
						cancelButtonLabel: "Cancel",

						// Custom messages
						formTitle: "Report an Issue",
						nameLabel: "Name",
						namePlaceholder: "Your name (optional)",
						emailLabel: "Email",
						emailPlaceholder: "your.email@example.com",
						messageLabel: "Description",
						messagePlaceholder: "Please describe the issue you're experiencing...",
						successMessageText: "Thank you for your feedback! We'll look into this issue.",

						// Trigger options
						autoInject: true, // Automatically inject the widget
						showTrigger: "always", // 'always', 'never', or custom logic

						// Theme customization
						themeLight: {
							background: "#ffffff",
							backgroundHover: "#f6f6f7",
							foreground: "#2b2233",
							error: "#e1567c",
							success: "#268d75",
							border: "#d8d8d9",
							boxShadow: "0px 4px 24px 0px rgba(43, 34, 51, 0.12)",
						},
						themeDark: {
							background: "#1c1c1c",
							backgroundHover: "#2c2c2c",
							foreground: "#f2f2f2",
							error: "#f55459",
							success: "#2da98c",
							border: "#363636",
							boxShadow: "0px 4px 24px 0px rgba(0, 0, 0, 0.4)",
						},

						// Callback functions
						onFormOpen: () => {
							// Track when feedback form is opened
							Sentry.addBreadcrumb({
								message: "User opened feedback form",
								category: "feedback",
								level: "info",
							});
						},
						onFormClose: () => {
							// Track when feedback form is closed
							Sentry.addBreadcrumb({
								message: "User closed feedback form",
								category: "feedback",
								level: "info",
							});
						},
						onSubmitSuccess: () => {
							// Track successful submission
							Sentry.addBreadcrumb({
								message: "User submitted feedback successfully",
								category: "feedback",
								level: "info",
							});
						},
						onSubmitError: (error: Error) => {
							// Track submission errors
							Sentry.captureException(error, {
								tags: {
									type: "feedback_submission_error",
								},
							});
						},
					}),
				],
			});
		}
	}, []);

	// The widget is auto-injected, so we don't need to render anything
	return null;
}

/**
 * Programmatically open the feedback form
 */
export function openFeedbackForm() {
	const feedback = Sentry.getFeedback();
	if (feedback) {
		feedback.openDialog();
	}
}

/**
 * Programmatically close the feedback form
 */
export function closeFeedbackForm() {
	const feedback = Sentry.getFeedback();
	if (feedback) {
		feedback.closeDialog();
	}
}

/**
 * Custom feedback button component that can be placed anywhere
 */
export function FeedbackButton({
	className = "",
	children = "Report Issue",
}: {
	className?: string;
	children?: React.ReactNode;
}) {
	const handleClick = () => {
		openFeedbackForm();

		// Track button click
		Sentry.addBreadcrumb({
			message: "User clicked custom feedback button",
			category: "feedback",
			level: "info",
		});
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className={`inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${className}`}
		>
			<svg
				className="h-4 w-4"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.5}
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
				/>
			</svg>
			{children}
		</button>
	);
}

/**
 * Hook to check if feedback is available
 */
export function useFeedback() {
	const feedback = Sentry.getFeedback();
	return {
		isAvailable: !!feedback,
		open: openFeedbackForm,
		close: closeFeedbackForm,
	};
}
