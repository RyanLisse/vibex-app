import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from './chat-message'

// Mock the Markdown component
vi.mock('@/components/markdown', () => ({
  Markdown: ({ children, repoUrl, branch }: { children: React.ReactNode; repoUrl?: string; branch?: string }) => (
    <div data-testid="markdown" data-repo-url={repoUrl} data-branch={branch}>
      {children}
    </div>
  ),
}))

// Mock the StreamingIndicator component
vi.mock('@/components/streaming-indicator', () => ({
  StreamingIndicator: ({ size, variant }: { size: string; variant: string }) => (
    <span data-testid="streaming-indicator" data-size={size} data-variant={variant}>
      ...
    </span>
  ),
}))

describe('ChatMessage', () => {
  it('should render user message correctly', () => {
    render(<ChatMessage role="user" text="Hello, how can I help you?" />)

    expect(screen.getByText('Hello, how can I help you?')).toBeTruthy()
    
    // Check for User icon (from lucide-react)
    const userIcon = document.querySelector('svg[data-lucide="user"]')
    expect(userIcon).toBeTruthy()
  })

  it('should render assistant message correctly', () => {
    render(<ChatMessage role="assistant" text="I can help you with that!" />)

    expect(screen.getByTestId('markdown')).toHaveTextContent('I can help you with that!')
    
    // Check for Bot icon (from lucide-react)
    const botIcon = document.querySelector('svg[data-lucide="bot"]')
    expect(botIcon).toBeTruthy()
  })

  it('should render streaming assistant message', () => {
    render(
      <ChatMessage 
        role="assistant" 
        text="This is a streaming message..." 
        isStreaming={true}
        streamProgress={{ chunkIndex: 2, totalChunks: 10 }}
      />
    )

    expect(screen.getByTestId('streaming-indicator')).toBeTruthy()
    expect(screen.getByTestId('streaming-indicator')).toHaveAttribute('data-size', 'sm')
    expect(screen.getByTestId('streaming-indicator')).toHaveAttribute('data-variant', 'cursor')
    
    // Check for progress percentage
    expect(screen.getByText('30%')).toBeTruthy()
  })

  it('should render streaming indicator without progress', () => {
    render(
      <ChatMessage 
        role="assistant" 
        text="Streaming without progress..." 
        isStreaming={true}
      />
    )

    expect(screen.getByTestId('streaming-indicator')).toBeTruthy()
    expect(screen.queryByText('%')).toBeNull()
  })

  it('should pass repository info to Markdown component', () => {
    const repoUrl = 'https://github.com/user/repo'
    const branch = 'main'
    
    render(
      <ChatMessage 
        role="assistant" 
        text="Here's the code..." 
        repoUrl={repoUrl}
        branch={branch}
      />
    )

    const markdown = screen.getByTestId('markdown')
    expect(markdown).toHaveAttribute('data-repo-url', repoUrl)
    expect(markdown).toHaveAttribute('data-branch', branch)
  })

  it('should apply correct CSS classes for user messages', () => {
    const { container } = render(<ChatMessage role="user" text="User message" />)

    const messageContainer = container.firstChild as HTMLElement
    expect(messageContainer).toHaveClass('flex', 'gap-3', 'animate-in', 'duration-300', 'justify-end', 'slide-in-from-right')
  })

  it('should apply correct CSS classes for assistant messages', () => {
    const { container } = render(<ChatMessage role="assistant" text="Assistant message" />)

    const messageContainer = container.firstChild as HTMLElement
    expect(messageContainer).toHaveClass('flex', 'gap-3', 'animate-in', 'duration-300', 'justify-start', 'slide-in-from-left')
  })

  it('should have different styling for user vs assistant messages', () => {
    const { container: userContainer } = render(<ChatMessage role="user" text="User message" />)
    const { container: assistantContainer } = render(<ChatMessage role="assistant" text="Assistant message" />)

    const userMessageBubble = userContainer.querySelector('.bg-primary')
    const assistantMessageBubble = assistantContainer.querySelector('.bg-card')

    expect(userMessageBubble).toBeTruthy()
    expect(assistantMessageBubble).toBeTruthy()
  })

  it('should handle empty text', () => {
    render(<ChatMessage role="user" text="" />)

    const messageElement = screen.getByText('')
    expect(messageElement).toBeTruthy()
  })

  it('should handle long text content', () => {
    const longText = 'This is a very long message that should be handled properly by the component with appropriate styling and layout considerations.'
    
    render(<ChatMessage role="assistant" text={longText} />)

    expect(screen.getByTestId('markdown')).toHaveTextContent(longText)
  })

  it('should show streaming shimmer effect for assistant messages', () => {
    const { container } = render(
      <ChatMessage 
        role="assistant" 
        text="Streaming message" 
        isStreaming={true}
      />
    )

    const shimmerElement = container.querySelector('.bg-gradient-to-r')
    expect(shimmerElement).toBeTruthy()
  })

  it('should not show streaming effects for user messages', () => {
    const { container } = render(
      <ChatMessage 
        role="user" 
        text="User message" 
        isStreaming={true}
      />
    )

    expect(screen.queryByTestId('streaming-indicator')).toBeNull()
    expect(container.querySelector('.bg-gradient-to-r')).toBeNull()
  })
})