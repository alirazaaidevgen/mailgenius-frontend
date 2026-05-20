'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, Mail, Send, Eye, CheckCircle2, Loader2, RefreshCw,
  X, AlertCircle, Zap, Sparkles, Users, MailCheck,
  FileText, Globe, LayoutDashboard, Trash2, Info,
} from 'lucide-react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DEFAULT_SUBJECT = `Quick question about paid guest posting on your site`

const DEFAULT_BODY = `Hi there,

I hope you're doing well!

I came across your website {website} while looking for quality sites in your niche, and I really liked the content you're putting out. The writing style and topics you cover caught my attention, which is why I'm reaching out.

I work with a few clients who are looking to publish paid guest posts on relevant blogs, and your site seems like a great fit. I'd love to explore the possibility of working together on a few placements.

Could you please share a few details when you get a chance?

- Your pricing for a guest post
- Content guidelines or any requirements you follow
- Niches or categories you currently accept
- Whether do-follow links are allowed

If you have a media kit or rate sheet handy, that would be perfect too. I'm happy to move forward quickly once I know the details.

Looking forward to hearing back from you. Even a quick reply would be appreciated!

Best regards,
Ali Blogger Outreach
Guest Post & Link Building Specialist
alibloggeroutreachspecialist@gmail.com`

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'upload' | 'template' | 'generate'
type Status = 'pending' | 'generating' | 'generated' | 'sending' | 'sent' | 'failed'

interface Row {
  id: number
  email: string
  website: string
  language: string
  flag: string
  subject: string
  body: string
  status: Status
  error?: string
}

