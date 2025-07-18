import type { ReactNode } from 'react'

interface PageProps {
  user?: {
    name: string
  }
  onLogin?: () => void
  onLogout?: () => void
  onCreateAccount?: () => void
  children?: ReactNode
}

export const Page = ({ user, onLogin, onLogout, onCreateAccount, children }: PageProps) => (
  <article className="min-h-screen bg-background">
    <section className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to Storybook</h1>
        <p className="text-muted-foreground mt-2">This is a sample page component for Storybook.</p>
      </div>

      <div className="space-y-4">
        {user ? (
          <>
            <p>You are logged in as {user.name}</p>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Log out
            </button>
          </>
        ) : (
          <div className="space-x-2">
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={onCreateAccount}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Sign up
            </button>
          </div>
        )}
      </div>

      {children && <div className="mt-8">{children}</div>}
    </section>
  </article>
)
