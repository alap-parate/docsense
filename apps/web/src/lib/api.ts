import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios"
import { supabase } from "./supabase"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error("Missing VITE_API_BASE_URL environment variable")
}

// API Response types based on the API contracts
export interface ApiResponse<T = unknown> {
  data: T | null
  meta?: {
    requestId?: string
    pagination?: {
      limit: number
      offset: number
      total: number
      page?: number
    }
  }
  error: {
    code: string
    message: string
    details?: unknown
  } | null
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response
  },
  async (error) => {
    // Handle 401 unauthorized - could trigger logout
    if (error.response?.status === 401) {
      // Optionally sign out user
      // await supabase.auth.signOut()
    }
    return Promise.reject(error)
  }
)

// API helper function
export async function api<T = unknown>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>({
    url: endpoint,
    ...config,
  })
  return response.data
}

export default apiClient
