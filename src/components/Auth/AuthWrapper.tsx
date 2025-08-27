import { useState, useEffect } from "react"
import { authService } from "../../services/authService"
import type { User } from "../../types/auth"
import LoginForm from "./LoginForm"
import RegisterForm from "./RegisterForm"

interface AuthWrapperProps {
  children: (user: User) => React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user)
      setIsAuthenticated(user !== null)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleSwitchMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return authMode === "login" ? (
      <LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={handleSwitchMode} />
    ) : (
      <RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={handleSwitchMode} />
    )
  }

  return <>{children(currentUser)}</>
}