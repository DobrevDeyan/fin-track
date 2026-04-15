import { NextResponse } from "next/server"

export const revalidate = 3600 // Cache for 1 hour at the CDN layer

export async function GET() {
  const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD", {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: "Exchange rate fetch failed" },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
