// Public API exports for the example feature
export { ExampleItem } from './components/ExampleItem'
export {
  exampleFormSchema,
  exampleItemSchema,
  exampleFilterSchema,
} from './schemas'
export type {
  ExampleItem as ExampleItemType,
  ExampleFormData,
  ExampleFilter,
  ExampleStore,
} from './types'
export {
  filterItems,
  sortItems,
  getPriorityColor,
  getStatusIcon,
} from './utils/example-utils'
