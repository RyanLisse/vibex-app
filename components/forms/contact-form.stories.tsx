import type { Meta, StoryObj } from '@storybook/react'
import { ContactForm } from './contact-form'

const meta = {
  title: 'Components/Forms/ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A contact form component with validation and submission handling.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ContactForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithInitialValues: Story = {
  render: () => (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg border">
      <ContactForm />
    </div>
  ),
}