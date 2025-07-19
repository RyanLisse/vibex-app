import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import {
  AIMessage,
  AIMessageAvatar,
  AIMessageContent,
} from '@/src/components/ui/kibo-ui/ai/message'

// Mock the Avatar components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="avatar" {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, className, ...props }: any) => (
    <img src={src} alt={alt} className={className} data-testid="avatar-image" {...props} />
  ),
  AvatarFallback: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  ),
}))

// Mock the cn utility
vi.mock('/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

describe('AIMessage Components', () => {
  describe('AIMessage', () => {
    it('renders with user message styling', () => {
      render(
        <AIMessage from="user">
          <div>User message</div>
        </AIMessage>
      )

      const message = screen.getByText('User message').parentElement
      expect(message).toHaveClass('is-user')
    })

    it('renders with assistant message styling', () => {
      render(
        <AIMessage from="assistant">
          <div>Assistant message</div>
        </AIMessage>
      )

      const message = screen.getByText('Assistant message').parentElement
      expect(message).toHaveClass('is-assistant')
      expect(message).toHaveClass('flex-row-reverse')
    })

    it('applies custom className', () => {
      render(
        <AIMessage className="custom-message" from="user">
          <div>Message</div>
        </AIMessage>
      )

      const message = screen.getByText('Message').parentElement
      expect(message).toHaveClass('custom-message')
    })

    it('passes through additional props', () => {
      render(
        <AIMessage data-testid="custom-message" from="user" id="message-1">
          <div>Message</div>
        </AIMessage>
      )

      const message = screen.getByTestId('custom-message')
      expect(message).toHaveAttribute('id', 'message-1')
    })

    it('has proper base styling classes', () => {
      render(
        <AIMessage from="user">
          <div>Message</div>
        </AIMessage>
      )

      const message = screen.getByText('Message').parentElement
      expect(message).toHaveClass('group')
      expect(message).toHaveClass('flex')
      expect(message).toHaveClass('w-full')
      expect(message).toHaveClass('items-end')
      expect(message).toHaveClass('justify-end')
      expect(message).toHaveClass('gap-2')
      expect(message).toHaveClass('py-4')
    })

    it('renders multiple children', () => {
      render(
        <AIMessage from="assistant">
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </AIMessage>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })
  })

  describe('AIMessageContent', () => {
    it('renders with default styling', () => {
      render(
        <AIMessageContent>
          <div>Message content</div>
        </AIMessageContent>
      )

      const content = screen.getByText('Message content').parentElement?.parentElement
      expect(content).toHaveClass('flex')
      expect(content).toHaveClass('flex-col')
      expect(content).toHaveClass('gap-2')
      expect(content).toHaveClass('rounded-lg')
      expect(content).toHaveClass('px-4')
      expect(content).toHaveClass('py-3')
      expect(content).toHaveClass('text-sm')
    })

    it('applies muted background by default', () => {
      render(
        <AIMessageContent>
          <div>Content</div>
        </AIMessageContent>
      )

      const content = screen.getByText('Content').parentElement?.parentElement
      expect(content).toHaveClass('bg-muted')
      expect(content).toHaveClass('text-foreground')
    })

    it('applies user styling when in user message', () => {
      render(
        <AIMessage from="user">
          <AIMessageContent>
            <div>User content</div>
          </AIMessageContent>
        </AIMessage>
      )

      const content = screen.getByText('User content').parentElement?.parentElement
      expect(content).toHaveClass('group-[.is-user]:bg-primary')
      expect(content).toHaveClass('group-[.is-user]:text-primary-foreground')
    })

    it('applies custom className', () => {
      render(
        <AIMessageContent className="custom-content">
          <div>Content</div>
        </AIMessageContent>
      )

      const content = screen.getByText('Content').parentElement?.parentElement
      expect(content).toHaveClass('custom-content')
    })

    it('passes through additional props', () => {
      render(
        <AIMessageContent data-testid="message-content" id="content-1">
          <div>Content</div>
        </AIMessageContent>
      )

      const content = screen.getByTestId('message-content')
      expect(content).toHaveAttribute('id', 'content-1')
    })

    it('wraps content in is-user:dark div', () => {
      render(
        <AIMessageContent>
          <div>Content</div>
        </AIMessageContent>
      )

      const wrapper = screen.getByText('Content').parentElement
      expect(wrapper).toHaveClass('is-user:dark')
    })

    it('handles multiple content elements', () => {
      render(
        <AIMessageContent>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <div>Div content</div>
        </AIMessageContent>
      )

      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
      expect(screen.getByText('Div content')).toBeInTheDocument()
    })

    it('handles text content', () => {
      render(<AIMessageContent>Plain text content</AIMessageContent>)

      expect(screen.getByText('Plain text content')).toBeInTheDocument()
    })
  })

  describe('AIMessageAvatar', () => {
    it('renders with required props', () => {
      render(<AIMessageAvatar name="John Doe" src="/avatar.jpg" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('size-8')

      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('src', '/avatar.jpg')
      expect(image).toHaveAttribute('alt', '')

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('JO')
    })

    it('renders without name', () => {
      render(<AIMessageAvatar src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('ME')
    })

    it('handles empty name', () => {
      render(<AIMessageAvatar name="" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('ME')
    })

    it('handles single character name', () => {
      render(<AIMessageAvatar name="A" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('A')
    })

    it('takes first two characters of name', () => {
      render(<AIMessageAvatar name="Assistant" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('AS')
    })

    it('applies custom className', () => {
      render(<AIMessageAvatar className="custom-avatar" name="Test" src="/avatar.jpg" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('custom-avatar')
    })

    it('passes through additional props', () => {
      render(
        <AIMessageAvatar data-testid="custom-avatar" id="avatar-1" name="Test" src="/avatar.jpg" />
      )

      const avatar = screen.getByTestId('custom-avatar')
      expect(avatar).toHaveAttribute('id', 'avatar-1')
    })

    it('has proper image attributes', () => {
      render(<AIMessageAvatar name="Test" src="/avatar.jpg" />)

      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('alt', '')
      expect(image).toHaveClass('mt-0')
      expect(image).toHaveClass('mb-0')
    })
  })

  describe('Integration', () => {
    it('renders complete user message', () => {
      render(
        <AIMessage from="user">
          <AIMessageContent>
            <p>Hello, how are you?</p>
          </AIMessageContent>
          <AIMessageAvatar name="John Doe" src="/user.jpg" />
        </AIMessage>
      )

      const message = screen.getByText('Hello, how are you?').closest('.is-user')
      expect(message).toBeInTheDocument()

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toBeInTheDocument()

      const content = screen.getByText('Hello, how are you?').parentElement?.parentElement
      expect(content).toHaveClass('group-[.is-user]:bg-primary')
    })

    it('renders complete assistant message', () => {
      render(
        <AIMessage from="assistant">
          <AIMessageAvatar name="AI Assistant" src="/assistant.jpg" />
          <AIMessageContent>
            <p>I'm doing well, thank you!</p>
          </AIMessageContent>
        </AIMessage>
      )

      const message = screen.getByText("I'm doing well, thank you!").closest('.is-assistant')
      expect(message).toBeInTheDocument()
      expect(message).toHaveClass('flex-row-reverse')

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toBeInTheDocument()

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('AI')
    })

    it('handles message without avatar', () => {
      render(
        <AIMessage from="user">
          <AIMessageContent>
            <p>Message without avatar</p>
          </AIMessageContent>
        </AIMessage>
      )

      expect(screen.getByText('Message without avatar')).toBeInTheDocument()
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument()
    })

    it('handles message with only avatar', () => {
      render(
        <AIMessage from="assistant">
          <AIMessageAvatar name="Assistant" src="/avatar.jpg" />
        </AIMessage>
      )

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      expect(screen.queryByText('Message')).not.toBeInTheDocument()
    })

    it('applies responsive styling correctly', () => {
      render(
        <AIMessage from="user">
          <AIMessageContent>
            <p>Test message</p>
          </AIMessageContent>
        </AIMessage>
      )

      const message = screen.getByText('Test message').closest('.is-user')
      expect(message).toHaveClass('[&>div]:max-w-[80%]')
    })
  })

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <AIMessage from="user">
          <AIMessageContent>
            <p>Test message</p>
          </AIMessageContent>
          <AIMessageAvatar name="User" src="/avatar.jpg" />
        </AIMessage>
      )

      // The message should be in a proper container
      const message = screen.getByText('Test message').closest('div')
      expect(message).toBeInTheDocument()

      // Avatar should have proper alt text (empty as per design)
      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('alt', '')
    })

    it('provides fallback text for avatars', () => {
      render(
        <AIMessage from="assistant">
          <AIMessageAvatar name="AI Assistant" src="/broken-image.jpg" />
          <AIMessageContent>
            <p>Message content</p>
          </AIMessageContent>
        </AIMessage>
      )

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('AI')
    })

    it('handles screen reader considerations', () => {
      render(
        <AIMessage aria-label="Assistant message" from="assistant" role="group">
          <AIMessageAvatar name="Assistant" src="/avatar.jpg" />
          <AIMessageContent>
            <p>Accessible message</p>
          </AIMessageContent>
        </AIMessage>
      )

      const message = screen.getByRole('group')
      expect(message).toHaveAttribute('aria-label', 'Assistant message')
    })
  })

  describe('Edge Cases', () => {
    it('handles very long names in avatar', () => {
      render(<AIMessageAvatar name="Very Long Name That Should Be Truncated" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('VE')
    })

    it('handles special characters in names', () => {
      render(<AIMessageAvatar name="@#$%^&*()" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('@#')
    })

    it('handles unicode characters in names', () => {
      render(<AIMessageAvatar name="🤖 Assistant" src="/avatar.jpg" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('🤖')
    })

    it('handles empty content', () => {
      render(<AIMessageContent>{/* Empty content */}</AIMessageContent>)

      const content = screen.getByRole('generic')
      expect(content).toBeInTheDocument()
    })

    it('handles null/undefined children', () => {
      render(
        <AIMessage from="user">
          {null}
          {undefined}
          <AIMessageContent>
            <p>Valid content</p>
          </AIMessageContent>
        </AIMessage>
      )

      expect(screen.getByText('Valid content')).toBeInTheDocument()
    })

    it('handles missing src in avatar', () => {
      render(<AIMessageAvatar name="Test" src="" />)

      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('src', '')

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveTextContent('TE')
    })
  })
})
