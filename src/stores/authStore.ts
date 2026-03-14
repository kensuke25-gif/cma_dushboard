import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  initialize: async () => {
    // リスナーを先に登録し、OAuthリダイレクト後のイベントを取りこぼさない
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false })
    })

    // getSession() が INITIAL_SESSION イベントを発火し、上のリスナーが処理する
    await supabase.auth.getSession()
  },

  signInWithGoogle: async () => {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
