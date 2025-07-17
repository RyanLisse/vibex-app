import React from 'react'

import PropTypes from 'prop-types'

import { HeaderContent } from './HeaderContent'
import './header.css'

export const Header = ({ user, onLogin, onLogout, onCreateAccount }) => (
  <header>
    <HeaderContent
      user={user}
      onLogin={onLogin}
      onLogout={onLogout}
      onCreateAccount={onCreateAccount}
    />
  </header>
)

Header.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }),
  onLogin: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  onCreateAccount: PropTypes.func.isRequired,
}

Header.defaultProps = {
  user: null,
}
