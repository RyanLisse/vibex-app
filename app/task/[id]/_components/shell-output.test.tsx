import { render, screen } from '@testing-library/react'
import { ShellOutput } from '@/app/task/[id]/_components/shell-output'

// Mock the ScrollArea component
mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}))

// Mock the Tooltip components
mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

describe('ShellOutput', () => {
  it('should render command without first element', () => {
    const command = ['sh', '-c', 'ls', '-la']
    render(<ShellOutput command={command} />)

    expect(screen.getByText('-c ls -la')).toBeTruthy()
  })

  it('should render single command argument', () => {
    const command = ['sh', 'echo hello']
    render(<ShellOutput command={command} />)

    expect(screen.getByText('echo hello')).toBeTruthy()
  })

  it('should handle empty command array', () => {
    const command: string[] = []
    render(<ShellOutput command={command} />)

    expect(screen.getByText('')).toBeTruthy()
  })

  it('should handle command with only one element', () => {
    const command = ['sh']
    render(<ShellOutput command={command} />)

    expect(screen.getByText('')).toBeTruthy()
  })

  it('should not render output section when output is not provided', () => {
    const command = ['sh', '-c', 'echo hello']
    render(<ShellOutput command={command} />)

    expect(screen.queryByTestId('scroll-area')).toBeNull()
    expect(screen.queryByText('Output')).toBeNull()
  })

  it('should render output section when output is provided', () => {
    const command = ['sh', '-c', 'echo hello']
    const output = JSON.stringify({ output: 'hello world' })
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByTestId('scroll-area')).toBeTruthy()
    expect(screen.getByText('Output')).toBeTruthy()
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('should parse JSON output correctly', () => {
    const command = ['sh', '-c', 'pwd']
    const output = JSON.stringify({ output: '/home/user/project' })
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByText('/home/user/project')).toBeTruthy()
  })

  it('should handle JSON output without output field', () => {
    const command = ['sh', '-c', 'test']
    const output = JSON.stringify({ status: 'success' })
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByText('No output')).toBeTruthy()
  })

  it('should handle invalid JSON output', () => {
    const command = ['sh', '-c', 'invalid']
    const output = 'invalid json string'
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByText('Failed to parse output')).toBeTruthy()
  })

  it('should handle empty output string', () => {
    const command = ['sh', '-c', 'empty']
    const output = ''
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByText('No output')).toBeTruthy()
  })

  it('should render terminal icon in output section', () => {
    const command = ['sh', '-c', 'test']
    const output = JSON.stringify({ output: 'test output' })
    render(<ShellOutput command={command} output={output} />)

    // Check for Terminal icon (from lucide-react)
    const terminalIcon = document.querySelector('svg[data-lucide="terminal"]')
    expect(terminalIcon).toBeTruthy()
  })

  it('should render command with proper styling', () => {
    const command = ['sh', '-c', 'long command that should be truncated']
    render(<ShellOutput command={command} />)

    const commandElement = screen.getByText('-c long command that should be truncated')
    expect(commandElement).toHaveClass(
      'font-medium',
      'font-mono',
      'text-sm',
      'truncate',
      'max-w-md',
      'cursor-help'
    )
  })

  it('should render tooltip elements', () => {
    const command = ['sh', '-c', 'test command']
    render(<ShellOutput command={command} />)

    expect(screen.getByTestId('tooltip-trigger')).toBeTruthy()
    expect(screen.getByTestId('tooltip-content')).toBeTruthy()
  })

  it('should handle very long command', () => {
    const command = [
      'sh',
      '-c',
      'this is a very long command that should be truncated in the display but shown in full in the tooltip',
    ]
    render(<ShellOutput command={command} />)

    const commandText =
      '-c this is a very long command that should be truncated in the display but shown in full in the tooltip'
    expect(screen.getByText(commandText)).toBeTruthy()
  })

  it('should handle complex JSON output', () => {
    const command = ['sh', '-c', 'complex']
    const output = JSON.stringify({
      output: 'Multi-line\noutput with\nspecial characters: !@#$%^&*()',
    })
    render(<ShellOutput command={command} output={output} />)

    expect(screen.getByText('Multi-line\noutput with\nspecial characters: !@#$%^&*()')).toBeTruthy()
  })

  it('should apply proper CSS classes for animation', () => {
    const command = ['sh', '-c', 'test']
    const output = JSON.stringify({ output: 'test' })
    const { container } = render(<ShellOutput command={command} output={output} />)

    const outputContainer = container.querySelector('.animate-in')
    expect(outputContainer).toBeTruthy()
    expect(outputContainer).toHaveClass('slide-in-from-bottom', 'duration-300')
  })
})
