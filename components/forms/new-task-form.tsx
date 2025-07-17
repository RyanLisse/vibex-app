'use client'
import { HardDrive, Split } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useEnvironmentStore } from '@/stores/environments'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGitHubAuth } from '@/hooks/use-github-auth'
import { useTaskStore } from '@/stores/tasks'
import { createTaskAction } from '@/app/actions/inngest'
import Link from 'next/link'

export default function NewTaskForm() {
  const { environments } = useEnvironmentStore()
  const { addTask } = useTaskStore()
  const { branches, fetchBranches } = useGitHubAuth()
  const [selectedBranch, setSelectedBranch] = useState<string>(
    branches.find((branch) => branch.isDefault)?.name || ''
  )
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>(environments[0]?.id || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '100px' // Reset to min height
      textarea.style.height = Math.max(100, textarea.scrollHeight) + 'px'
    }
  }

  const handleAddTask = async (mode: 'code' | 'ask') => {
    if (value) {
      const task = addTask({
        title: value,
        hasChanges: false,
        description: '',
        messages: [],
        status: 'IN_PROGRESS',
        branch: selectedBranch,
        sessionId: '',
        repository:
          environments.find((env) => env.id === selectedEnvironment)?.githubRepository || '',
        mode,
      })
      await createTaskAction({ task })
      setValue('')
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  // Set initial environment when environments load
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
  }, [selectedEnvironment])

  useEffect(() => {
    if (branches.length > 0) {
      setSelectedBranch(branches.find((branch) => branch.isDefault)?.name || '')
    }
  }, [branches])

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-y-10 mt-14">
      <h1 className="text-4xl text-center font-bold">Ready to ship something new?</h1>
      <div className="p-0.5 rounded-lg bg-muted">
        <div className="flex flex-col gap-y-2 border bg-background rounded-lg p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe a task you want to ship..."
            className="w-full min-h-[100px] resize-none border-none p-0 focus:outline-none focus:border-transparent overflow-hidden"
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
                          <span className="truncate max-w-[150px]">
                            {environment.githubRepository}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Link passHref href="/environments">
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
                <Button variant="outline" onClick={() => handleAddTask('ask')}>
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
