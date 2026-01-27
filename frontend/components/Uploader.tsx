import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Upload } from "lucide-react"

export function Uploader() {
  const [file, setFile] = useState<File | null>(null)
  return (
    <div>
      <Button>
        <Upload />
        Upload
      </Button>
      <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Label>{file?.name}</Label>
    </div>
  )
}   
