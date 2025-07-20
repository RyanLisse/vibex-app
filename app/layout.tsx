import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import "./streaming.css";

import Container from "@/app/container";
import { AppProviders } from "@/components/providers/app-providers";
import { getLogger } from "@/lib/logging/safe-wrapper";

const logger = getLogger("app-layout");

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "VibeX | An open-source OpenAI Codex clone",
	description:
		"Codex UI is a modern, open-source, and fully customizable UI for OpenAI Codex.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              // Global error handler for unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && event.reason.message) {
                  const message = event.reason.message;
                  if (message.includes('ReadableStream') ||
                      message.includes('cancel') ||
                      message.includes('locked stream') ||
                      message.includes('WebSocket') ||
                      message.includes('Authentication failed')) {
                    // Log to server via API endpoint for proper Winston logging
                    fetch('/api/logging/client-error', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        level: 'warn',
                        message: 'Unhandled stream/connection error prevented',
                        error: message,
                        timestamp: new Date().toISOString()
                      })
                    }).catch(() => {}); // Silently fail if logging fails
                    event.preventDefault();
                    return;
                  }
                }
                // Log other unhandled rejections for debugging
                fetch('/api/logging/client-error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: 'warn',
                    message: 'Unhandled promise rejection',
                    error: event.reason,
                    timestamp: new Date().toISOString()
                  })
                }).catch(() => {}); // Silently fail if logging fails
              });

              // Global error handler for general errors
              window.addEventListener('error', function(event) {
                if (event.error && event.error.message) {
                  const message = event.error.message;
                  if (message.includes('ReadableStream') ||
                      message.includes('cancel') ||
                      message.includes('locked stream')) {
                    fetch('/api/logging/client-error', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        level: 'warn',
                        message: 'Stream error handled',
                        error: message,
                        timestamp: new Date().toISOString()
                      })
                    }).catch(() => {}); // Silently fail if logging fails
                    event.preventDefault();
                    return;
                  }
                }
              });
            `,
					}}
				/>
				<AppProviders>
					<Container>{children}</Container>
				</AppProviders>
			</body>
		</html>
	);
}
