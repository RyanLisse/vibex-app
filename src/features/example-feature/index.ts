// Public API exports for the example feature
export { ExampleItem } from '@/src/features/example-feature/components/ExampleItem'
export {
  exampleFilterSchema,
  exampleFormSchema,
  exampleItemSchema,
} from './schemas'
export type {
  ExampleFilter,
  ExampleFormData,
  ExampleItem as ExampleItemType,
  ExampleStore,
} from './types'
export {
  filterItems,
  getPriorityColor,
  getStatusIcon,
  sortItems,
} from './utils/example-utils'
