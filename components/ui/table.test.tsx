import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

describe('Table Components', () => {
  describe('Table', () => {
    it('should render table with container', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const container = screen.getByRole('generic').querySelector('[data-slot="table-container"]')
      const table = screen.getByRole('table')

      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('relative', 'w-full', 'overflow-x-auto')
      expect(table).toBeInTheDocument()
      expect(table).toHaveAttribute('data-slot', 'table')
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm')
    })

    it('should merge custom className', () => {
      render(
        <Table className="custom-table border">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const table = screen.getByRole('table')
      expect(table).toHaveClass('custom-table', 'border')
      expect(table).toHaveClass('w-full') // Still has default classes
    })

    it('should pass through table props', () => {
      render(
        <Table aria-label="User data" id="data-table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('id', 'data-table')
      expect(table).toHaveAttribute('aria-label', 'User data')
    })
  })

  describe('TableHeader', () => {
    it('should render thead element', () => {
      render(
        <table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </table>
      )

      const thead = screen.getByRole('rowgroup')
      expect(thead.tagName).toBe('THEAD')
      expect(thead).toHaveAttribute('data-slot', 'table-header')
      expect(thead).toHaveClass('[&_tr]:border-b')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <TableHeader className="sticky top-0">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </table>
      )

      const thead = screen.getByRole('rowgroup')
      expect(thead).toHaveClass('sticky', 'top-0')
    })
  })

  describe('TableBody', () => {
    it('should render tbody element', () => {
      render(
        <table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </table>
      )

      const tbody = screen.getByRole('rowgroup')
      expect(tbody.tagName).toBe('TBODY')
      expect(tbody).toHaveAttribute('data-slot', 'table-body')
      expect(tbody).toHaveClass('[&_tr:last-child]:border-0')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <TableBody className="divide-y">
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </table>
      )

      const tbody = screen.getByRole('rowgroup')
      expect(tbody).toHaveClass('divide-y')
    })
  })

  describe('TableFooter', () => {
    it('should render tfoot element', () => {
      render(
        <table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </table>
      )

      const tfoot = screen.getByRole('rowgroup')
      expect(tfoot.tagName).toBe('TFOOT')
      expect(tfoot).toHaveAttribute('data-slot', 'table-footer')
      expect(tfoot).toHaveClass('bg-muted/50', 'border-t', 'font-medium')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <TableFooter className="bg-gray-100">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </table>
      )

      const tfoot = screen.getByRole('rowgroup')
      expect(tfoot).toHaveClass('bg-gray-100')
    })
  })

  describe('TableRow', () => {
    it('should render tr element', () => {
      render(
        <table>
          <tbody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      expect(row.tagName).toBe('TR')
      expect(row).toHaveAttribute('data-slot', 'table-row')
      expect(row).toHaveClass('hover:bg-muted/50', 'border-b', 'transition-colors')
    })

    it('should handle selected state', () => {
      render(
        <table>
          <tbody>
            <TableRow data-state="selected">
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      expect(row).toHaveAttribute('data-state', 'selected')
      expect(row).toHaveClass('data-[state=selected]:bg-muted')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <tbody>
            <TableRow className="cursor-pointer">
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      expect(row).toHaveClass('cursor-pointer')
    })

    it('should handle onClick events', () => {
      const handleClick = vi.fn()
      render(
        <table>
          <tbody>
            <TableRow onClick={handleClick}>
              <TableCell>Cell</TableCell>
            </TableRow>
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      row.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('TableHead', () => {
    it('should render th element', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Column Header</TableHead>
            </tr>
          </thead>
        </table>
      )

      const th = screen.getByRole('columnheader')
      expect(th.tagName).toBe('TH')
      expect(th).toHaveAttribute('data-slot', 'table-head')
      expect(th).toHaveClass(
        'text-foreground',
        'h-10',
        'px-2',
        'text-left',
        'align-middle',
        'font-medium'
      )
      expect(th).toHaveTextContent('Column Header')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead className="text-right">Header</TableHead>
            </tr>
          </thead>
        </table>
      )

      const th = screen.getByRole('columnheader')
      expect(th).toHaveClass('text-right')
    })

    it('should handle scope attribute', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead scope="col">Header</TableHead>
            </tr>
          </thead>
        </table>
      )

      const th = screen.getByRole('columnheader')
      expect(th).toHaveAttribute('scope', 'col')
    })
  })

  describe('TableCell', () => {
    it('should render td element', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell Content</TableCell>
            </tr>
          </tbody>
        </table>
      )

      const td = screen.getByRole('cell')
      expect(td.tagName).toBe('TD')
      expect(td).toHaveAttribute('data-slot', 'table-cell')
      expect(td).toHaveClass('p-2', 'align-middle', 'whitespace-nowrap')
      expect(td).toHaveTextContent('Cell Content')
    })

    it('should merge custom className', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell className="text-center font-bold">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      )

      const td = screen.getByRole('cell')
      expect(td).toHaveClass('text-center', 'font-bold')
    })

    it('should handle colspan and rowspan', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell colSpan={2} rowSpan={3}>
                Cell
              </TableCell>
            </tr>
          </tbody>
        </table>
      )

      const td = screen.getByRole('cell')
      expect(td).toHaveAttribute('colspan', '2')
      expect(td).toHaveAttribute('rowspan', '3')
    })
  })

  describe('TableCaption', () => {
    it('should render caption element', () => {
      render(
        <Table>
          <TableCaption>Table caption text</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const caption = screen.getByText('Table caption text')
      expect(caption.tagName).toBe('CAPTION')
      expect(caption).toHaveAttribute('data-slot', 'table-caption')
      expect(caption).toHaveClass('text-muted-foreground', 'mt-4', 'text-sm')
    })

    it('should merge custom className', () => {
      render(
        <Table>
          <TableCaption className="text-xs italic">Caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const caption = screen.getByText('Caption')
      expect(caption).toHaveClass('text-xs', 'italic')
    })
  })

  describe('Table composition', () => {
    it('should render a complete table', () => {
      render(
        <Table>
          <TableCaption>A list of users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell className="text-right">$100.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell className="text-right">$200.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">$300.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('A list of users')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(3)
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 2 body + 1 footer
      expect(screen.getByText('Total')).toBeInTheDocument()
    })

    it('should handle responsive overflow', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Very long content that might overflow on small screens</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const container = screen.getByRole('generic').querySelector('[data-slot="table-container"]')
      expect(container).toHaveClass('overflow-x-auto')
    })

    it('should handle checkbox columns', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input role="checkbox" type="checkbox" />
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input role="checkbox" type="checkbox" />
              </TableCell>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })
  })
})
