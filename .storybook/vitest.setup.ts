import { setProjectAnnotations } from '@storybook/react'
import { beforeAll } from 'vitest'
import { decorators, globalTypes, parameters } from './preview'

const annotations = setProjectAnnotations([{ globalTypes, decorators, parameters }])

beforeAll(annotations.beforeAll)
