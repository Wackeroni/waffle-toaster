"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useBox } from "@react-three/cannon"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export function Waffle({ initialPosition, isEjected = false }) {
  const { camera, raycaster, mouse } = useThree()
  const waffleRef = useRef()
  const lastPositionRef = useRef(new THREE.Vector3(...initialPosition))
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))

  // State for interaction
  const [isDragging, setIsDragging] = useState(false)
  const [dragPlane, setDragPlane] = useState(new THREE.Plane())
  const [isLaunching, setIsLaunching] = useState(isEjected)

  // Create a waffle texture
  const waffleTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext("2d")

    // Background color - slightly more golden/yellow for a tastier waffle
    context.fillStyle = "#f0c080"
    context.fillRect(0, 0, 256, 256)

    // Grid pattern
    context.strokeStyle = "#b58d50"
    context.lineWidth = 4

    // Horizontal lines
    for (let i = 0; i <= 8; i++) {
      context.beginPath()
      context.moveTo(0, i * 32)
      context.lineTo(256, i * 32)
      context.stroke()
    }

    // Vertical lines
    for (let i = 0; i <= 8; i++) {
      context.beginPath()
      context.moveTo(i * 32, 0)
      context.lineTo(i * 32, 256)
      context.stroke()
    }

    // Add some darker spots for a more realistic waffle
    context.fillStyle = "#c07a40"
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const size = Math.random() * 10 + 5
      context.beginPath()
      context.arc(x, y, size, 0, Math.PI * 2)
      context.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  // Create a physics body for the waffle with different velocities based on whether it's ejected
  const [waffleBody, waffleApi] = useBox(() => ({
    mass: 0.3, // Lighter mass for floppier feel
    position: initialPosition,
    args: [1.8, 0.15, 1.8], // Thinner for more floppy feel
    material: {
      friction: 0.3,
      restitution: 0.6, // More bouncy
    },
    // Give it some initial velocity and rotation if ejected
    velocity: isEjected
      ? [
          (Math.random() - 0.5) * 1, // Smaller random X velocity for ejected waffles
          8 + Math.random() * 3, // Stronger upward Y velocity for ejected waffles
          (Math.random() - 0.5) * 1, // Smaller random Z velocity for ejected waffles
        ]
      : [0, 0, 0],
    angularVelocity: isEjected
      ? [
          Math.random() * 8, // More random rotation for floppier appearance
          Math.random() * 8,
          Math.random() * 8,
        ]
      : [0, 0, 0],
    linearDamping: 0.2, // Less air resistance for floppier movement
    angularDamping: 0.2, // Less rotational damping
  }))

  // If ejected, prevent interaction for a short time to let the animation complete
  useEffect(() => {
    if (isEjected) {
      setIsLaunching(true)
      const timer = setTimeout(() => {
        setIsLaunching(false)
      }, 500) // Wait half a second before allowing interaction
      return () => clearTimeout(timer)
    }
  }, [isEjected])

  // Handle mouse down on waffle
  const handleWaffleMouseDown = (e) => {
    if (isLaunching) return // Prevent interaction during launch

    e.stopPropagation()
    setIsDragging(true)

    // Create a drag plane perpendicular to the camera
    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, waffleBody.current.position.clone())
    setDragPlane(plane)

    // Disable physics while dragging
    waffleApi.mass.set(0)
  }

  // Handle mouse move and update positions
  useFrame(() => {
    if (!waffleBody.current || !isDragging) return

    // Create a ray from the camera through the mouse position
    raycaster.setFromCamera(mouse, camera)

    // Find intersection with the drag plane
    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, intersection)

    // Add boundaries to keep the waffle on screen
    const boundedX = Math.max(-12, Math.min(12, intersection.x))
    const boundedY = Math.max(1.7, Math.min(10, intersection.y))
    const boundedZ = Math.max(-12, Math.min(12, intersection.z))

    // Update physics body position
    waffleApi.position.set(boundedX, boundedY, boundedZ)
  })

  // Handle mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        // Re-enable physics
        waffleApi.mass.set(0.3)
      }
    }

    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [isDragging, waffleApi])

  // Create a deformation effect for floppiness
  const [deformation, setDeformation] = useState({ x: 0, y: 0, z: 0 })

  // Calculate velocity by tracking position changes
  useFrame(() => {
    if (!waffleBody.current || isDragging) return

    // Get current position
    const currentPosition = waffleBody.current.position.clone()

    // Calculate velocity based on position change
    const deltaTime = 1 / 60 // Assuming 60fps
    const velocity = currentPosition.clone().sub(lastPositionRef.current).divideScalar(deltaTime)

    // Update velocity ref
    velocityRef.current.copy(velocity)

    // Store current position for next frame
    lastPositionRef.current.copy(currentPosition)

    // Calculate deformation based on velocity
    const speed = velocity.length()
    const deformFactor = Math.min(speed * 0.05, 0.3) // Cap deformation

    // Apply some smoothing to the deformation
    setDeformation({
      x: deformation.x * 0.8 + velocity.x * 0.01,
      y: deformation.y * 0.8 + velocity.y * 0.01,
      z: deformation.z * 0.8 + velocity.z * 0.01,
    })
  })

  // Use a cylindrical shape for more rounded waffles
  return (
    <mesh
      ref={waffleBody}
      castShadow
      receiveShadow
      onPointerDown={handleWaffleMouseDown}
      // Make cursor change to indicate it's draggable
      onPointerOver={(e) => {
        if (!isLaunching) document.body.style.cursor = "grab"
      }}
      onPointerOut={(e) => {
        document.body.style.cursor = "auto"
      }}
    >
      <cylinderGeometry args={[1.0, 1.0, 0.15, 16]} /> {/* Cylinder for round waffle */}
      <meshStandardMaterial
        map={waffleTexture}
        bumpMap={waffleTexture}
        bumpScale={0.05}
        side={THREE.DoubleSide}
        color={isDragging ? "#ffe0a0" : "#f0c080"} // Highlight when dragging
        // Add some distortion to the material to simulate floppiness
        flatShading={true}
        roughness={0.8}
      />
      {/* Add some visual deformation to simulate floppiness */}
      <group position={[0, -0.05, 0]} scale={[1 + Math.abs(deformation.x) * 0.2, 1, 1 + Math.abs(deformation.z) * 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.95, 0.95, 0.05, 16]} />
          <meshStandardMaterial map={waffleTexture} color="#e0b070" transparent={true} opacity={0.7} />
        </mesh>
      </group>
    </mesh>
  )
}
