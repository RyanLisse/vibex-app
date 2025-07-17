import { HeaderContent, type HeaderContentProps } from './HeaderContent'
import './header.css'

export type HeaderProps = HeaderContentProps

export const Header = ({ user, onLogin, onLogout, onCreateAccount }: HeaderProps) => (
  <header>
    <HeaderContent
      user={user}
      onLogin={onLogin}
      onLogout={onLogout}
      onCreateAccount={onCreateAccount}
    />
  </header>
)
