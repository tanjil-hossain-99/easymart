import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLogin, useRegister } from "@/hooks/useAuth"
import { AUTH, AuthMode, ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"

type Props = { mode: AuthMode }

// Set by a protected page when it redirects here, so we can send the user back after login
type LocationState = { from?: string } | null

export function AuthPage({ mode }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const login = useLogin()
  const register = useRegister()
  const isLogin = mode === AuthMode.Login
  const mutation = isLogin ? login : register

  // If a protected page sent us here, go back there after login; otherwise home
  const from = (location.state as LocationState)?.from ?? ROUTES.home

  // Already logged in → no reason to see this page
  if (user) return <Navigate to={from} replace />

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">
        {isLogin ? "Log in" : "Create an account"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder={isLogin ? "Password" : `Password (min ${AUTH.passwordMinLength} characters)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isLogin ? undefined : AUTH.passwordMinLength}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {mutation.isError && (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        )}

        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {isLogin ? "No account? " : "Already have an account? "}
        {/* Pass "from" along so switching between login/signup keeps the redirect target */}
        <Link
          to={isLogin ? ROUTES.register : ROUTES.login}
          state={{ from }}
          className="text-primary underline"
        >
          {isLogin ? "Sign up" : "Log in"}
        </Link>
      </p>
    </div>
  )
}
