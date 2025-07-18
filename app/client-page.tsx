'use client'

import NewTaskForm from '@/components/forms/new-task-form'
import Navbar from '@/components/navigation/navbar'
import TaskList from '@/components/task-list'

export default function ClientPage() {
  return (
    <div className="flex h-screen flex-col gap-y-4 px-4 py-2">
      <Navbar />
      <NewTaskForm />
      <TaskList />
    </div>
  )
}
