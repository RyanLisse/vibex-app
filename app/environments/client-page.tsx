"use client";
import EnvironmentsList from "@/app/environments/_components/environments-list";
import Navbar from "@/components/navigation/navbar";

export default function EnvironmentsClientPage() {
	return (
		<div className="flex h-screen flex-col gap-y-4 px-4 py-2">
			<Navbar />
			<EnvironmentsList />
		</div>
	);
}
