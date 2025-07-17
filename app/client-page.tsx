'use client'

import Navbar from '@/components/navigation/navbar'
import TaskList from '@/components/task-list'
import NewTaskForm from '@/components/forms/new-task-form'

export default function ClientPage() {
  return (
    <div className="flex flex-col px-4 py-2 h-screen gap-y-4">
      <Navbar />
      <NewTaskForm />
      <TaskList />
    </div>
  )
}
