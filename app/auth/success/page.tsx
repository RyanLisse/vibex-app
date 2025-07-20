"use client";

import { useEffect } from "react";

export default function AuthSuccessPage() {
	useEffect(() => {
		// Close the popup and notify the parent window
		if (window.opener) {
			window.opener.postMessage({ type: "GITHUB_AUTH_SUCCESS" }, "*");
			window.close();
		} else {
			// If not in a popup, redirect to home
			window.location.href = "/";
		}
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 font-bold text-2xl">Authentication Successful!</h1>
				<p className="text-muted-foreground">
					This window will close automatically...
				</p>
			</div>
		</div>
	);
}
