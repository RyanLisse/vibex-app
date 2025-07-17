import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react';
import * as projectAnnotations from './preview';

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories-jest#setprojectannotations
const project = setProjectAnnotations(projectAnnotations);

beforeAll(project.beforeAll);