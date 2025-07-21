"use client";

import type React from "react";

interface NavbarProps {
	title?: string;
	user?: User;
	onUserMenuClick?: () => void;
	onLogout?: () => void;
	className?: string;
	children?: React.ReactNode;
}

export default function Navbar({
	title = "Vibex App",
	user,
	onUserMenuClick,
	onLogout,
	className,
	children,
}: NavbarProps) {
	return (
		<nav className={`bg-white shadow-sm border-b ${className || ""}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center">
						<h1 className="text-xl font-semibold text-gray-900">{title}</h1>
					</div>
					<div className="flex items-center space-x-4">
						{children}
						{user && (
							<div className="flex items-center space-x-2">
								<span className="text-sm text-gray-700">
									{user.name || user.email}
								</span>
								{onUserMenuClick && (
									<button
										onClick={onUserMenuClick}
										className="text-sm text-blue-600 hover:text-blue-800"
									>
										Menu
									</button>
								)}
								{onLogout && (
									<button
										onClick={onLogout}
										className="text-sm text-red-600 hover:text-red-800"
									>
										Logout
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}

export { Navbar };
