import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

// Placeholder Header component for the stories
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
          <path d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0zm0 28C9.37 28 4 22.63 4 16S9.37 4 16 4s12 5.37 12 12-5.37 12-12 12z"/>
          <path d="M16 8l4 8-4 8-4-8z"/>
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

const meta: Meta<typeof Header> = {
  title: 'Example/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
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
      name: 'Jane Doe',
    },
  },
};

export const LoggedOut: Story = {};