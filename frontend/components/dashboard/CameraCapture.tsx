"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, SwitchCamera, X, Loader2, AlertCircle } from "lucide-react"
import { hasCameraSupport } from "@/lib/device-utils"
import { logger } from "@/lib/utils/logger"


interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel: () => void
}

type CameraState = "initializing" | "ready" | "error" | "capturing"
type FacingMode = "environment" | "user"

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>("initializing")
  const [facingMode, setFacingMode] = useState<FacingMode>("environment")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

  // Check for multiple cameras
  useEffect(() => {
    async function checkCameras() {
      if (!hasCameraSupport()) return

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === "videoinput")
        setHasMultipleCameras(videoDevices.length > 1)
      } catch {
        // Ignore - will just not show switch button
      }
    }
    checkCameras()
  }, [])

  // Initialize camera stream
  const startCamera = useCallback(async (facing: FacingMode) => {
    setCameraState("initializing")
    setErrorMessage("")

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (!hasCameraSupport()) {
      setErrorMessage("Camera is not supported on this device or browser.")
      setCameraState("error")
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraState("ready")
      }
    } catch (error: unknown) {
      logger.error("Camera capture error", error)
      const err = error as { name?: string }

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera access was denied. Please enable camera permissions in your browser settings.")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No camera found on this device.")
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setErrorMessage("Camera is in use by another application.")
      } else if (err.name === "OverconstrainedError") {
        // Try again with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = basicStream
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream
            await videoRef.current.play()
            setCameraState("ready")
            return
          }
        } catch {
          setErrorMessage("Could not access camera with requested settings.")
        }
      } else {
        setErrorMessage("Failed to access camera. Please try again.")
      }

      setCameraState("error")
    }
  }, [])

  // Start camera on mount
  useEffect(() => {
    startCamera(facingMode)

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  // Intentionally run once on mount only — camera switching is handled by handleSwitchCamera
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch camera
  const handleSwitchCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment"
    setFacingMode(newFacing)
    startCamera(newFacing)
  }, [facingMode, startCamera])

  // Capture photo
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cameraState !== "ready") {
      return
    }

    setCameraState("capturing")

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      setCameraState("ready")
      return
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const file = new File([blob], `receipt-${timestamp}.jpg`, {
            type: "image/jpeg",
          })
          onCapture(file)
        } else {
          setCameraState("ready")
          setErrorMessage("Failed to capture photo. Please try again.")
        }
      },
      "image/jpeg",
      0.92 // High quality JPEG
    )
  }, [cameraState, onCapture])

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    onCancel()
  }, [onCancel])

  return (
    <div className="relative w-full">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Preview */}
      <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden">
        {cameraState === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}

        {cameraState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-6">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <p className="text-sm text-center text-muted-foreground mb-4">{errorMessage}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => startCamera(facingMode)}>
                Try Again
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          } ${cameraState !== "ready" ? "invisible" : ""}`}
        />

        {/* Capture overlay guide */}
        {cameraState === "ready" && (
          <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
          </div>
        )}

        {/* Camera controls overlay */}
        {cameraState === "ready" && (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
            {/* Cancel button */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={handleCancel}
            >
              <X className="h-6 w-6 text-white" />
            </Button>

            {/* Capture button */}
            <Button
              type="button"
              size="icon"
              className="h-16 w-16 rounded-full bg-white hover:bg-white/90 shadow-lg"
              onClick={handleCapture}
            >
              <Camera className="h-8 w-8 text-black" />
            </Button>

            {/* Switch camera button */}
            {hasMultipleCameras ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                onClick={handleSwitchCamera}
              >
                <SwitchCamera className="h-6 w-6 text-white" />
              </Button>
            ) : (
              <div className="h-12 w-12" /> // Spacer for layout balance
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {cameraState === "ready" && (
        <p className="text-center text-sm text-muted-foreground mt-3">
          Position the receipt within the frame and tap the capture button
        </p>
      )}
    </div>
  )
}
