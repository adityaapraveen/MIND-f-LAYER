import { useState } from 'react'

export default function EndpointCard({
    method,
    path,
    description,
    fields,
    onSubmit,
}) {
    const [open, setOpen] = useState(false)
    const [formData, setFormData] = useState(() => {
        const defaults = {}
        if (fields) {
            fields.forEach((f) => {
                defaults[f.name] = f.default ?? ''
            })
        }
        return defaults
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState(null)

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setResponse(null)
        try {
            const res = await onSubmit(formData)
            setResponse(res)
        } catch (err) {
            setResponse({
                status: 0,
                ok: false,
                data: { error: err.message },
                time: 0,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="endpoint-card">
            <div
                className="endpoint-header"
                onClick={() => setOpen(!open)}
                id={`endpoint-${method}-${path.replace(/\//g, '-')}`}
            >
                <span className={`method-badge ${method.toLowerCase()}`}>
                    {method}
                </span>
                <span className="endpoint-path">{path}</span>
                <span className="endpoint-desc">{description}</span>
                <span className={`endpoint-chevron ${open ? 'open' : ''}`}>▾</span>
            </div>

            {open && (
                <form className="endpoint-body" onSubmit={handleSubmit}>
                    {fields &&
                        fields.map((field) => (
                            <div className="input-group" key={field.name}>
                                <label htmlFor={`field-${field.name}`}>{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        id={`field-${field.name}`}
                                        className="input"
                                        value={formData[field.name]}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                    >
                                        {field.options.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        id={`field-${field.name}`}
                                        className="input"
                                        placeholder={field.placeholder}
                                        value={formData[field.name]}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        rows={3}
                                    />
                                ) : field.type === 'number' ? (
                                    <input
                                        id={`field-${field.name}`}
                                        className="input input-mono"
                                        type="number"
                                        placeholder={field.placeholder}
                                        value={formData[field.name]}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        min={field.min}
                                        max={field.max}
                                    />
                                ) : (
                                    <input
                                        id={`field-${field.name}`}
                                        className="input"
                                        type={field.type || 'text'}
                                        placeholder={field.placeholder}
                                        value={formData[field.name]}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                    <button
                        type="submit"
                        className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        Send Request
                    </button>

                    {response && (
                        <div className="response-panel">
                            <div className="response-header">
                                <span
                                    className={`status-badge ${response.ok ? 'success' : 'error'
                                        }`}
                                >
                                    {response.status}
                                </span>
                                <span>{response.ok ? 'Success' : 'Error'}</span>
                                <span className="response-time">{response.time}ms</span>
                            </div>
                            <div className="response-body">
                                <pre>{JSON.stringify(response.data, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </div>
    )
}
