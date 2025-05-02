"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useBox, useConeTwistConstraint } from "@react-three/cannon"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

// Create a waffle texture
function createWaffleTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext("2d")

  // Background color - golden waffle color
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
}

export function FloppyWaffle({ initialPosition, isEjected = false }) {
  const { camera, raycaster, mouse } = useThree()
  const waffleRef = useRef()
  const segmentRefs = useRef([])
  const constraintRefs = useRef([])

  // State for interaction
  const [isDragging, setIsDragging] = useState(false)
  const [dragPlane, setDragPlane] = useState(new THREE.Plane())
  const [draggedSegmentApi, setDraggedSegmentApi] = useState(null)

  // Create a waffle texture
  const waffleTexture = useMemo(() => createWaffleTexture(), [])

  // Configuration for the waffle grid
  const gridSize = 3 // 3x3 grid
  const segmentSize = 0.6 // Size of each segment
  const totalSize = gridSize * segmentSize

  // Create the waffle segments in a grid
  const segments = useMemo(() => {
    const segs = []
    const halfTotal = totalSize / 2 - segmentSize / 2

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const xPos = initialPosition[0] - halfTotal + x * segmentSize
        const zPos = initialPosition[2] - halfTotal + z * segmentSize

        segs.push({
          position: [xPos, initialPosition[1], zPos],
          key: `${x}-${z}`,
          indices: [x, z],
        })
      }
    }
    return segs
  }, [initialPosition, gridSize, segmentSize, totalSize])

  // Handle mouse down on waffle segment
  const handleSegmentMouseDown = (e, api) => {
    e.stopPropagation()
    setIsDragging(true)
    setDraggedSegmentApi(api)

    // Create a drag plane perpendicular to the camera
    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion)
    const segmentPosition = new THREE.Vector3(...e.object.position)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, segmentPosition)
    setDragPlane(plane)

    // Make cursor indicate grabbing
    document.body.style.cursor = "grabbing"
  }

  // Handle mouse move and update positions
  useFrame(() => {
    if (!isDragging || !draggedSegmentApi) return

    // Create a ray from the camera through the mouse position
    raycaster.setFromCamera(mouse, camera)

    // Find intersection with the drag plane
    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, intersection)

    // Add boundaries to keep the waffle on screen
    const boundedX = Math.max(-12, Math.min(12, intersection.x))
    const boundedY = Math.max(1.7, Math.min(10, intersection.y))
    const boundedZ = Math.max(-12, Math.min(12, intersection.z))

    // Update physics body position of the dragged segment
    draggedSegmentApi.position.set(boundedX, boundedY, boundedZ)
  })

  // Handle mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDraggedSegmentApi(null)
        document.body.style.cursor = "auto"
      }
    }

    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [isDragging])

  // Create a single waffle segment
  const WaffleSegment = ({ position, indices }) => {
    const [ref, api] = useBox(() => ({
      mass: 0.05, // Very light for floppiness
      position,
      args: [segmentSize, 0.1, segmentSize], // Thin segments
      material: {
        friction: 0.3,
        restitution: 0.2,
      },
      linearDamping: 0.1,
      angularDamping: 0.1,
      velocity: isEjected ? [(Math.random() - 0.5) * 1, 8 + Math.random() * 3, (Math.random() - 0.5) * 1] : [0, 0, 0],
      angularVelocity: isEjected ? [Math.random() * 5, Math.random() * 5, Math.random() * 5] : [0, 0, 0],
    }))

    // Store the ref and api for later use with constraints
    useEffect(() => {
      const index = indices[0] * gridSize + indices[1]
      segmentRefs.current[index] = { ref, api }
    }, [indices, gridSize])

    return (
      <mesh
        ref={ref}
        castShadow
        receiveShadow
        onPointerDown={(e) => handleSegmentMouseDown(e, api)}
        onPointerOver={() => (document.body.style.cursor = "grab")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[segmentSize, 0.1, segmentSize]} />
        <meshStandardMaterial
          map={waffleTexture}
          bumpMap={waffleTexture}
          bumpScale={0.05}
          side={THREE.DoubleSide}
          color={isDragging && api === draggedSegmentApi ? "#ffe0a0" : "#f0c080"}
        />
      </mesh>
    )
  }

  // Create constraints between segments
  useEffect(() => {
    // Initialize the refs array
    segmentRefs.current = Array(gridSize * gridSize).fill(null)
    constraintRefs.current = [] // Initialize constraintRefs

    // Wait for all segments to be created
    const timer = setTimeout(() => {
      // Create constraints between adjacent segments
      for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
          const currentIndex = x * gridSize + z
          const current = segmentRefs.current[currentIndex]

          if (!current || !current.ref) continue

          // Connect to right neighbor
          if (z < gridSize - 1) {
            const rightIndex = x * gridSize + (z + 1)
            const right = segmentRefs.current[rightIndex]

            if (right && right.ref) {
              // Define constraint options
              const constraintOptions = {
                pivotA: [segmentSize / 2, 0, 0],
                pivotB: [-segmentSize / 2, 0, 0],
                axisA: [1, 0, 0],
                axisB: [1, 0, 0],
                twistAngle: 0.2, // Allow some twisting
                swingAngle: 0.5, // Allow significant bending
              }

              // Use the constraint
              const [, constraintApi] = useConeTwistConstraint(current.ref, right.ref, constraintOptions)
              constraintRefs.current.push(constraintApi)
            }
          }

          // Connect to bottom neighbor
          if (x < gridSize - 1) {
            const bottomIndex = (x + 1) * gridSize + z
            const bottom = segmentRefs.current[bottomIndex]

            if (bottom && bottom.ref) {
              // Define constraint options
              const constraintOptions = {
                pivotA: [0, 0, segmentSize / 2],
                pivotB: [0, 0, -segmentSize / 2],
                axisA: [0, 0, 1],
                axisB: [0, 0, 1],
                twistAngle: 0.2, // Allow some twisting
                swingAngle: 0.5, // Allow significant bending
              }

              // Use the constraint
              const [, constraintApi] = useConeTwistConstraint(current.ref, bottom.ref, constraintOptions)
              constraintRefs.current.push(constraintApi)
            }
          }
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [gridSize, segmentSize])

  return (
    <group ref={waffleRef}>
      {segments.map((segment) => (
        <WaffleSegment key={segment.key} position={segment.position} indices={segment.indices} />
      ))}
    </group>
  )
}
