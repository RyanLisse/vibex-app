import { beforeAll } from 'vitest'
import { setProjectAnnotations } from '@storybook/react'
import * as globalStorybookConfig from './preview'

const annotations = setProjectAnnotations([globalStorybookConfig])

beforeAll(annotations.beforeAll)