"use client"

import { useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Physics, usePlane } from "@react-three/cannon"
import { Environment, PerspectiveCamera, Html } from "@react-three/drei"
import { Toaster } from "./toaster"
import { Waffle } from "./waffle"

// Floor component with physics
function Floor(props) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#f0f0f0" />
    </mesh>
  )
}

// Wall component with physics
function Wall({ position, rotation }) {
  const [ref] = usePlane(() => ({ position, rotation, type: "Static" }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[30, 10]} />
      <meshStandardMaterial color="#e8e8ff" />
    </mesh>
  )
}

// Instructions component
function Instructions() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <Html center position={[0, 8, 0]}>
      <div className="bg-white p-4 rounded-lg shadow-lg text-center" style={{ width: "300px" }}>
        <h2 className="text-xl font-bold mb-2">How to use:</h2>
        <ul className="text-left list-disc pl-5">
          <li className="mb-1">Click and drag the toaster to move it</li>
          <li className="mb-1">
            <span className="text-red-500 font-bold">CLICK the red lever</span> on the side to make waffles
          </li>
          <li className="mb-1">You can also drag the waffles around!</li>
        </ul>
        <button
          className="mt-2 px-4 py-1 bg-pink-500 text-white rounded hover:bg-pink-600"
          onClick={() => setVisible(false)}
        >
          Got it!
        </button>
      </div>
    </Html>
  )
}

// Debug component to show waffle count
function WaffleCounter({ count }) {
  return (
    <Html position={[-10, 9, 0]}>
      <div className="bg-white p-2 rounded-lg shadow-lg">
        <p className="font-bold">Waffles: {count}</p>
      </div>
    </Html>
  )
}

// Main scene component
export default function WaffleToaster() {
  const [waffles, setWaffles] = useState([])
  const [waffleId, setWaffleId] = useState(0)

  // Function to add a new waffle
  const addWaffle = (position) => {
    console.log("Adding waffle at position:", position)
    // Add a unique ID and the position for the new waffle
    const newWaffle = {
      id: waffleId,
      position,
      // We'll use this flag to indicate this is a freshly ejected waffle
      isEjected: true,
    }
    setWaffles((prev) => [...prev, newWaffle])
    setWaffleId((prev) => prev + 1)

    // Limit the number of waffles to prevent performance issues
    if (waffles.length > 20) {
      setWaffles((prev) => prev.slice(1))
    }
  }

  return (
    <div className="h-screen w-full">
      <Canvas shadows>
        {/* Adjusted camera position to see the floor better */}
        <PerspectiveCamera makeDefault position={[0, 7, 12]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow />
        <Physics
          gravity={[0, -9.8, 0]}
          defaultContactMaterial={{
            friction: 0.5,
            restitution: 0.3,
          }}
        >
          {/* Position floor ABOVE the bottom of the screen at y=1.5 */}
          <Floor position={[0, 1.5, 0]} />
          <Wall position={[0, 5, -15]} rotation={[0, 0, 0]} />
          <Wall position={[0, 5, 15]} rotation={[0, Math.PI, 0]} />
          <Wall position={[-15, 5, 0]} rotation={[0, Math.PI / 2, 0]} />
          <Wall position={[15, 5, 0]} rotation={[0, -Math.PI / 2, 0]} />

          {/* Start toaster higher above the floor */}
          <Toaster position={[0, 5, 0]} onWaffleShoot={addWaffle} floorLevel={1.5} />

          {/* Render all waffles */}
          {waffles.map((waffle) => (
            <Waffle key={waffle.id} initialPosition={waffle.position} isEjected={waffle.isEjected} />
          ))}

          <Instructions />
          <WaffleCounter count={waffles.length} />
        </Physics>
        <Environment preset="apartment" />
      </Canvas>
    </div>
  )
}
