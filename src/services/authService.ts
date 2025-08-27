import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase.config"
import type { User } from "../types/auth"

class AuthService {
  private authStateListeners: ((user: User | null) => void)[] = []

  constructor() {
    // Vincula diretamente ao Firebase e notifica os listeners
    onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Estado de autenticação mudou:', firebaseUser?.uid)
      
      if (firebaseUser) {
        try {
          const userData = await this.getUserData(firebaseUser.uid)
          this.notifyAuthStateListeners(userData)
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error)
          this.notifyAuthStateListeners(null)
        }
      } else {
        this.notifyAuthStateListeners(null)
      }
    })
  }

  async register(
    userData: Omit<User, "id" | "createdAt" | "password">,
    password: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('Tentando registrar usuário:', userData.email)
      
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password)
      const firebaseUser = userCredential.user

      console.log('Usuário criado no Auth:', firebaseUser.uid)

      // AGUARDAR um momento para garantir que o token esteja disponível
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Forçar atualização do token
      await firebaseUser.getIdToken(true)

      // Criar dados do usuário no Firestore
      const newUser: User = {
        id: firebaseUser.uid,
        officeName: userData.officeName,
        oabNumber: userData.oabNumber,
        email: userData.email,
        createdAt: new Date().toISOString(),
      }

      // Tentar salvar no Firestore com retry
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          // Verificar se o usuário ainda está autenticado
          if (!auth.currentUser) {
            throw new Error('Usuário não está mais autenticado')
          }

          await setDoc(doc(db, "users", firebaseUser.uid), newUser)
          console.log('Dados salvos no Firestore com sucesso')
          break
          
        } catch (firestoreError: any) {
          retryCount++
          console.error(`Tentativa ${retryCount} falhou:`, firestoreError)
          
          if (retryCount >= maxRetries) {
            throw firestoreError
          }
          
          // Aguardar antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          
          // Tentar atualizar o token novamente
          await firebaseUser.getIdToken(true)
        }
      }

      return { success: true, message: "Cadastro realizado com sucesso!", user: newUser }
      
    } catch (error: any) {
      console.error("Erro completo ao registrar usuário:", error)
      
      let message = "Erro interno. Tente novamente."

      // Tratamento de erros específicos do Firebase
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Este e-mail já está sendo usado por outra conta."
          break
        case "auth/weak-password":
          message = "A senha é muito fraca. Use pelo menos 6 caracteres."
          break
        case "auth/invalid-email":
          message = "E-mail inválido."
          break
        case "auth/operation-not-allowed":
          message = "Operação não permitida. Verifique a configuração do Firebase."
          break
        case "permission-denied":
          message = "Erro de permissão no banco de dados. Tente novamente em alguns segundos."
          break
        case "unavailable":
          message = "Serviço temporariamente indisponível. Tente novamente."
          break
        default:
          message = `Erro: ${error.message || 'Erro desconhecido'}`
      }

      return { success: false, message }
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('Tentando fazer login:', email)
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      console.log('Login bem-sucedido no Auth:', firebaseUser.uid)
      
      const userData = await this.getUserData(firebaseUser.uid)

      if (!userData) {
        console.error('Dados do usuário não encontrados no Firestore')
        return { success: false, message: "Dados do usuário não encontrados." }
      }

      console.log('Dados do usuário recuperados:', userData)
      return { success: true, message: "Login realizado com sucesso!", user: userData }
      
    } catch (error: any) {
      console.error("Erro completo ao fazer login:", error)
      
      let message = "Erro interno. Tente novamente."

      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          message = "E-mail ou senha incorretos."
          break
        case "auth/wrong-password":
          message = "Senha incorreta."
          break
        case "auth/invalid-email":
          message = "E-mail inválido."
          break
        case "auth/user-disabled":
          message = "Conta desabilitada."
          break
        case "auth/too-many-requests":
          message = "Muitas tentativas. Tente novamente mais tarde."
          break
        case "auth/network-request-failed":
          message = "Erro de rede. Verifique sua conexão."
          break
        default:
          message = `Erro: ${error.message || 'Erro desconhecido'}`
      }

      return { success: false, message }
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth)
      console.log('Logout realizado com sucesso')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      throw error
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser
    if (!firebaseUser) return null
    
    return await this.getUserData(firebaseUser.uid)
  }

  private async getUserData(uid: string): Promise<User | null> {
    try {
      console.log('Buscando dados do usuário:', uid)
      
      const userDoc = await getDoc(doc(db, "users", uid))
      
      if (!userDoc.exists()) {
        console.log('Documento do usuário não existe')
        return null
      }
      
      const userData = { id: uid, ...(userDoc.data() as Omit<User, "id">) }
      console.log('Dados do usuário encontrados:', userData)
      
      return userData
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
      return null
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback)
    
    // Retorna função para remover o listener
    return () => {
      this.authStateListeners = this.authStateListeners.filter((cb) => cb !== callback)
    }
  }

  private notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach((callback) => callback(user))
  }
}

// Singleton
export const authService = new AuthService()