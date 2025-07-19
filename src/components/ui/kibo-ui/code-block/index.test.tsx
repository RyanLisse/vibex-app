import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockFiles,
  CodeBlockHeader,
  CodeBlockItem,
  type CodeBlockProps,
  CodeBlockSelect,
  CodeBlockSelectContent,
  CodeBlockSelectItem,
  CodeBlockSelectTrigger,
  CodeBlockSelectValue,
} from './index'

// Mock dependencies
vi.mock('@radix-ui/react-use-controllable-state', () => ({
  useControllableState: ({ prop, defaultProp, onChange }: any) => {
    const React = require('react')
    const [state, setState] = React.useState(prop ?? defaultProp)

    React.useEffect(() => {
      if (prop !== undefined) {
        setState(prop)
      }
    }, [prop])

    const setValue = (newValue: any) => {
      setState(newValue)
      onChange?.(newValue)
    }

    return [state, setValue]
  },
}))

vi.mock('shiki', () => ({
  codeToHtml: vi.fn((code: string) => Promise.resolve(`<pre><code>${code}</code></pre>`)),
}))

vi.mock('@shikijs/transformers', () => ({
  transformerNotationDiff: vi.fn(),
  transformerNotationErrorLevel: vi.fn(),
  transformerNotationFocus: vi.fn(),
  transformerNotationHighlight: vi.fn(),
  transformerNotationWordHighlight: vi.fn(),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: any) => (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('javascript')}>
      {children}
    </div>
  ),
  SelectContent: ({ children, ...props }: any) => (
    <div data-testid="select-content" {...props}>
      {children}
    </div>
  ),
  SelectItem: ({ children, className, value, ...props }: any) => (
    <div className={className} data-testid="select-item" data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <button className={className} data-testid="select-trigger" {...props}>
      {children}
    </button>
  ),
  SelectValue: (props: any) => (
    <span data-testid="select-value" {...props}>
      Value
    </span>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

// Mock icon-pack icons
vi.mock('@icons-pack/react-simple-icons', () => ({
  SiJavascript: ({ className }: any) => (
    <span className={className} data-testid="js-icon">
      JS
    </span>
  ),
  SiTypescript: ({ className }: any) => (
    <span className={className} data-testid="ts-icon">
      TS
    </span>
  ),
  SiPython: ({ className }: any) => (
    <span className={className} data-testid="py-icon">
      PY
    </span>
  ),
}))

vi.mock('lucide-react', () => ({
  CheckIcon: ({ className, size }: any) => (
    <span className={className} data-size={size} data-testid="check-icon">
      ✓
    </span>
  ),
  CopyIcon: ({ className, size }: any) => (
    <span className={className} data-size={size} data-testid="copy-icon">
      📋
    </span>
  ),
}))

const mockData: CodeBlockProps['data'] = [
  {
    language: 'javascript',
    filename: 'index.js',
    code: 'console.log("Hello");',
  },
  {
    language: 'typescript',
    filename: 'index.ts',
    code: 'const x: string = "Hello";',
  },
  { language: 'python', filename: 'main.py', code: 'print("Hello")' },
]

describe('CodeBlock', () => {
  it('should render with children', () => {
    render(
      <CodeBlock data={mockData}>
        <div>Code content</div>
      </CodeBlock>
    )

    expect(screen.getByText('Code content')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<CodeBlock data={mockData} />)

    const container = document.querySelector('.size-full')
    expect(container).toHaveClass('size-full', 'overflow-hidden', 'rounded-md', 'border')
  })

  it('should apply custom className', () => {
    render(<CodeBlock className="custom-block" data={mockData} />)

    const container = document.querySelector('.custom-block')
    expect(container).toBeInTheDocument()
  })

  it('should handle controlled value', async () => {
    const handleValueChange = vi.fn()
    const { rerender } = render(
      <CodeBlock data={mockData} onValueChange={handleValueChange} value="javascript">
        <CodeBlockSelect>
          <CodeBlockSelectTrigger />
        </CodeBlockSelect>
      </CodeBlock>
    )

    const select = screen.getByTestId('select')
    expect(select).toHaveAttribute('data-value', 'javascript')

    // Simulate selection change
    await userEvent.click(select)
    expect(handleValueChange).toHaveBeenCalledWith('javascript')

    rerender(
      <CodeBlock data={mockData} onValueChange={handleValueChange} value="typescript">
        <CodeBlockSelect>
          <CodeBlockSelectTrigger />
        </CodeBlockSelect>
      </CodeBlock>
    )

    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'typescript')
  })
})

describe('CodeBlockHeader', () => {
  it('should render children', () => {
    render(
      <CodeBlockHeader>
        <div>Header content</div>
      </CodeBlockHeader>
    )

    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(<CodeBlockHeader>Content</CodeBlockHeader>)

    const header = screen.getByText('Content').parentElement
    expect(header).toHaveClass(
      'flex',
      'flex-row',
      'items-center',
      'border-b',
      'bg-secondary',
      'p-1'
    )
  })

  it('should apply custom className', () => {
    render(<CodeBlockHeader className="custom-header">Content</CodeBlockHeader>)

    const header = screen.getByText('Content').parentElement
    expect(header).toHaveClass('custom-header')
  })
})

describe('CodeBlockFiles', () => {
  it('should render children for each data item', () => {
    render(
      <CodeBlock data={mockData}>
        <CodeBlockFiles>{(item) => <div key={item.language}>{item.filename}</div>}</CodeBlockFiles>
      </CodeBlock>
    )

    expect(screen.getByText('index.js')).toBeInTheDocument()
    expect(screen.getByText('index.ts')).toBeInTheDocument()
    expect(screen.getByText('main.py')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(
      <CodeBlock data={mockData}>
        <CodeBlockFiles>{(item) => <div key={item.language}>{item.filename}</div>}</CodeBlockFiles>
      </CodeBlock>
    )

    const container = screen.getByText('index.js').parentElement
    expect(container).toHaveClass('flex', 'grow', 'flex-row', 'items-center', 'gap-2')
  })
})

describe('CodeBlockFilename', () => {
  it('should only render when value matches active value', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockFilename value="javascript">index.js</CodeBlockFilename>
        <CodeBlockFilename value="typescript">index.ts</CodeBlockFilename>
      </CodeBlock>
    )

    expect(screen.getByText('index.js')).toBeInTheDocument()
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument()
  })

  it('should render icon for matching file patterns', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockFilename value="javascript">script.js</CodeBlockFilename>
      </CodeBlock>
    )

    expect(screen.getByTestId('js-icon')).toBeInTheDocument()
  })

  it('should apply default classes', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockFilename value="javascript">index.js</CodeBlockFilename>
      </CodeBlock>
    )

    const filename = screen.getByText('index.js').parentElement
    expect(filename).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
      'bg-secondary',
      'px-4',
      'py-1.5',
      'text-muted-foreground',
      'text-xs'
    )
  })
})

