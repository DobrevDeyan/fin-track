import { MarketingNavbar } from "@/components/navigation/MarketingNavbar"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNavbar />
      {children}
    </>
  )
}
