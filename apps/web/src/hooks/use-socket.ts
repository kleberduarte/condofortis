'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

export function useSocket(condominiumId?: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      setConnected(true)
      if (condominiumId) {
        socket.emit('join:condo', condominiumId)
      }
    })

    socket.on('disconnect', () => setConnected(false))

    socketRef.current = socket

    return () => {
      if (condominiumId) socket.emit('leave:condo', condominiumId)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [accessToken, condominiumId])

  function on<T>(event: string, handler: (data: T) => void) {
    socketRef.current?.on(event, handler)
    return () => { socketRef.current?.off(event, handler) }
  }

  return { socket: socketRef.current, connected, on }
}
