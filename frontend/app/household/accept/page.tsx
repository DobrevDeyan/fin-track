import { Suspense } from "react"
import { AcceptInviteContent } from "./AcceptInviteContent"
import { Loader2 } from "lucide-react"

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </div>
  )
}
