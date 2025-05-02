"use client"

import { useRef, useState, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useBox } from "@react-three/cannon"
import * as THREE from "three"
import { Html } from "@react-three/drei"

export function Toaster({ position, onWaffleShoot, floorLevel = 1.5 }) {
  const { camera, raycaster, mouse } = useThree()
  const toasterRef = useRef()
  const leverRef = useRef()
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio("/ding.mp3") : null)

  // State for interaction
  const [isDragging, setIsDragging] = useState(false)
  const [leverY, setLeverY] = useState(0) // Direct lever Y position
  const [dragPlane, setDragPlane] = useState(new THREE.Plane())
  const [debugMessage, setDebugMessage] = useState("")

  // Physics for the toaster body
  const [toasterBody, toasterApi] = useBox(() => ({
    mass: 5,
    position,
    args: [2, 1.5, 1.2], // Width, height, depth
    allowSleep: false,
  }))

  // Handle mouse down on toaster
  const handleToasterMouseDown = (e) => {
    e.stopPropagation()
    setIsDragging(true)
    setDebugMessage("Dragging toaster")

    // Create a drag plane perpendicular to the camera
    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, toasterBody.current.position.clone())
    setDragPlane(plane)

    // Disable physics while dragging
    toasterApi.mass.set(0)
  }

  const handleLeverClick = (e) => {
    // Stop event propagation to prevent toaster from being picked up
    e.stopPropagation()

    setDebugMessage("Lever clicked!")

    // If lever is up, pull it down
    if (leverY === 0) {
      setLeverY(-0.8) // Pull lever down

      // After a short delay, shoot a waffle and reset the lever
      setTimeout(() => {
        // Play ding sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch((e) => console.log("Audio play failed:", e))
        }

        // Shoot waffle from the toaster slots - get current position
        if (toasterBody.current) {
          // Get the CURRENT position of the toaster at the moment of shooting
          const toasterPosition = new THREE.Vector3()
          toasterBody.current.getWorldPosition(toasterPosition)

          // Position the waffle directly above the toaster slots
          const shootPosition = [toasterPosition.x, toasterPosition.y + 1.0, toasterPosition.z]
          console.log("Shooting waffle from toaster slots at position:", shootPosition)
          onWaffleShoot(shootPosition)
        }

        // Reset lever after a delay
        setTimeout(() => {
          setLeverY(0)
        }, 500)
      }, 200)
    }
  }

  // Handle mouse move and update positions
  useFrame(() => {
    if (!toasterBody.current) return

    // Always enforce minimum height constraint
    const currentPos = toasterBody.current.position.clone()
    const minHeight = floorLevel + 1
    if (currentPos.y < minHeight) {
      toasterApi.position.set(currentPos.x, minHeight, currentPos.z)
      toasterApi.velocity.set(0, 0, 0)
    }

    if (isDragging) {
      // Create a ray from the camera through the mouse position
      raycaster.setFromCamera(mouse, camera)

      // Find intersection with the drag plane
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(dragPlane, intersection)

      // Add boundaries to keep the toaster on screen
      const boundedX = Math.max(-12, Math.min(12, intersection.x))
      const boundedY = Math.max(minHeight, Math.min(10, intersection.y))
      const boundedZ = Math.max(-12, Math.min(12, intersection.z))

      // Update physics body position
      toasterApi.position.set(boundedX, boundedY, boundedZ)
    }
  })

  // Handle mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDebugMessage("")
        // Re-enable physics
        toasterApi.mass.set(5)
      }
    }

    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [isDragging, toasterApi])

  // Load audio on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/ding.mp3")
    }
  }, [])

  return (
    <group ref={toasterRef}>
      {/* Debug message */}
      {debugMessage && (
        <Html position={[0, 2, 0]}>
          <div className="bg-white p-1 rounded text-xs">{debugMessage}</div>
        </Html>
      )}

      {/* Toaster body */}
      <mesh ref={toasterBody} castShadow receiveShadow onPointerDown={handleToasterMouseDown}>
        <boxGeometry args={[2, 1.5, 1.2]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.2} />

        {/* Toaster slots */}
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[1.6, 0.1, 0.8]} />
          <meshStandardMaterial color="#333" />
        </mesh>

        {/* Toaster base */}
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[2.1, 0.2, 1.3]} />
          <meshStandardMaterial color="#d0d0d0" />
        </mesh>

        {/* Lever as a child of the toaster body */}
        <group ref={leverRef} position={[1.1, 0.2, 0]}>
          {/* Lever base/slot */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.2, 0.1, 0.4]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          {/* Lever handle - MUCH larger and more visible */}
          <mesh
            position={[0.3, leverY, 0]}
            castShadow
            onClick={handleLeverClick}
            onPointerDown={(e) => {
              // Stop propagation to prevent toaster from being picked up
              e.stopPropagation()
            }}
          >
            <boxGeometry args={[0.4, 0.5, 0.5]} />
            <meshStandardMaterial
              color="#ff0000"
              metalness={0.5}
              roughness={0.3}
              emissive="#ff0000"
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Lever shaft */}
          <mesh position={[0.15, leverY / 2, 0]} castShadow>
            <boxGeometry args={[0.1, Math.abs(leverY) + 0.1, 0.1]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        </group>
      </mesh>

      {/* Removed the test lever button from here */}
    </group>
  )
}