describe('CodeBlockCopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should copy code to clipboard', async () => {
    const handleCopy = vi.fn()
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockCopyButton onCopy={handleCopy} />
      </CodeBlock>
    )

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("Hello");')
      expect(handleCopy).toHaveBeenCalled()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })
  })

  it('should revert icon after timeout', async () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockCopyButton timeout={1000} />
      </CodeBlock>
    )

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    vi.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
    })
  })

  it('should handle copy errors', async () => {
    const handleError = vi.fn()
    const error = new Error('Copy failed')
    mocked(navigator.clipboard.writeText).mockRejectedValueOnce(error)

    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockCopyButton onError={handleError} />
      </CodeBlock>
    )

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(error)
    })
  })

  it('should render as child element when asChild is true', async () => {
    const handleClick = vi.fn()
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockCopyButton asChild>
          <button onClick={handleClick}>Custom Copy</button>
        </CodeBlockCopyButton>
      </CodeBlock>
    )

    await userEvent.click(screen.getByText('Custom Copy'))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })
})

describe('CodeBlockItem', () => {
  it('should only render when value matches active value', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockItem value="javascript">JS Content</CodeBlockItem>
        <CodeBlockItem value="typescript">TS Content</CodeBlockItem>
      </CodeBlock>
    )

    expect(screen.getByText('JS Content')).toBeInTheDocument()
    expect(screen.queryByText('TS Content')).not.toBeInTheDocument()
  })

  it('should apply line numbers classes by default', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockItem value="javascript">Content</CodeBlockItem>
      </CodeBlock>
    )

    const item = screen.getByText('Content').parentElement
    expect(item?.className).toContain('[&_code]:[counter-reset:line]')
  })

  it('should not apply line numbers when disabled', () => {
    render(
      <CodeBlock data={mockData} value="javascript">
        <CodeBlockItem lineNumbers={false} value="javascript">
          Content
        </CodeBlockItem>
      </CodeBlock>
    )

    const item = screen.getByText('Content').parentElement
    expect(item?.className).not.toContain('[&_code]:[counter-reset:line]')
  })
})

