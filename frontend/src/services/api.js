const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/v1' 
    : '/api/v1'

function getHeaders(token) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

async function request(method, path, body, token) {
    const start = performance.now()

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers: getHeaders(token),
            body: body ? JSON.stringify(body) : undefined,
        })

        const elapsed = Math.round(performance.now() - start)
        const data = await res.json()

        return {
            status: res.status,
            ok: res.ok,
            data,
            time: elapsed,
        }
    } catch (err) {
        const elapsed = Math.round(performance.now() - start)
        return {
            status: 0,
            ok: false,
            data: { error: err.message || 'Network error' },
            time: elapsed,
        }
    }
}

// Auth
export const signup = (username, password) =>
    request('POST', '/auth/signup', { username, password })

export const signin = (username, password) =>
    request('POST', '/auth/signin', { username, password })

// Content
export const createContent = (token, body) =>
    request('POST', '/content', body, token)

export const getContent = (token, params = {}) => {
    let query = ''
    const parts = []
    if (params.type) parts.push(`type=${encodeURIComponent(params.type)}`)
    if (params.tag) parts.push(`tag=${encodeURIComponent(params.tag)}`)
    if (parts.length) query = `?${parts.join('&')}`
    return request('GET', `/content${query}`, null, token)
}

export const deleteContent = (token, contentId) =>
    request('DELETE', '/content', { contentId }, token)

// Brain
export const brainQuery = (token, query, topK = 5) =>
    request('POST', '/brain/query', { query, topK }, token)

export const brainSearch = (token, query, topK = 5) =>
    request('POST', '/brain/search', { query, topK }, token)

export const brainShare = (token, share = true) =>
    request('POST', '/brain/share', { share }, token)

export const getSharedBrain = (hash) =>
    request('GET', `/brain/${hash}`, null)
