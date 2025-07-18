'use client'
import { HardDrive, Split } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createTaskAction } from '@/app/actions/inngest'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGitHubAuth } from '@/hooks/use-github-auth'
import { useEnvironmentStore } from '@/stores/environments'
import { useTaskStore } from '@/stores/tasks'

// Helper functions for form logic
const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = '100px'
  textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`
}

const getDefaultBranch = (branches: Array<{ name: string; isDefault?: boolean }>) => {
  return branches.find((branch) => branch.isDefault)?.name || ''
}

const getRepositoryFromEnvironment = (
  environments: Array<{ id: string; githubRepository?: string }>,
  envId: string
) => {
  return environments.find((env) => env.id === envId)?.githubRepository || ''
}

const createTaskData = (
  value: string,
  mode: 'code' | 'ask',
  selectedBranch: string,
  environments: Array<{ id: string; githubRepository?: string }>,
  selectedEnvironment: string
) => ({
  title: value,
  hasChanges: false,
  description: '',
  messages: [],
  status: 'IN_PROGRESS' as const,
  branch: selectedBranch,
  sessionId: '',
  repository: getRepositoryFromEnvironment(environments, selectedEnvironment),
  mode,
})

export default function NewTaskForm() {
  const { environments } = useEnvironmentStore()
  const { addTask } = useTaskStore()
  const { branches, fetchBranches } = useGitHubAuth()
  const [selectedBranch, setSelectedBranch] = useState<string>(getDefaultBranch(branches))
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>(environments[0]?.id || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      adjustTextareaHeight(textarea)
    }
  }

  const handleAddTask = async (mode: 'code' | 'ask') => {
    if (!value) {
      return
    }

    const taskData = createTaskData(value, mode, selectedBranch, environments, selectedEnvironment)
    const task = addTask(taskData)
    await createTaskAction({ task })
    setValue('')
  }

  // Effects for initialization and state management
  useEffect(() => {
    adjustHeight()
  }, [adjustHeight])

  useEffect(() => {
    if (environments.length > 0 && !selectedEnvironment) {
      setSelectedEnvironment(environments[0].id)
    }
  }, [environments, selectedEnvironment])

  useEffect(() => {
    if (selectedEnvironment) {
      const environment = environments.find((env) => env.id === selectedEnvironment)
      if (environment?.githubRepository) {
        fetchBranches(environment.githubRepository)
      }
    }
  }, [selectedEnvironment, environments, fetchBranches])

  useEffect(() => {
    if (branches.length > 0) {
      setSelectedBranch(getDefaultBranch(branches))
    }
  }, [branches])

  return (
    <div className="mx-auto mt-14 flex w-full max-w-3xl flex-col gap-y-10">
      <h1 className="text-center font-bold text-4xl">Ready to ship something new?</h1>
      <div className="rounded-lg bg-muted p-0.5">
        <div className="flex flex-col gap-y-2 rounded-lg border bg-background p-4">
          <textarea
            className="min-h-[100px] w-full resize-none overflow-hidden border-none p-0 focus:border-transparent focus:outline-none"
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe a task you want to ship..."
            ref={textareaRef}
            value={value}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              {environments.length > 0 ? (
                <Select
                  onValueChange={(value) => setSelectedEnvironment(value)}
                  value={selectedEnvironment || ''}
                >
                  <SelectTrigger>
                    <HardDrive />
                    <SelectValue placeholder="Choose a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((environment) => (
                      <SelectItem key={environment.id} value={environment.id}>
                        <div className="flex w-full">
                          <span className="max-w-[150px] truncate">
                            {environment.githubRepository}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Link href="/environments" passHref>
                  <Button className="rounded-lg" variant="outline">
                    <HardDrive />
                    Create an environment
                  </Button>
                </Link>
              )}
              {selectedEnvironment && (
                <Select onValueChange={(value) => setSelectedBranch(value)} value={selectedBranch}>
                  <SelectTrigger>
                    <Split />
                    <SelectValue placeholder="Branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        <div className="flex w-full">
                          <span>{branch.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {value && (
              <div className="flex items-center gap-x-2">
                <Button onClick={() => handleAddTask('ask')} variant="outline">
                  Ask
                </Button>
                <Button onClick={() => handleAddTask('code')}>Code</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
