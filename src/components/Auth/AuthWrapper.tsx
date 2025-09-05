import { useState, useEffect } from "react"
import { authService } from "../../services/authService"
import { adminService } from "../../services/adminService"
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
  const [processingInvites, setProcessingInvites] = useState(false)
  const [inviteProcessResult, setInviteProcessResult] = useState<{
    processed: number;
    errors: string[];
  } | null>(null)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user)
      setIsAuthenticated(user !== null)
      setIsLoading(false)

      // Processar convites pendentes quando usuário faz login
      if (user !== null) {
        processePendingInvites()
      }
    })

    return () => unsubscribe()
  }, [])

  const processePendingInvites = async () => {
    try {
      setProcessingInvites(true)
      
      // Verificar se há convites pendentes
      const pendingInvites = adminService.getPendingInvites()
      
      if (pendingInvites.length === 0) {
        return
      }

      console.log(`Processando ${pendingInvites.length} convites pendentes...`)
      
      // Aguardar um pouco para garantir que a autenticação foi totalmente processada
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result = await adminService.processPendingInvites()
      setInviteProcessResult(result)
      
      if (result.processed > 0) {
        console.log(`${result.processed} convites processados com sucesso`)
        
        // Mostrar notificação de sucesso
        setTimeout(() => {
          alert(`Ótimo! ${result.processed} convite(s) foram processados automaticamente. Você agora tem acesso às equipes.`)
        }, 1500)
      }
      
      if (result.errors.length > 0) {
        console.warn('Erros ao processar alguns convites:', result.errors)
      }
      
    } catch (error) {
      console.error('Erro ao processar convites pendentes:', error)
    } finally {
      setProcessingInvites(false)
      
      // Limpar resultado após alguns segundos
      setTimeout(() => {
        setInviteProcessResult(null)
      }, 10000)
    }
  }

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    // processePendingInvites será chamado automaticamente via onAuthStateChanged
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

  // Mostrar tela de processamento de convites se necessário
  if (processingInvites) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processando Convites</h2>
          <p className="text-gray-600 mb-4">
            Verificando convites pendentes e adicionando você às equipes...
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              Isso pode levar alguns segundos. Por favor, aguarde.
            </p>
          </div>
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

  return (
    <>
      {children(currentUser)}
      
      {/* Notificação de resultado de convites processados */}
      {inviteProcessResult && inviteProcessResult.processed > 0 && (
        <div className="fixed top-4 right-4 max-w-sm bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Convites Processados!
              </p>
              <p className="text-sm text-green-700 mt-1">
                {inviteProcessResult.processed} convite(s) foram aceitos automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notificação de erros */}
      {inviteProcessResult && inviteProcessResult.errors.length > 0 && (
        <div className="fixed top-4 right-4 max-w-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">
                Alguns Convites Não Puderam Ser Processados
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {inviteProcessResult.errors.length} erro(s) encontrado(s). Verifique os convites manualmente.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}