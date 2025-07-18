import { render, screen } from '@testing-library/react'
import { AIResponse } from './response'

// Mock code-block components
mock('@/components/ui/code-block', () => ({
  CodeBlock: ({ children, className, data }: any) => (
    <div className={className} data-testid="code-block" data-languages={data.map((d: any) => d.language).join(',')}>
      {children}
    </div>
  ),
  CodeBlockBody: ({ children }: any) => <div data-testid="code-block-body">{children}</div>,
  CodeBlockContent: ({ children, language }: any) => (
    <pre data-testid="code-block-content" data-language={language}>
      <code>{children}</code>
    </pre>
  ),
  CodeBlockCopyButton: ({ onCopy, onError }: any) => (
    <button data-testid="copy-button" onClick={onCopy}>Copy</button>
  ),
  CodeBlockFilename: ({ children, value }: any) => (
    <span data-testid="filename" data-value={value}>{children}</span>
  ),
  CodeBlockFiles: ({ children }: any) => (
    <div data-testid="files">{children && children({ language: 'javascript', filename: 'index.js' })}</div>
  ),
  CodeBlockHeader: ({ children }: any) => <div data-testid="code-block-header">{children}</div>,
  CodeBlockItem: ({ children, value }: any) => (
    <div data-testid="code-block-item" data-value={value}>{children}</div>
  ),
  CodeBlockSelect: ({ children }: any) => <div data-testid="select">{children}</div>,
  CodeBlockSelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children && children({ language: 'javascript' })}</div>
  ),
  CodeBlockSelectItem: ({ children, value }: any) => (
    <option data-testid="select-item" value={value}>{children}</option>
  ),
  CodeBlockSelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
  CodeBlockSelectValue: () => <span data-testid="select-value">JavaScript</span>,
}))

mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

describe('AIResponse', () => {
  it('should render markdown content', () => {
    render(<AIResponse>**Bold text** and *italic text*</AIResponse>)

    expect(screen.getByText('Bold text')).toBeInTheDocument()
    expect(screen.getByText('italic text')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<AIResponse>Content</AIResponse>)

    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('size-full', '[&>*:first-child]:mt-0', '[&>*:last-child]:mb-0')
  })

  it('should apply custom className', () => {
    render(<AIResponse className="custom-response">Content</AIResponse>)

    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('custom-response')
  })

  it('should render headings with proper styling', () => {
    render(
      <AIResponse>
        {`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`}
      </AIResponse>
    )

    const h1 = screen.getByText('Heading 1')
    expect(h1).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-3xl')

    const h2 = screen.getByText('Heading 2')
    expect(h2).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-2xl')

    const h3 = screen.getByText('Heading 3')
    expect(h3).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-xl')

    const h4 = screen.getByText('Heading 4')
    expect(h4).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-lg')

    const h5 = screen.getByText('Heading 5')
    expect(h5).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-base')

    const h6 = screen.getByText('Heading 6')
    expect(h6).toHaveClass('mt-6', 'mb-2', 'font-semibold', 'text-sm')
  })

  it('should render lists with proper styling', () => {
    render(
      <AIResponse>
        {`- Item 1
- Item 2

1. Ordered 1
2. Ordered 2`}
      </AIResponse>
    )

    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2)
    expect(lists[0]).toHaveClass('ml-4', 'list-outside', 'list-decimal')
    expect(lists[1]).toHaveClass('ml-4', 'list-outside', 'list-decimal')
  })

  it('should render links with proper attributes', () => {
    render(<AIResponse>[Link text](https://example.com)</AIResponse>)

    const link = screen.getByText('Link text')
    expect(link).toHaveClass('font-medium', 'text-primary', 'underline')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('should render code blocks', () => {
    const codeContent = `const hello = "world";
console.log(hello);`
    
    render(
      <AIResponse>
        {`\`\`\`javascript
${codeContent}
\`\`\``}
      </AIResponse>
    )

    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    expect(screen.getByTestId('code-block-content')).toHaveTextContent(codeContent)
    expect(screen.getByTestId('code-block-content')).toHaveAttribute('data-language', 'javascript')
  })

  it('should handle code blocks without language', () => {
    render(
      <AIResponse>
        {`\`\`\`
const code = true;
\`\`\``}
      </AIResponse>
    )

    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    expect(screen.getByTestId('code-block-content')).toHaveTextContent('const code = true;')
  })

  it('should pass through additional props', () => {
    render(
      <AIResponse data-testid="ai-response" aria-label="AI response">
        Content
      </AIResponse>
    )

    expect(screen.getByTestId('ai-response')).toBeInTheDocument()
    expect(screen.getByTestId('ai-response')).toHaveAttribute('aria-label', 'AI response')
  })

  it('should pass custom options to ReactMarkdown', () => {
    const customComponents = {
      p: ({ children }: any) => <p data-testid="custom-paragraph">{children}</p>,
    }

    render(
      <AIResponse options={{ components: customComponents }}>
        Test paragraph
      </AIResponse>
    )

    expect(screen.getByTestId('custom-paragraph')).toHaveTextContent('Test paragraph')
  })

  it('should memoize component based on children prop', () => {
    const { rerender } = render(<AIResponse className="test">Content</AIResponse>)

    // Get initial element reference
    const initialElement = screen.getByText('Content').parentElement

    // Rerender with same children but different className
    rerender(<AIResponse className="different">Content</AIResponse>)

    // Should be the same element (memoized)
    const afterRerender = screen.getByText('Content').parentElement
    expect(afterRerender).toBe(initialElement)

    // Rerender with different children
    rerender(<AIResponse className="different">Different content</AIResponse>)

    // Should be a different element (not memoized)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    expect(screen.getByText('Different content')).toBeInTheDocument()
  })
})