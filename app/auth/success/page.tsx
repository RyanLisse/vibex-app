"use client";

import React from "react";

export default function AuthSuccessPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border p-6">
				<div className="text-center">
					<div className="mb-4">
						<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
							<svg
								className="w-8 h-8 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful</h1>
					<p className="text-gray-600 mb-6">
						You have been successfully authenticated. You can now access your account.
					</p>
					<button
						className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
						onClick={() => (window.location.href = "/")}
					>
						Continue to Dashboard
					</button>
				</div>
			</div>
		</div>
	);
}
