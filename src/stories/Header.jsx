import PropTypes from "prop-types";

import { HeaderContent } from "@/src/stories/HeaderContent";
import "./header.css";

export const Header = ({ user, onLogin, onLogout, onCreateAccount }) => (
	<header>
		<HeaderContent
			onCreateAccount={onCreateAccount}
			onLogin={onLogin}
			onLogout={onLogout}
			user={user}
		/>
	</header>
);

Header.propTypes = {
	user: PropTypes.shape({
		name: PropTypes.string.isRequired,
	}),
	onLogin: PropTypes.func.isRequired,
	onLogout: PropTypes.func.isRequired,
	onCreateAccount: PropTypes.func.isRequired,
};

Header.defaultProps = {
	user: null,
};