interface Config {
  senderName: string
  fromEmail: string
  templateSubject: string
  templateBody: string
  sendLimit: number
  sendDelay: number
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<Status, string> = {
  pending:    'badge badge-gray',
  generating: 'badge badge-purple',
  generated:  'badge badge-yellow',
  sending:    'badge badge-blue',
  sent:       'badge badge-green',
  failed:     'badge badge-red',
}
const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pending', generating: 'Generating…', generated: 'Ready',
  sending: 'Sending…', sent: 'Sent', failed: 'Failed',
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</span>
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ row, onClose, onSend, isSending, onUpdate }: {
  row: Row; onClose: () => void
  onSend: (r: Row) => void; isSending: boolean
  onUpdate: (r: Row) => void
}) {
  const [sub, setSub] = useState(row.subject)
  const [body, setBody] = useState(row.body)
  const cur = { ...row, subject: sub, body }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Preview & Edit</p>
            <p className="modal-sub">
              <Mail size={12} /> {row.email}
              <span className="mx-2 text-gray-300">·</span>
              <Globe size={12} /> {row.website}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Subject</label>
            <input value={sub}
              onChange={e => { setSub(e.target.value); onUpdate({ ...cur, subject: e.target.value }) }}
              className="field" />
          </div>
          <div className="field-group">
            <label className="field-label">Body</label>
            <textarea value={body}
              onChange={e => { setBody(e.target.value); onUpdate({ ...cur, body: e.target.value }) }}
              rows={14} className="field field-mono" />
          </div>
        </div>
        <div className="modal-footer">
          <StatusBadge status={row.status} />
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost">Close</button>
            <button onClick={() => onSend(cur)} disabled={isSending || row.status === 'sent'} className="btn btn-primary">
              {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {row.status === 'sent' ? 'Sent ✓' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Contacts Table ───────────────────────────────────────────────────────────

function ContactsTable({ rows, sendingId, onPreview, onSend, onReset }: {
  rows: Row[]
  sendingId: number | null
  onPreview: (r: Row) => void
  onSend: (r: Row) => void
  onReset: (id: number) => void
}) {
  return (
    <div className="table-card">
      <div className="table-header-row">
        <span className="table-title">ALL CONTACTS</span>
        <span className="table-count">{rows.length} total</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {['#', 'EMAIL', 'WEBSITE', 'LANGUAGE', 'STATUS', 'ACTION'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td className="text-muted">{i + 1}</td>
                <td className="td-email">{row.email}</td>
                <td className="text-muted">{row.website || '—'}</td>
                <td>
                  <span className="lang-badge">
                    {row.flag || '🌐'} {row.language || 'English'}
                  </span>
                </td>
                <td>
                  {row.status === 'generating' ? (
                    <span className="flex items-center gap-1 text-violet-600 text-xs">
                      <Loader2 size={11} className="animate-spin" /> Writing…
                    </span>
                  ) : row.error ? (
                    <span className="text-red-500 text-xs block max-w-[180px] truncate" title={row.error}>{row.error}</span>
                  ) : (
                    <StatusBadge status={row.status} />
                  )}
                </td>
                <td>
                  <div className="action-btns">
                    {row.subject && (
                      <button onClick={() => onPreview(row)} className="btn-icon-sm" title="Preview">
                        <Eye size={13} />
                      </button>
                    )}
                    {row.status === 'generated' && (
                      <button onClick={() => onSend(row)} disabled={sendingId === row.id}
                        className="btn-icon-sm btn-icon-green" title="Send">
                        {sendingId === row.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      </button>
                    )}
                    {row.status === 'sent' && <CheckCircle2 size={14} className="text-green-500" />}
                    {row.status === 'failed' && (
                      <button onClick={() => onReset(row.id)} className="btn-icon-sm btn-icon-red" title="Retry">
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">No contacts loaded. Upload a CSV/Excel file to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [rows, setRows] = useState<Row[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<Row | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [config, setConfig] = useState<Config>({
    senderName: '', fromEmail: '',
    templateSubject: DEFAULT_SUBJECT,
    templateBody: DEFAULT_BODY,
    sendLimit: 0,
    sendDelay: 2,
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))

  const cfg = (k: keyof Config) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig(c => ({ ...c, [k]: e.target.value }))

  const handleFile = async (file: File) => {
    setUploading(true); setUploadError('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await axios.post(`${API}/api/upload`, fd)
      setRows(data.rows); setView('dashboard')
    } catch (e: unknown) {
      setUploadError(axios.isAxiosError(e) ? e.response?.data?.detail ?? 'Parse failed' : 'Unknown error')
    } finally { setUploading(false) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  const generateAll = async () => {
    if (!config.senderName.trim()) return alert('Enter your sender name in Template settings first.')
    setGenerating(true); abortRef.current = false
    for (const row of rows) {
      if (abortRef.current) break
      if (row.status === 'sent' || row.status === 'generated') continue
      updateRow(row.id, { status: 'generating', error: undefined })
      try {
        const { data } = await axios.post(`${API}/api/generate-email`, {
          email:            row.email,
          website:          row.website,
          template_subject: config.templateSubject,
          template_body:    config.templateBody,
          language:         row.language || 'English',
        })
        updateRow(row.id, { subject: data.subject, body: data.body, status: 'generated' })
      } catch (e: unknown) {
        const msg = axios.isAxiosError(e) ? e.response?.data?.detail : 'Generation failed'
        updateRow(row.id, { status: 'failed', error: msg || 'Error' })
      }
    }
    setGenerating(false)
  }

  const sendEmail = async (row: Row) => {
    if (!config.fromEmail) return alert('Set your From Email in Template settings first.')
    setSendingId(row.id); updateRow(row.id, { status: 'sending' })
    try {
      const { data } = await axios.post(`${API}/api/send-email`, {
        to_email:    row.email,
        subject:     row.subject,
        body:        row.body,
        sender_name: config.senderName,
        gmail_user:  config.fromEmail,
      })
      updateRow(row.id, { status: data.success ? 'sent' : 'failed', error: data.success ? undefined : data.message })
    } catch { updateRow(row.id, { status: 'failed', error: 'Network error' }) }
    setSendingId(null); setPreview(null)
  }

  const sendAll = async () => {
    abortRef.current = false
    const ready = rows.filter(r => r.status === 'generated')
    const batch = config.sendLimit > 0 ? ready.slice(0, config.sendLimit) : ready
    for (let i = 0; i < batch.length; i++) {
      if (abortRef.current) break
      await sendEmail(batch[i])
      if (config.sendDelay > 0 && i < batch.length - 1)
        await new Promise(resolve => setTimeout(resolve, config.sendDelay * 1000))
    }
  }

  const stats = {
    total:     rows.length,
    generated: rows.filter(r => ['generated', 'sending', 'sent'].includes(r.status)).length,
    sent:      rows.filter(r => r.status === 'sent').length,
    failed:    rows.filter(r => r.status === 'failed').length,
    ready:     rows.filter(r => r.status === 'generated').length,
  }

  const navItems: { id: View; label: string; icon: React.ElementType; sub: string }[] = [
    { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard, sub: '' },
    { id: 'upload',    label: 'Upload List',      icon: Upload,          sub: `${rows.length} Email Files` },
    { id: 'template',  label: 'Template',         icon: FileText,        sub: 'Edit & Configure' },
    { id: 'generate',  label: 'Generate & Send',  icon: Zap,             sub: `${stats.sent} Items Sent` },
  ]

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Sparkles size={15} className="text-white" /></div>
          <div>
            <p className="brand-name">MailGenius</p>
            <p className="brand-sub">AI Email Tool</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon, sub }) => (
            <button key={id} onClick={() => setView(id)}
              className={`nav-item ${view === id ? 'nav-item-active' : ''}`}>
              <Icon size={15} />
              <div className="nav-item-text">
                <span className="nav-label">{label}</span>
                {sub && <span className="nav-sub">{sub}</span>}
              </div>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => { setRows([]); setView('upload') }} className="nav-item nav-item-danger">
            <Trash2 size={14} />
            <span className="nav-label">Clear & Start Over</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">

        {/* ══ Dashboard ══ */}
        {view === 'dashboard' && (
          <div className="view-container">
            <div className="view-header">
              <LayoutDashboard size={18} className="text-blue-500" />
              <h1 className="view-title">Dashboard</h1>
            </div>

            <div className="stats-grid">
              {[
                { label: 'TOTAL',     value: stats.total,     sub: `${stats.total} contacts`,                                           icon: Users,       color: 'text-slate-500' },
                { label: 'GENERATED', value: stats.generated, sub: `${stats.ready} ready to send`,                                      icon: Sparkles,    color: 'text-blue-500' },
                { label: 'SENT',      value: stats.sent,      sub: `${stats.total > 0 ? Math.round(stats.sent/stats.total*100) : 0}% sent rate`, icon: MailCheck,   color: 'text-green-500' },
                { label: 'FAILED',    value: stats.failed,    sub: stats.failed > 0 ? 'needs attention' : 'all good',                   icon: AlertCircle, color: 'text-red-400' },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">{label}</span>
                    <div className="stat-icon-box"><Icon size={13} className={color} /></div>
                  </div>
                  <p className={`stat-value ${color}`}>{value}</p>
                  <p className="stat-sub">{sub}</p>
                </div>
              ))}
            </div>

            <div className="progress-card">
              {[
                { label: 'AI Generation', pct: stats.total > 0 ? stats.generated / stats.total : 0, color: '#3b82f6' },
                { label: 'Emails Sent',   pct: stats.total > 0 ? stats.sent      / stats.total : 0, color: '#22c55e' },
              ].map(({ label, pct, color }) => (
                <div key={label} className="progress-row">
                  <div className="progress-labels">
                    <span>{label}</span><span>{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            <ContactsTable rows={rows} sendingId={sendingId}
              onPreview={setPreview} onSend={sendEmail}
              onReset={id => updateRow(id, { status: 'pending', error: undefined })} />
          </div>
        )}

        {/* ══ Upload ══ */}
        {view === 'upload' && (
          <div className="view-container">
            <div className="view-header">
              <Upload size={18} className="text-blue-500" />
              <h1 className="view-title">Upload List</h1>
            </div>

            <div className="upload-area">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {uploading ? (
                  <div className="upload-state">
                    <Loader2 size={28} className="text-blue-500 animate-spin" />
                    <p className="upload-title">Parsing file…</p>
                  </div>
                ) : (
                  <div className="upload-state">
                    <div className={`upload-icon-box ${isDragging ? 'upload-icon-active' : ''}`}>
                      <Upload size={22} />
                    </div>
                    <p className="upload-title">{isDragging ? 'Drop to upload' : 'Drop your file here'}</p>
                    <p className="upload-sub">or click to browse</p>
                    <div className="flex gap-2 mt-1">
                      {['CSV', 'XLSX', 'XLS'].map(f => <span key={f} className="file-badge">{f}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="error-banner">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              <div className="format-card">
                <div className="format-card-header"><Info size={13} /> Expected file format</div>
                <table className="hint-table">
                  <thead><tr><th>email</th><th>website</th></tr></thead>
                  <tbody>
                    {[['contact@acme.com','acme.com'],['hello@startup.io','startup.io'],['info@agency.co','agency.co']].map(([e,w]) => (
                      <tr key={e}><td>{e}</td><td>{w}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ Template ══ */}
        {view === 'template' && (
          <div className="view-container">
            <div className="view-header">
              <FileText size={18} className="text-blue-500" />
              <h1 className="view-title">Template & Settings</h1>
            </div>

            <div className="settings-grid">
              <div className="settings-card col-span-2">
                <h2 className="card-title">Email Template</h2>
                <div className="field-group">
                  <label className="field-label">Subject Line</label>
                  <input value={config.templateSubject} onChange={cfg('templateSubject')} className="field" />
                </div>
                <div className="field-group">
                  <label className="field-label">Body</label>
                  <textarea value={config.templateBody} onChange={cfg('templateBody')} rows={14} className="field field-mono" />
                </div>
              </div>

              <div className="settings-card">
                <h2 className="card-title">Sender Info</h2>
                <div className="field-group">
                  <label className="field-label">Your Name *</label>
                  <input value={config.senderName} onChange={cfg('senderName')} className="field" placeholder="Ali Blogger Outreach" />
                </div>
              </div>

              <div className="settings-card">
                <h2 className="card-title">From Email</h2>
                <div className="field-group">
                  <label className="field-label">From Email Address *</label>
                  <input type="email" value={config.fromEmail} onChange={cfg('fromEmail')} className="field" placeholder="you@gmail.com" />
                  <p className="field-hint-text">Must be verified as a sender in your Brevo account (Transactional → Senders)</p>
                </div>
              </div>

              <div className="settings-card col-span-2">
                <h2 className="card-title">Send Limits</h2>
                <div className="settings-row">
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label">Max emails per run <span className="field-hint-inline">(0 = unlimited)</span></label>
                    <input type="number" min={0} max={500} value={config.sendLimit}
                      onChange={e => setConfig(c => ({ ...c, sendLimit: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="field" />
                  </div>
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label">Delay between sends (sec) <span className="field-hint-inline">(recommended: 2–5)</span></label>
                    <input type="number" min={0} max={60} value={config.sendDelay}
                      onChange={e => setConfig(c => ({ ...c, sendDelay: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="field" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ Generate & Send ══ */}
        {view === 'generate' && (
          <div className="view-container">
            <div className="view-header">
              <Zap size={18} className="text-blue-500" />
              <h1 className="view-title">Generate & Send</h1>
            </div>

            <div className="action-bar">
              <p className="action-info">
                {rows.length} contacts loaded
                {stats.ready > 0 && <span className="action-ready"> · {stats.ready} ready to send</span>}
              </p>
              <div className="action-buttons">
                {generating && (
                  <button onClick={() => { abortRef.current = true }} className="btn btn-ghost">Stop</button>
                )}
                <button onClick={generateAll} disabled={generating || rows.length === 0} className="btn btn-primary">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generating ? 'Generating…' : 'Generate All with AI'}
                </button>
                <button onClick={sendAll} disabled={generating || stats.ready === 0} className="btn btn-green">
                  <Send size={14} />
                  Send All Ready ({config.sendLimit > 0 ? `max ${config.sendLimit}` : stats.ready})
                </button>
              </div>
            </div>

            <ContactsTable rows={rows} sendingId={sendingId}
              onPreview={setPreview} onSend={sendEmail}
              onReset={id => updateRow(id, { status: 'pending', error: undefined })} />
          </div>
        )}
      </main>

      {preview && (
        <EmailModal
          row={preview}
          onClose={() => setPreview(null)}
          onSend={sendEmail}
          isSending={sendingId === preview.id}
          onUpdate={updated => {
            updateRow(updated.id, { subject: updated.subject, body: updated.body })
            setPreview(updated)
          }}
        />
      )}
    </div>
  )
}
