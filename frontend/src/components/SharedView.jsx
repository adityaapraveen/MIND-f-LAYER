import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as api from '../services/api'

const TYPE_ICONS = {
    article: '📄', video: '🎬', tweet: '🐦', document: '📋',
    audio: '🎵', image: '🖼️', other: '📦',
}

export default function SharedView() {
    const { hash } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const res = await api.getSharedBrain(hash)
                if (res.ok) {
                    setData(res.data)
                } else {
                    setError(res.data.error || 'Failed to load shared brain')
                }
            } catch (err) {
                setError('Network error: ' + err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [hash])

    if (loading) {
        return (
            <div className="app">
                <div className="empty-state" style={{ marginTop: '100px' }}>
                    <div className="empty-icon">⏳</div>
                    <h3>Loading brain...</h3>
                    <p>Scanning the neural network for shared memories.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="app">
                <div className="empty-state" style={{ marginTop: '100px' }}>
                    <div className="empty-icon">❌</div>
                    <h3>Wait, whose brain is this?</h3>
                    <p>{error}</p>
                    <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>
                        Go Home
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="app">
            <nav className="navbar">
                <div className="navbar-brand">
                    <span className="brain-icon">🧠</span>
                    Second Brain / Shared
                </div>
                <div className="navbar-actions">
                    <Link to="/" className="btn btn-ghost btn-sm">Sign In</Link>
                </div>
            </nav>

            <main className="main-area" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                <div className="main-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</div>
                    <h2 style={{ fontSize: '2rem' }}>@{data.username}'s Brain</h2>
                    <p>Shared Vault · {data.count} items discovered</p>
                </div>

                <div className="content-grid">
                    {data.content.map((item) => (
                        <div className="content-item" key={item.id} style={{ padding: '20px' }}>
                            <div className="content-type-icon" style={{ width: '44px', height: '44px', fontSize: '1.5rem' }}>
                                {TYPE_ICONS[item.type] || '📦'}
                            </div>
                            <div className="content-info">
                                <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{item.title}</h4>
                                <p style={{ opacity: 0.7, marginBottom: '8px', fontSize: '0.85rem' }}>
                                    {item.description || 'No description provided.'}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                        {item.type}
                                    </span>
                                    <a href={item.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                        Visit Link ↗
                                    </a>
                                </div>
                            </div>
                            <div className="content-tags">
                                {item.tags?.map((tag) => (
                                    <span className="tag" key={tag}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {data.content.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <h3>Empty vault</h3>
                        <p>This brain doesn't have any shared memories yet.</p>
                    </div>
                )}

                <footer style={{ marginTop: '80px', textAlign: 'center', padding: '40px 0', borderTop: '1px solid var(--border-color)', opacity: 0.5, fontSize: '0.8rem' }}>
                    Powered by Second Brain & Gemini AI
                </footer>
            </main>
        </div>
    )
}
