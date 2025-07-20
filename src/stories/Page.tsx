import type { ReactNode } from "react";

interface PageProps {
	user?: {
		name: string;
	};
	onLogin?: () => void;
	onLogout?: () => void;
	onCreateAccount?: () => void;
	children?: ReactNode;
}

export const Page = ({
	user,
	onLogin,
	onLogout,
	onCreateAccount,
	children,
}: PageProps) => (
	<article className="min-h-screen bg-background">
		<section className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Welcome to Storybook</h1>
				<p className="mt-2 text-muted-foreground">
					This is a sample page component for Storybook.
				</p>
			</div>

			<div className="space-y-4">
				{user ? (
					<>
						<p>You are logged in as {user.name}</p>
						<button
							className="rounded bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90"
							onClick={onLogout}
							type="button"
						>
							Log out
						</button>
					</>
				) : (
					<div className="space-x-2">
						<button
							className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
							onClick={onLogin}
							type="button"
						>
							Log in
						</button>
						<button
							className="rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90"
							onClick={onCreateAccount}
							type="button"
						>
							Sign up
						</button>
					</div>
				)}
			</div>

			{children && <div className="mt-8">{children}</div>}
		</section>
	</article>
);
