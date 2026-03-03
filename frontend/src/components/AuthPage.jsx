import { useState } from 'react'
import { signup, signin } from '../services/api'

export default function AuthPage({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const fn = isSignup ? signup : signin
            const res = await fn(username, password)

            if (res.ok) {
                onLogin(res.data.token, res.data.userId, username)
            } else {
                setError(res.data.error || res.data.details?.[0]?.message || 'Something went wrong')
            }
        } catch {
            setError('Network error — is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">🧠</div>
                    <h1>mind-f-layer</h1>
                    <p>Your AI-powered knowledge vault</p>
                </div>

                <form className="auth-card" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="auth-username">Username</label>
                        <input
                            id="auth-username"
                            className="input"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            className="input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isSignup ? 'new-password' : 'current-password'}
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        type="submit"
                        className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        {isSignup ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-toggle">
                    {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                    <button onClick={() => { setIsSignup(!isSignup); setError('') }}>
                        {isSignup ? 'Sign in' : 'Sign up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
