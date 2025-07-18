import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Mock Radix UI Tabs components
mock('@radix-ui/react-tabs', () => ({
  Root: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="tabs-root-primitive" {...props}>
      {children}
    </div>
  ),
  List: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="tabs-list-primitive" role="tablist" {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, className, value, ...props }: any) => (
    <button
      className={className}
      data-testid="tabs-trigger-primitive"
      data-value={value}
      role="tab"
      {...props}
    >
      {children}
    </button>
  ),
  Content: ({ children, className, value, ...props }: any) => (
    <div
      className={className}
      data-testid="tabs-content-primitive"
      data-value={value}
      role="tabpanel"
      {...props}
    >
      {children}
    </div>
  ),
}))

describe('Tabs Components', () => {
  describe('Tabs', () => {
    it('should render tabs root', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      )

      const root = screen.getByTestId('tabs-root-primitive')
      expect(root).toBeInTheDocument()
      expect(root).toHaveAttribute('data-slot', 'tabs')
      expect(root).toHaveClass('flex', 'flex-col', 'gap-2')
    })

    it('should merge custom className', () => {
      render(
        <Tabs className="custom-tabs w-full">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const root = screen.getByTestId('tabs-root-primitive')
      expect(root).toHaveClass('custom-tabs', 'w-full')
      expect(root).toHaveClass('flex') // Still has default classes
    })

    it('should pass through props', () => {
      render(
        <Tabs defaultValue="tab1" orientation="horizontal">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const root = screen.getByTestId('tabs-root-primitive')
      expect(root).toHaveAttribute('defaultValue', 'tab1')
      expect(root).toHaveAttribute('orientation', 'horizontal')
    })
  })

  describe('TabsList', () => {
    it('should render tabs list', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const list = screen.getByTestId('tabs-list-primitive')
      expect(list).toBeInTheDocument()
      expect(list).toHaveAttribute('data-slot', 'tabs-list')
      expect(list).toHaveClass(
        'bg-muted',
        'text-muted-foreground',
        'inline-flex',
        'h-9',
        'rounded-lg'
      )
    })

    it('should merge custom className', () => {
      render(
        <Tabs>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const list = screen.getByTestId('tabs-list-primitive')
      expect(list).toHaveClass('w-full', 'justify-start')
    })

    it('should have correct role', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const list = screen.getByRole('tablist')
      expect(list).toBeInTheDocument()
    })
  })

  describe('TabsTrigger', () => {
    it('should render tabs trigger', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'tabs-trigger')
      expect(trigger).toHaveAttribute('data-value', 'tab1')
      expect(trigger).toHaveTextContent('Tab 1')
      expect(trigger).toHaveClass('inline-flex', 'rounded-md', 'border', 'px-2', 'py-1')
    })

    it('should merge custom className', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger className="custom-trigger" value="tab1">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger).toHaveClass('custom-trigger')
    })

    it('should handle disabled state', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger disabled value="tab1">
              Disabled Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger).toHaveAttribute('disabled')
      expect(trigger).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    it('should handle active state styling', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger data-state="active" value="tab1">
              Active Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger).toHaveAttribute('data-state', 'active')
      expect(trigger).toHaveClass('data-[state=active]:bg-background')
    })

    it('should render with icon', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">
              <svg height="16" width="16">
                <circle cx="8" cy="8" r="8" />
              </svg>
              <span>Tab with Icon</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger.querySelector('svg')).toBeInTheDocument()
      expect(trigger).toHaveTextContent('Tab with Icon')
    })

    it('should have correct role', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByRole('tab')
      expect(trigger).toBeInTheDocument()
    })

    it('should handle onClick events', () => {
      const handleClick = mock()
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger onClick={handleClick} value="tab1">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      fireEvent.click(trigger)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('TabsContent', () => {
    it('should render tabs content', () => {
      render(
        <Tabs>
          <TabsContent value="tab1">
            <p>Tab 1 content</p>
          </TabsContent>
        </Tabs>
      )

      const content = screen.getByTestId('tabs-content-primitive')
      expect(content).toBeInTheDocument()
      expect(content).toHaveAttribute('data-slot', 'tabs-content')
      expect(content).toHaveAttribute('data-value', 'tab1')
      expect(content).toHaveClass('flex-1', 'outline-none')
      expect(content).toHaveTextContent('Tab 1 content')
    })

    it('should merge custom className', () => {
      render(
        <Tabs>
          <TabsContent className="bg-gray-50 p-4" value="tab1">
            Content
          </TabsContent>
        </Tabs>
      )

      const content = screen.getByTestId('tabs-content-primitive')
      expect(content).toHaveClass('p-4', 'bg-gray-50')
    })

    it('should have correct role', () => {
      render(
        <Tabs>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      )

      const content = screen.getByRole('tabpanel')
      expect(content).toBeInTheDocument()
    })

    it('should render complex content', () => {
      render(
        <Tabs>
          <TabsContent value="tab1">
            <div>
              <h3>Section Title</h3>
              <p>Some paragraph text</p>
              <button>Action Button</button>
            </div>
          </TabsContent>
        </Tabs>
      )

      const content = screen.getByTestId('tabs-content-primitive')
      expect(content.querySelector('h3')).toHaveTextContent('Section Title')
      expect(content.querySelector('p')).toHaveTextContent('Some paragraph text')
      expect(content.querySelector('button')).toHaveTextContent('Action Button')
    })
  })

  describe('Tabs composition', () => {
    it('should render complete tabs component', () => {
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <p>Make changes to your account here.</p>
          </TabsContent>
          <TabsContent value="password">
            <p>Change your password here.</p>
          </TabsContent>
          <TabsContent value="settings">
            <p>Manage your settings here.</p>
          </TabsContent>
        </Tabs>
      )

      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Make changes to your account here.')).toBeInTheDocument()
      expect(screen.getByText('Change your password here.')).toBeInTheDocument()
      expect(screen.getByText('Manage your settings here.')).toBeInTheDocument()
    })

    it('should work with controlled value', () => {
      const ControlledTabs = () => {
        const [value, setValue] = React.useState('tab1')
        return (
          <Tabs onValueChange={setValue} value={value}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
          </Tabs>
        )
      }

      render(<ControlledTabs />)

      expect(screen.getByTestId('tabs-root-primitive')).toHaveAttribute('value', 'tab1')
    })

    it('should handle vertical orientation', () => {
      render(
        <Tabs className="flex-row" orientation="vertical">
          <TabsList className="h-auto flex-col">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const root = screen.getByTestId('tabs-root-primitive')
      expect(root).toHaveAttribute('orientation', 'vertical')
      expect(root).toHaveClass('flex-row')
    })

    it('should handle asChild pattern', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger asChild value="tab1">
              <a href="#tab1">Link Tab</a>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      )

      const trigger = screen.getByTestId('tabs-trigger-primitive')
      expect(trigger).toHaveAttribute('asChild')
    })
  })
})
