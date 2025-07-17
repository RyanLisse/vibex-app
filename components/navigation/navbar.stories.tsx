import type { Meta, StoryObj } from '@storybook/react'
import Navbar from './navbar'

const meta = {
  title: 'Components/Navigation/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main navigation bar component with theme toggle and user menu.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithBackground: Story = {
  render: () => (
    <div className="bg-background">
      <Navbar />
    </div>
  ),
}
