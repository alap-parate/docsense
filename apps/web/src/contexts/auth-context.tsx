import * as React from "react"
import type { User } from "@supabase/supabase-js"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import apiClient from "@/lib/api"
import { useWorkspaceStore } from "@/store/workspace-store"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

// Track if we've synced for this session to avoid duplicate syncs
let lastSyncedSessionId: string | null = null

async function syncUser(session: Session | null) {
  if (!session?.access_token) return

  // Skip if we've already synced this session
  if (lastSyncedSessionId === session.access_token) return

  try {
    await apiClient.post("/api/v1/auth/sync", {}, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
    lastSyncedSessionId = session.access_token
  } catch (error) {
    // Silently fail - sync errors shouldn't block the app
    console.error("Failed to sync user:", error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // Sync user on initial session load
      if (session) {
        syncUser(session)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Sync user when session is established (SIGNED_IN event)
      if (event === "SIGNED_IN" && session) {
        await syncUser(session)
      } else if (event === "SIGNED_OUT") {
        // Reset sync tracking on sign out
        lastSyncedSessionId = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    // Clear all Zustand stores
    useWorkspaceStore.getState().clearWorkspace()
    
    // Clear persisted storage from localStorage
    localStorage.removeItem("workspace-storage")
    
    // Sign out from Supabase
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
