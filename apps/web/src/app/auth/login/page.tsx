'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const emailValue = watch('email')
  const passwordValue = watch('password')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const tokens = await authService.login(data)
      setAuth(tokens)
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
      const destination = payload.role === 'DOORMAN' ? '/portaria' : '/dashboard'
      router.push(destination)
    } catch {
      toast.error('E-mail ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">CondoFortis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão de Condomínios</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-blue-100/50 dark:shadow-none px-6 py-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Campo Email */}
            <div className="relative">
              <label
                className={`absolute left-12 transition-all duration-150 pointer-events-none text-gray-400 dark:text-gray-500 ${
                  emailValue
                    ? 'top-2 text-xs text-blue-500 dark:text-blue-400'
                    : 'top-1/2 -translate-y-1/2 text-sm'
                }`}
              >
                Email
              </label>
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full h-16 pl-12 pr-4 pt-5 pb-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 pl-1">{errors.email.message}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <label
                className={`absolute left-12 transition-all duration-150 pointer-events-none text-gray-400 dark:text-gray-500 ${
                  passwordValue
                    ? 'top-2 text-xs text-blue-500 dark:text-blue-400'
                    : 'top-1/2 -translate-y-1/2 text-sm'
                }`}
              >
                Senha
              </label>
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full h-16 pl-12 pr-12 pt-5 pb-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base rounded-2xl transition-colors disabled:opacity-60 shadow-md shadow-blue-200 dark:shadow-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
