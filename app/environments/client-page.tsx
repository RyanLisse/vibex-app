'use client'
import Navbar from '@/components/navigation/navbar'
import EnvironmentsList from './_components/environments-list'

export default function EnvironmentsClientPage() {
  return (
    <div className="flex flex-col gap-y-4 px-4 py-2 h-screen">
      <Navbar />
      <EnvironmentsList />
    </div>
  )
}
