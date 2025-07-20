	HeaderContent,
	type HeaderContentProps,
} from "@/src/stories/HeaderContent";

export type HeaderProps = HeaderContentProps;

export const Header = ({
	user,
	onLogin,
	onLogout,
	onCreateAccount,
}: HeaderProps) => (
	<header>
		<HeaderContent
			onCreateAccount={onCreateAccount}
			onLogin={onLogin}
			onLogout={onLogout}
			user={user}
		/>
	</header>
);