describe('CodeBlockContent', () => {
  it('should render fallback when syntax highlighting is disabled', () => {
    render(<CodeBlockContent syntaxHighlighting={false}>const code = true;</CodeBlockContent>)

    expect(screen.getByText('const code = true;')).toBeInTheDocument()
  })

  it('should render highlighted HTML when syntax highlighting is enabled', async () => {
    const { codeToHtml } = await import('shiki')
    mocked(codeToHtml).mockResolvedValueOnce('<pre><code>highlighted</code></pre>')

    render(<CodeBlockContent language="javascript">console.log("test");</CodeBlockContent>)

    await waitFor(() => {
      const container = document.querySelector('[dangerouslySetInnerHTML]')
      expect(container).toBeInTheDocument()
    })
  })

  it('should handle highlight errors gracefully', async () => {
    const consoleSpy = mock.spyOn(console, 'error').mockImplementation(() => {})
    const { codeToHtml } = await import('shiki')
    mocked(codeToHtml).mockRejectedValueOnce(new Error('Highlight failed'))

    render(<CodeBlockContent language="javascript">console.log("test");</CodeBlockContent>)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('should pass custom themes to highlighter', async () => {
    const customThemes = {
      light: 'custom-light' as any,
      dark: 'custom-dark' as any,
    }

    render(
      <CodeBlockContent language="javascript" themes={customThemes}>
        console.log("test");
      </CodeBlockContent>
    )

    await waitFor(() => {
      const { codeToHtml } = require('shiki')
      expect(codeToHtml).toHaveBeenCalledWith(
        'console.log("test");',
        expect.objectContaining({
          themes: customThemes,
        })
      )
    })
  })
})

describe('Integration', () => {
  it('should render complete code block with tabs', async () => {
    render(
      <CodeBlock data={mockData} defaultValue="javascript">
        <CodeBlockHeader>
          <CodeBlockFiles>
            {(item) => (
              <CodeBlockFilename key={item.language} value={item.language}>
                {item.filename}
              </CodeBlockFilename>
            )}
          </CodeBlockFiles>
          <CodeBlockSelect>
            <CodeBlockSelectTrigger>
              <CodeBlockSelectValue />
            </CodeBlockSelectTrigger>
            <CodeBlockSelectContent>
              {(item) => (
                <CodeBlockSelectItem key={item.language} value={item.language}>
                  {item.language}
                </CodeBlockSelectItem>
              )}
            </CodeBlockSelectContent>
          </CodeBlockSelect>
          <CodeBlockCopyButton />
        </CodeBlockHeader>
        <CodeBlockBody>
          {(item) => (
            <CodeBlockItem key={item.language} value={item.language}>
              <CodeBlockContent language={item.language as any}>{item.code}</CodeBlockContent>
            </CodeBlockItem>
          )}
        </CodeBlockBody>
      </CodeBlock>
    )

    // Check initial state
    expect(screen.getByText('index.js')).toBeInTheDocument()
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument()
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument()

    // Test copy functionality
    await userEvent.click(screen.getByTestId('copy-icon').parentElement!)
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("Hello");')
    })
  })
})
