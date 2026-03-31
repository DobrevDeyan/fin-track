export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4 sm:px-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}
