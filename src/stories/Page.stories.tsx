import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

// Import the Header component from the Header stories
const Header = ({ user, onLogin, onLogout, onCreateAccount }: any) => (
	<header className="flex items-center justify-between p-4 border-b bg-white">
		<div className="flex items-center space-x-4">
			<svg
				width="32"
				height="32"
				viewBox="0 0 32 32"
				xmlns="http://www.w3.org/2000/svg"
				className="text-blue-600"
			>
				<g fill="currentColor">
					<path d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0zm0 28C9.37 28 4 22.63 4 16S9.37 4 16 4s12 5.37 12 12-5.37 12-12 12z" />
					<path d="M16 8l4 8-4 8-4-8z" />
				</g>
			</svg>
			<h1 className="text-xl font-semibold">Acme</h1>
		</div>
		<div className="flex items-center space-x-4">
			{user ? (
				<>
					<span className="text-sm text-gray-600">
						Welcome, <b>{user.name}</b>!
					</span>
					<button
						className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
						onClick={onLogout}
					>
						Log out
					</button>
				</>
			) : (
				<>
					<button
						className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
						onClick={onLogin}
					>
						Log in
					</button>
					<button
						className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
						onClick={onCreateAccount}
					>
						Sign up
					</button>
				</>
			)}
		</div>
	</header>
);

const Page = ({ user, onLogin, onLogout, onCreateAccount }: any) => (
	<article className="min-h-screen bg-gray-50">
		<Header user={user} onLogin={onLogin} onLogout={onLogout} onCreateAccount={onCreateAccount} />
		<section className="max-w-4xl mx-auto p-8">
			<h2 className="text-3xl font-bold mb-6">Pages in Storybook</h2>
			<p className="text-lg text-gray-700 mb-4">
				We recommend building UIs with a{" "}
				<a
					href="https://componentdriven.org"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 hover:underline"
				>
					<strong>component-driven</strong>
				</a>{" "}
				process starting with atomic components and ending with pages.
			</p>
			<p className="text-lg text-gray-700 mb-6">
				Render pages with mock data. This makes it easy to build and review page states without
				needing to navigate to them in your app. Here are some handy patterns for managing page data
				in Storybook:
			</p>
			<ul className="list-disc pl-6 space-y-2 text-gray-700">
				<li>
					Use a higher-level connected component. Storybook helps you compose such data from the
					"args" of child component stories
				</li>
				<li>
					Assemble data in the page component from your services. You can mock these services out
					using Storybook.
				</li>
			</ul>
			<div className="mt-8 p-4 bg-blue-50 rounded-lg">
				<p className="text-blue-800">
					<strong>Tip:</strong> Get a guided tutorial on component-driven development at{" "}
					<a
						href="https://storybook.js.org/tutorials/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						Storybook tutorials
					</a>
					. Read more in the{" "}
					<a
						href="https://storybook.js.org/docs"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						docs
					</a>
					.
				</p>
			</div>
		</section>
	</article>
);

const meta: Meta<typeof Page> = {
	title: "Example/Page",
	component: Page,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		onLogin: fn(),
		onLogout: fn(),
		onCreateAccount: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
	args: {
		user: {
			name: "Jane Doe",
		},
	},
};

export const LoggedOut: Story = {
	args: {},
};
