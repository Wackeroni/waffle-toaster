"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Title } from "@/components/title"

// Dynamically import the 3D scene to avoid SSR issues
const WaffleToaster = dynamic(() => import("@/components/waffle-toaster"), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between">
      <Title />
      <Suspense fallback={<div className="text-center">Loading 3D scene...</div>}>
        <WaffleToaster />
      </Suspense>
    </main>
  )
}
