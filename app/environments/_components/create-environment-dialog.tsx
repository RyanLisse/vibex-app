'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEnvironmentStore } from '@/stores/environments'
import { useGitHubAuth } from '@/hooks/use-github-auth'

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

    if (!formData.name.trim() || !formData.selectedRepository) {
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
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) {
          resetForm()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new environment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Environment name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter environment name"
              className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter environment description"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <label htmlFor="repository" className="text-sm font-medium">
              Select your Github repository *
            </label>
            <Select
              value={formData.selectedRepository}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  selectedRepository: value,
                }))
              }
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
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isCreating}>
              {isCreating ? 'Creating...' : 'Create Environment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
