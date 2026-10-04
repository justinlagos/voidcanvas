'use client'
export default function BrandError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#171916] p-8">
      <h1 className="text-2xl font-semibold">
        Guideline temporarily unavailable
      </h1>
      <p className="mt-3">
        We could not load this brand guideline. Please try again.
      </p>
      <button
        className="mt-5 rounded-lg border border-black/20 px-4 py-2"
        onClick={reset}
      >
        Try again
      </button>
    </main>
  )
}
