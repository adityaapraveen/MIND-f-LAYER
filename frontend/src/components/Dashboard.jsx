import { useState, useEffect, useCallback } from 'react'
import EndpointCard from './EndpointCard'
import * as api from '../services/api'

const CONTENT_TYPES = ['article', 'video', 'tweet', 'document', 'audio', 'image', 'other']
const TYPE_ICONS = {
    article: '📄', video: '🎬', tweet: '🐦', document: '📋',
    audio: '🎵', image: '🖼️', other: '📦',
}

const SECTIONS = [
    { id: 'content', label: 'Content', icon: '📦' },
    { id: 'brain', label: 'Brain AI', icon: '🧠' },
    { id: 'share', label: 'Share', icon: '🔗' },
]

export default function Dashboard({ token, username, onLogout }) {
    const [activeSection, setActiveSection] = useState('content')
    const [content, setContent] = useState([])
    const [contentLoading, setContentLoading] = useState(false)
    const [toasts, setToasts] = useState([])
    const [activeHash, setActiveHash] = useState(null)

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now()
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const fetchContent = useCallback(async () => {
        setContentLoading(true)
        const res = await api.getContent(token)
        if (res.ok) {
            setContent(res.data.content || [])
        }
        setContentLoading(false)
    }, [token])

    // Check current share status
    const checkShareStatus = useCallback(async () => {
        const res = await api.brainShare(token, 'status') // Just pinging to see if exists
        if (res.ok && res.data.hash) {
            setActiveHash(res.data.hash)
        }
    }, [token])

    useEffect(() => {
        fetchContent()
        checkShareStatus()
    }, [fetchContent, checkShareStatus])

    const handleDeleteContent = async (contentId) => {
        const res = await api.deleteContent(token, contentId)
        if (res.ok) {
            addToast('Content deleted', 'success')
            fetchContent()
        } else {
            addToast(res.data.error || 'Delete failed', 'error')
        }
    }

    // Endpoint definitions
    const contentEndpoints = [
        {
            method: 'POST',
            path: '/api/v1/content',
            description: 'Create content',
            fields: [
                { name: 'title', label: 'Title', placeholder: 'React Hooks Guide' },
                { name: 'link', label: 'Link', placeholder: 'https://...', type: 'url' },
                {
                    name: 'type', label: 'Type', type: 'select',
                    options: CONTENT_TYPES, default: 'article',
                },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description...' },
                { name: 'tags', label: 'Tags (comma separated)', placeholder: 'react, hooks, javascript' },
            ],
            onSubmit: async (data) => {
                const tags = data.tags
                    ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
                    : []
                const res = await api.createContent(token, {
                    title: data.title,
                    link: data.link,
                    type: data.type,
                    description: data.description || '',
                    tags,
                })
                if (res.ok) {
                    addToast('Content created!', 'success')
                    fetchContent()
                }
                return res
            },
        },
        {
            method: 'GET',
            path: '/api/v1/content',
            description: 'Get all content',
            fields: [
                {
                    name: 'type', label: 'Filter by type (optional)', type: 'select',
                    options: ['', ...CONTENT_TYPES], default: '',
                },
                { name: 'tag', label: 'Filter by tag (optional)', placeholder: 'react' },
            ],
            onSubmit: async (data) => {
                const params = {}
                if (data.type) params.type = data.type
                if (data.tag) params.tag = data.tag
                const res = await api.getContent(token, params)
                if (res.ok) setContent(res.data.content || [])
                return res
            },
        },
    ]

    const brainEndpoints = [
        {
            method: 'POST',
            path: '/api/v1/brain/query',
            description: 'AI-powered query',
            fields: [
                { name: 'query', label: 'Query', placeholder: 'What do I know about React hooks?' },
                { name: 'topK', label: 'Top K results', type: 'number', default: '5', min: 1, max: 20 },
            ],
            onSubmit: async (data) => {
                return await api.brainQuery(token, data.query, parseInt(data.topK) || 5)
            },
        },
    ]

    const shareEndpoints = [
        {
            method: 'POST',
            path: '/api/v1/brain/share',
            description: 'Toggle share link',
            fields: [
                {
                    name: 'share', label: 'ACTION', type: 'select',
                    options: ['true', 'false'], default: 'true',
                },
            ],
            onSubmit: async (data) => {
                const res = await api.brainShare(token, data.share)
                if (res.ok) {
                    if (data.share === 'true' && res.data.hash) {
                        setActiveHash(res.data.hash)
                        addToast('Brain sharing enabled!', 'success')
                    } else {
                        setActiveHash(null)
                        addToast('Brain sharing disabled.', 'info')
                    }
                }
                return res
            },
        },
        {
            method: 'GET',
            path: '/api/v1/brain/:shareLink',
            description: 'Get shared brain',
            fields: [
                { name: 'hash', label: 'SHARE HASH', placeholder: 'abc123def456' },
            ],
            onSubmit: async (data) => {
                return await api.getSharedBrain(data.hash)
            },
        },
    ]

    const endpointMap = {
        content: contentEndpoints,
        brain: brainEndpoints,
        share: shareEndpoints,
    }

    const sectionTitles = {
        content: { title: 'Content Management', desc: 'Create, browse, and manage your saved content.' },
        brain: { title: 'Brain AI', desc: 'Query your second brain with AI-powered semantic search.' },
        share: { title: 'Share & Collaborate', desc: 'Generate share links and access shared brains.' },
    }

    return (
        <div className="dashboard">
            <nav className="navbar">
                <div className="navbar-brand">
                    <span className="brain-icon">🧠</span>
                    Second Brain
                </div>
                <div className="navbar-actions">
                    <span className="navbar-user">@{username}</span>
                    <button className="btn btn-ghost btn-sm" onClick={onLogout} id="logout-btn">
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                <aside className="sidebar">
                    <div className="sidebar-section">
                        <div className="sidebar-label">Endpoints</div>
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                className={`sidebar-item ${activeSection === s.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(s.id)}
                                id={`sidebar-${s.id}`}
                            >
                                <span className="item-icon">{s.icon}</span>
                                {s.label}
                                <span className="item-badge">
                                    {endpointMap[s.id]?.length || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="sidebar-section">
                        <div className="sidebar-label">Status</div>
                        <div className="sidebar-item" style={{ cursor: 'default' }}>
                            <span className="item-icon">🌐</span>
                            Sharing: {activeHash ? <span style={{ color: 'var(--accent-emerald)' }}>ON</span> : 'OFF'}
                        </div>
                    </div>
                </aside>

                <main className="main-area">
                    <div className="main-header">
                        <h2>{sectionTitles[activeSection]?.title}</h2>
                        <p>{sectionTitles[activeSection]?.desc}</p>
                    </div>

                    {activeSection === 'share' && activeHash && (
                        <div className="brain-answer" style={{ marginBottom: 24, borderLeft: '3px solid var(--accent-emerald)' }}>
                            <div className="brain-answer-label">✅ YOUR PUBLIC SHARE LINK</div>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-emerald)', wordBreak: 'break-all' }}>
                                {window.location.origin}/share/{activeHash}
                            </p>
                            <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                                <span>Share this hash: <strong>{activeHash}</strong></span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/share/${activeHash}`);
                                        addToast('Link copied to clipboard!', 'success');
                                    }}
                                >
                                    Copy Link 📋
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="endpoint-section">
                        {endpointMap[activeSection]?.map((ep, idx) => (
                            <div key={idx} style={{ marginBottom: 12 }}>
                                <EndpointCard
                                    method={ep.method}
                                    path={ep.path}
                                    description={ep.description}
                                    fields={ep.fields}
                                    onSubmit={ep.onSubmit}
                                />
                            </div>
                        ))}
                    </div>

                    {activeSection === 'content' && (
                        <>
                            <div className="main-header" style={{ marginTop: 32 }}>
                                <h2>Your Content</h2>
                                <p>{content.length} items saved</p>
                            </div>

                            {contentLoading ? (
                                <div className="empty-state">
                                    <div className="empty-icon">⏳</div>
                                    <h3>Loading...</h3>
                                </div>
                            ) : content.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📭</div>
                                    <h3>No content yet</h3>
                                    <p>Use the POST endpoint above to save your first piece of content.</p>
                                </div>
                            ) : (
                                <div className="content-grid">
                                    {content.map((item) => (
                                        <div className="content-item" key={item.id}>
                                            <div className="content-type-icon">
                                                {TYPE_ICONS[item.type] || '📦'}
                                            </div>
                                            <div className="content-info">
                                                <h4>{item.title}</h4>
                                                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: 2 }}>ID: {item.id}</p>
                                                <p>
                                                    {item.type} · <a href={item.link} target="_blank" rel="noreferrer">{item.link.slice(0, 40)}{item.link.length > 40 ? '...' : ''}</a>
                                                </p>
                                            </div>
                                            <div className="content-tags">
                                                {item.tags?.map((tag) => (
                                                    <span className="tag" key={tag}>{tag}</span>
                                                ))}
                                            </div>
                                            <button
                                                className="content-delete-btn"
                                                onClick={() => handleDeleteContent(item.id)}
                                                title="Delete"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            <div className="toast-container">
                {toasts.map((toast) => (
                    <div className={`toast ${toast.type}`} key={toast.id}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    )
}
