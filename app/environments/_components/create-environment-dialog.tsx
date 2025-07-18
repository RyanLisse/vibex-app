'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGitHubAuth } from '@/hooks/use-github-auth'
import { useEnvironmentStore } from '@/stores/environments'

interface CreateEnvironmentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEnvironmentDialog({ isOpen, onOpenChange }: CreateEnvironmentDialogProps) {
  const { isAuthenticated, repositories, fetchRepositories } = useGitHubAuth()
  const { createEnvironment } = useEnvironmentStore()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedRepository: '',
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      fetchRepositories()
    }
  }, [isAuthenticated, isOpen, fetchRepositories])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedRepository: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!(formData.name.trim() && formData.selectedRepository)) {
      return
    }

    setIsCreating(true)

    try {
      // Get GitHub access token from cookies
      const githubTokenCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('github_access_token='))

      const githubToken = githubTokenCookie?.split('=')[1] || ''

      // Parse organization and repository from full_name (owner/repo)
      const [githubOrganization] = formData.selectedRepository.split('/')

      // Create the environment
      createEnvironment({
        name: formData.name.trim(),
        description: formData.description.trim(),
        githubOrganization,
        githubToken,
        githubRepository: formData.selectedRepository,
      })

      // Reset form and close dialog
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create environment:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const isFormValid = formData.name.trim() && formData.selectedRepository

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) {
          resetForm()
        }
      }}
      open={isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new environment</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-y-2">
            <label className="font-medium text-sm" htmlFor="name">
              Environment name *
            </label>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              id="name"
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter environment name"
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <label className="font-medium text-sm" htmlFor="description">
              Description
            </label>
            <textarea
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              id="description"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter environment description"
              rows={3}
              value={formData.description}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <label className="font-medium text-sm" htmlFor="repository">
              Select your Github repository *
            </label>
            <Select
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  selectedRepository: value,
                }))
              }
              value={formData.selectedRepository}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    <div className="flex">
                      <span>{repo.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              disabled={isCreating}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!isFormValid || isCreating} type="submit">
              {isCreating ? 'Creating...' : 'Create Environment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
