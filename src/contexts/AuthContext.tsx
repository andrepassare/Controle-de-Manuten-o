import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { User, UserRole } from '@/types/pcm'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  refreshUser: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [user, setUser] = useState<User | null>(
    pb.authStore.record ? (pb.authStore.record as unknown as User) : null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const fresh = await pb.collection('users').getOne<User>(pb.authStore.record.id)
        setUser(fresh)
      } else {
        setUser(null)
        setToken(null)
      }
    } catch {
      // If token expired
      if (!pb.authStore.isValid) {
        setUser(null)
        setToken(null)
      }
    }
  }

  useEffect(() => {
    // Sync state on load
    const unsubscribe = pb.authStore.onChange((newToken, newRecord) => {
      setToken(newToken || null)
      setUser(newRecord ? (newRecord as unknown as User) : null)
    })

    if (pb.authStore.isValid && pb.authStore.record) {
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const signOut = () => {
    pb.authStore.clear()
    setToken(null)
    setUser(null)
  }

  const role: UserRole = (user?.role as UserRole) || 'operador'
  const isAdmin = role === 'admin'
  const isAuthenticated = !!token && !!user

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isAdmin,
      isLoading,
      refreshUser,
      signOut,
    }),
    [user, token, isAuthenticated, isAdmin, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
