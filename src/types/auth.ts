// src/types/auth.ts
export interface User {
  id: string;
  officeName: string;
  oabNumber: string;
  email: string;
  createdAt: string;
}

// Se quiser, crie tipos auxiliares para inputs de tela:
export interface RegisterInput {
  officeName: string;
  oabNumber: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}


export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}