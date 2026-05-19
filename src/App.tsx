import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, Mail, Send, Eye, CheckCircle2, Loader2, RefreshCw,
  X, AlertCircle, Zap, Sparkles, Users, MailCheck, Shield,
  ChevronRight, FileText, Globe, Info,
} from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'pending' | 'generating' | 'generated' | 'sending' | 'sent' | 'failed'

interface Row {
  id: number
  email: string
  website: string
  subject: string
  body: string
  status: Status
  error?: string
}

interface Config {
  senderName: string
  gmailUser: string
  gmailPassword: string
  templateSubject: string
  templateBody: string
  sendLimit: number
  sendDelay: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const S: Record<Status, { dot: string; label: string; text: string; bg: string }> = {
  pending:    { dot: 'bg-slate-600',                       label: 'Pending',        text: 'text-slate-500',   bg: 'bg-slate-500/10' },
  generating: { dot: 'bg-violet-400 pulse-dot',            label: 'Generating…',    text: 'text-violet-400',  bg: 'bg-violet-500/12' },
  generated:  { dot: 'bg-amber-400',                       label: 'Ready',          text: 'text-amber-400',   bg: 'bg-amber-400/10' },
  sending:    { dot: 'bg-sky-400 pulse-dot',               label: 'Sending…',       text: 'text-sky-400',     bg: 'bg-sky-400/10' },
  sent:       { dot: 'bg-emerald-400',                     label: 'Sent',           text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  failed:     { dot: 'bg-rose-500',                        label: 'Failed',         text: 'text-rose-400',    bg: 'bg-rose-500/10' },
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ status }: { status: Status }) {
  const s = S[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-xs font-medium tracking-wide ${s.text} ${s.bg}`}>
      <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Upload',         icon: Upload },
  { n: 2, label: 'Template',       icon: FileText },
  { n: 3, label: 'Generate & Send',icon: Zap },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-12 gap-0">
      {STEPS.map(({ n, label, icon: Icon }, i) => {
        const done   = n < current
        const active = n === current
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center" style={{ minWidth: 100 }}>
              <div className={[
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                done   ? 'bg-violet-600 shadow-violet-sm'                                    : '',
                active ? 'shadow-[0_0_0_4px_rgba(124,58,237,0.15)] bg-gradient-to-br from-violet-500 to-indigo-600 scale-110' : '',
                !done && !active ? 'bg-white/[0.04] border border-white/[0.08]' : '',
              ].join(' ')}>
                {done
                  ? <CheckCircle2 size={17} className="text-white" />
                  : <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />}
              </div>
              <span className={[
                'mt-2 text-[11px] font-medium text-center tracking-wide transition-colors',
                active ? 'text-violet-300' : done ? 'text-slate-400' : 'text-slate-600',
              ].join(' ')}>{label}</span>
            </div>

            {i < STEPS.length - 1 && (
              <div className={[
                'h-px mb-5 transition-all duration-500',
                n < current ? 'bg-gradient-to-r from-violet-600 to-indigo-500' : 'bg-white/[0.06]',
              ].join(' ')} style={{ width: 56, marginTop: -8 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ row, onClose, onSend, isSending, onUpdate }: {
  row: Row; onClose: () => void
  onSend: (r: Row) => void; isSending: boolean
  onUpdate: (r: Row) => void
}) {
  const [sub,  setSub]  = useState(row.subject)
  const [body, setBody] = useState(row.body)
  const cur = { ...row, subject: sub, body }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl overflow-hidden shadow-modal"
        style={{ background: '#0b0b1c', border: '1px solid rgba(255,255,255,0.09)' }}>

        {/* accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-70" />

        {/* header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <p className="font-semibold text-white text-base tracking-tight">Preview & Edit</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Mail size={11} /> {row.email}
              <span className="mx-1 text-slate-700">·</span>
              <Globe size={11} /> {row.website}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Subject</label>
            <input value={sub}
              onChange={e => { setSub(e.target.value); onUpdate({ ...cur, subject: e.target.value }) }}
              className="field" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Body</label>
            <textarea value={body}
              onChange={e => { setBody(e.target.value); onUpdate({ ...cur, body: e.target.value }) }}
              rows={15}
              className="field field-mono resize-none leading-[1.75]" />
          </div>
        </div>

        {/* footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-white/[0.06]">
          <Badge status={row.status} />
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Close</button>
            <button onClick={() => onSend(cur)} disabled={isSending || row.status === 'sent'}
              className="btn-violet px-5 py-2 text-sm flex items-center gap-2">
              {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {row.status === 'sent' ? 'Sent ✓' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Label + Input wrapper ────────────────────────────────────────────────────

function LabeledField({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-600 leading-snug">{hint}</p>}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, border }: {
  label: string; value: number; icon: React.ElementType
  color: string; border: string
}) {
  return (
    <div className={`card p-5 ${border}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">{label}</span>
        <div className="icon-box">
          <Icon size={13} className={color} />
        </div>
      </div>
      <p className={`text-[32px] font-extrabold leading-none tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [step,        setStep]        = useState(1)
  const [rows,        setRows]        = useState<Row[]>([])
  const [isDragging,  setIsDragging]  = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [generating,  setGenerating]  = useState(false)
  const [preview,     setPreview]     = useState<Row | null>(null)
  const [sendingId,   setSendingId]   = useState<number | null>(null)
  const [config, setConfig] = useState<Config>({
    senderName: '', gmailUser: '', gmailPassword: '',
    templateSubject: DEFAULT_SUBJECT,
    templateBody:    DEFAULT_BODY,
    sendLimit: 0,
    sendDelay: 2,
  })

  const fileRef  = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))

  const cfg = (k: keyof Config) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig(c => ({ ...c, [k]: e.target.value }))

  // upload
  const handleFile = async (file: File) => {
    setUploading(true); setUploadError('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await axios.post(`${API}/api/upload`, fd)
      setRows(data.rows); setStep(2)
    } catch (e: unknown) {
      setUploadError(axios.isAxiosError(e) ? e.response?.data?.detail ?? 'Parse failed' : 'Unknown error')
    } finally { setUploading(false) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  // generate
  const generateAll = async () => {
    if (!config.senderName.trim()) return alert('Please enter your sender name first.')
    setGenerating(true); abortRef.current = false
    for (const row of rows) {
      if (abortRef.current) break
      if (row.status === 'sent' || row.status === 'generated') continue
      updateRow(row.id, { status: 'generating', error: undefined })
      try {
        const { data } = await axios.post(`${API}/api/generate-email`, {
          email:            row.email,
          website:          row.website,
          sender_name:      config.senderName,
          sender_email:     config.gmailUser,
          template_subject: config.templateSubject,
          template_body:    config.templateBody,
        })
        updateRow(row.id, { subject: data.subject, body: data.body, status: 'generated' })
      } catch (e: unknown) {
        const msg = axios.isAxiosError(e) ? e.response?.data?.detail : 'Generation failed'
        updateRow(row.id, { status: 'failed', error: msg || 'Error' })
      }
    }
    setGenerating(false)
  }

  // send single
  const sendEmail = async (row: Row) => {
    if (!config.gmailUser || !config.gmailPassword) return alert('Set your Gmail credentials first.')
    setSendingId(row.id); updateRow(row.id, { status: 'sending' })
    try {
      const { data } = await axios.post(`${API}/api/send-email`, {
        to_email:      row.email,
        subject:       row.subject,
        body:          row.body,
        sender_name:   config.senderName,
        gmail_user:    config.gmailUser,
        gmail_password: config.gmailPassword,
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
      if (config.sendDelay > 0 && i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.sendDelay * 1000))
      }
    }
  }

  const stats = {
    total:     rows.length,
    generated: rows.filter(r => ['generated','sending','sent'].includes(r.status)).length,
    sent:      rows.filter(r => r.status === 'sent').length,
    failed:    rows.filter(r => r.status === 'failed').length,
    ready:     rows.filter(r => r.status === 'generated').length,
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#04040e' }}>

      {/* ── ambient background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        <div className="orb orb-1 absolute w-[600px] h-[600px] opacity-[0.13]"
          style={{ top: '-10%', left: '30%', background: 'radial-gradient(circle, #7c3aed, transparent 65%)' }} />
        <div className="orb orb-2 absolute w-[500px] h-[500px] opacity-[0.09]"
          style={{ bottom: '5%', right: '15%', background: 'radial-gradient(circle, #4f46e5, transparent 65%)' }} />
        <div className="orb orb-3 absolute w-[300px] h-[300px] opacity-[0.06]"
          style={{ top: '50%', left: '5%', background: 'radial-gradient(circle, #06b6d4, transparent 65%)' }} />
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── header ── */}
      <header className="relative z-40 sticky top-0"
        style={{ background: 'rgba(4,4,14,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">MailGenius</span>
            <span className="text-[10px] font-semibold text-violet-400 px-2 py-0.5 rounded-full tracking-wider"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
              AI
            </span>
          </div>

          {/* pills */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Gemini 1.5 Flash
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <Shield size={10} className="text-emerald-400" /> Gmail SMTP
            </span>
            {rows.length > 0 && (
              <span className="flex items-center gap-1.5 text-violet-300/80">
                <Users size={11} /> {rows.length} contacts
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── main ── */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <StepBar current={step} />

        {/* ════════════════════════════════════════════════════════ STEP 1 */}
        {step === 1 && (
          <div className="max-w-xl mx-auto animate-fade-up">

            <div className="text-center mb-8">
              <h1 className="text-gradient text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] mb-3">
                Upload Your<br />Contact List
              </h1>
              <p className="text-slate-400 text-base leading-relaxed">
                A CSV or Excel file with{' '}
                <code className="text-violet-300 text-[13px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(124,58,237,0.12)' }}>email</code>
                {' '}and{' '}
                <code className="text-violet-300 text-[13px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(124,58,237,0.12)' }}>website</code>
                {' '}columns
              </p>
            </div>

            {/* drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`drop-zone p-12 text-center ${isDragging ? 'is-dragging' : ''}`}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <Loader2 size={26} className="text-violet-400 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Parsing file…</p>
                    <p className="text-sm text-slate-500 mt-1">Detecting columns and reading rows</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}
                    style={{ background: isDragging ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDragging ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    <Upload size={24} className={isDragging ? 'text-violet-300' : 'text-slate-500'} />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100 text-[15px]">
                      {isDragging ? 'Drop to upload' : 'Drop your file here'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1.5">or click to browse</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {['CSV', 'XLSX', 'XLS'].map(f => (
                      <span key={f} className="text-[11px] font-medium text-slate-400 px-2.5 py-1 rounded-lg tracking-wider"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 flex items-start gap-3 p-4 rounded-xl text-sm text-rose-300"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
                {uploadError}
              </div>
            )}

            {/* format hint */}
            <div className="card mt-5 overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-2 border-b border-white/[0.05]">
                <Info size={13} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Expected file format</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <th className="text-left px-5 py-2.5 text-violet-400 font-semibold tracking-wide">email</th>
                    <th className="text-left px-5 py-2.5 text-violet-400 font-semibold tracking-wide">website</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['contact@acme.com',  'https://acme.com'],
                    ['hello@startup.io',  'https://startup.io'],
                    ['info@agency.co',    'https://agency.co'],
                  ].map(([e, w]) => (
                    <tr key={e} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-2.5 text-slate-300">{e}</td>
                      <td className="px-5 py-2.5 text-slate-400">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ STEP 2 */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto animate-fade-up">
            <div className="text-center mb-8">
              <h1 className="text-gradient text-4xl font-extrabold tracking-tight leading-[1.15] mb-3">
                Template & Setup
              </h1>
              <p className="text-slate-400">
                <span className="text-violet-300 font-semibold">{rows.length} contacts</span> loaded.
                Gemini uses your template as a style guide and personalizes each email with the recipient's website.
              </p>
            </div>

            <div className="space-y-4">
              {/* template card */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="icon-box">
                    <FileText size={14} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Email Template</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      AI keeps your style, tone, and sign-off — and inserts the real website URL
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <LabeledField label="Subject Line">
                    <input value={config.templateSubject} onChange={cfg('templateSubject')}
                      className="field text-[13px]" placeholder="Enter subject…" />
                  </LabeledField>

                  <LabeledField label="Email Body">
                    <textarea value={config.templateBody} onChange={cfg('templateBody')}
                      rows={18}
                      className="field field-mono resize-y"
                      style={{ minHeight: 340 }}
                    />
                  </LabeledField>
                </div>

                {/* variable chips */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-600">Variables:</span>
                  {['{website}', '{email}'].map(v => (
                    <code key={v}
                      className="text-[11px] font-mono text-violet-300 px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      {v}
                    </code>
                  ))}
                  <span className="text-[11px] text-slate-600">→ replaced per contact</span>
                </div>
              </div>

              {/* sender + gmail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-box"><Users size={14} className="text-violet-400" /></div>
                    <p className="font-semibold text-white text-sm">Sender Info</p>
                  </div>
                  <LabeledField label="Your Name *">
                    <input value={config.senderName} onChange={cfg('senderName')}
                      className="field" placeholder="Ali Blogger Outreach" />
                  </LabeledField>
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-box"><Mail size={14} className="text-emerald-400" /></div>
                    <p className="font-semibold text-white text-sm">Gmail Credentials</p>
                  </div>
                  <div className="space-y-3">
                    <LabeledField label="Gmail Address">
                      <input type="email" value={config.gmailUser} onChange={cfg('gmailUser')}
                        className="field" placeholder="you@gmail.com" />
                    </LabeledField>
                    <LabeledField label="App Password"
                      hint="Google Account → Security → 2-Step Verification → App Passwords">
                      <input type="password" value={config.gmailPassword} onChange={cfg('gmailPassword')}
                        className="field" placeholder="xxxx xxxx xxxx xxxx" />
                    </LabeledField>
                  </div>
                </div>
              </div>

              {/* tip */}
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px] text-amber-300/80 leading-relaxed"
                style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                <AlertCircle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                Use a Gmail <strong className="text-amber-300">App Password</strong> (not your regular password).
                Enable 2-Step Verification first, then create it at Google Account → Security → App Passwords.
              </div>

              {/* send limits */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="icon-box"><Zap size={14} className="text-violet-400" /></div>
                  <div>
                    <p className="font-semibold text-white text-sm">Send Limits</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Control how many emails get sent and how fast</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <LabeledField label="Max emails per run" hint="0 = send all ready emails">
                    <input
                      type="number" min={0} max={500}
                      value={config.sendLimit}
                      onChange={e => setConfig(c => ({ ...c, sendLimit: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="field"
                      placeholder="0"
                    />
                  </LabeledField>
                  <LabeledField label="Delay between sends (sec)" hint="Recommended: 2–5s to avoid spam flags">
                    <input
                      type="number" min={0} max={60}
                      value={config.sendDelay}
                      onChange={e => setConfig(c => ({ ...c, sendDelay: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="field"
                      placeholder="2"
                    />
                  </LabeledField>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!config.senderName.trim() || !config.templateSubject.trim()}
                className="btn-violet w-full py-3.5 text-sm flex items-center justify-center gap-2">
                Continue to Generate & Send <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ STEP 3 */}
        {step === 3 && (
          <div className="animate-fade-up">

            {/* stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <StatCard label="Total"     value={stats.total}     icon={Users}       color="text-slate-300"   border="border-white/[0.06]" />
              <StatCard label="Generated" value={stats.generated} icon={Sparkles}    color="text-violet-400"  border="border-violet-500/[0.15]" />
              <StatCard label="Sent"      value={stats.sent}      icon={MailCheck}   color="text-emerald-400" border="border-emerald-500/[0.15]" />
              <StatCard label="Failed"    value={stats.failed}    icon={AlertCircle} color="text-rose-400"    border="border-rose-500/[0.12]" />
            </div>

            {/* progress */}
            <div className="card p-5 mb-5 space-y-4">
              {[
                { label: 'AI Generation', pct: stats.total > 0 ? stats.generated / stats.total : 0, from: '#7c3aed', to: '#6366f1' },
                { label: 'Emails Sent',   pct: stats.total > 0 ? stats.sent      / stats.total : 0, from: '#059669', to: '#0d9488' },
              ].map(({ label, pct, from, to }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-medium text-slate-500">{label}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* action bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-slate-500">
                {rows.length} contacts
                {stats.ready > 0 && (
                  <span className="ml-2 font-medium text-amber-400">{stats.ready} ready to send</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {generating && (
                  <button onClick={() => { abortRef.current = true }}
                    className="btn-ghost px-4 py-2 text-[13px]">
                    Stop
                  </button>
                )}
                <button onClick={generateAll} disabled={generating}
                  className="btn-violet px-5 py-2.5 text-[13px] flex items-center gap-2">
                  {generating
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Zap size={13} />}
                  {generating ? 'Generating…' : 'Generate All with AI'}
                </button>
                <button onClick={sendAll} disabled={generating || stats.ready === 0}
                  className="btn-emerald px-5 py-2.5 text-[13px] flex items-center gap-2">
                  <Send size={13} />
                  Send All Ready ({config.sendLimit > 0 ? `max ${config.sendLimit}` : stats.ready})
                </button>
              </div>
            </div>

            {/* table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Email', 'Website', 'AI-Generated Subject', 'Status', ''].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id}
                        className="group transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>

                        <td className="px-5 py-4 text-[11px] text-slate-600 font-mono w-8">{i + 1}</td>

                        <td className="px-5 py-4 text-[13px] font-medium text-slate-200 max-w-[180px]">
                          <span className="truncate block">{row.email}</span>
                        </td>

                        <td className="px-5 py-4 max-w-[140px]">
                          <span className="text-[12px] text-slate-500 truncate block">{row.website || '—'}</span>
                        </td>

                        <td className="px-5 py-4 max-w-[280px]">
                          {row.status === 'generating' ? (
                            <span className="flex items-center gap-2 text-violet-400 text-[12px]">
                              <Loader2 size={11} className="animate-spin" /> Writing…
                            </span>
                          ) : row.error ? (
                            <span className="text-rose-400 text-[11px] truncate block" title={row.error}>{row.error}</span>
                          ) : row.subject ? (
                            <span className="text-[13px] text-slate-300 truncate block" title={row.subject}>{row.subject}</span>
                          ) : (
                            <span className="text-slate-700 text-[12px]">Not generated yet</span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge status={row.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {row.subject && (
                              <button onClick={() => setPreview(row)}
                                className="p-2 rounded-lg transition-all text-slate-500 hover:text-violet-300"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                title="Preview">
                                <Eye size={14} />
                              </button>
                            )}
                            {row.status === 'generated' && (
                              <button onClick={() => sendEmail(row)} disabled={sendingId === row.id}
                                className="p-2 rounded-lg transition-all text-slate-500 hover:text-emerald-400 disabled:opacity-40"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                title="Send">
                                {sendingId === row.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Send size={14} />}
                              </button>
                            )}
                            {row.status === 'sent' && (
                              <div className="p-2"><CheckCircle2 size={14} className="text-emerald-400" /></div>
                            )}
                            {row.status === 'failed' && (
                              <button onClick={() => updateRow(row.id, { status: 'pending', error: undefined })}
                                className="p-2 rounded-lg text-rose-500 hover:text-rose-300 transition-colors"
                                title="Reset">
                                <RefreshCw size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center text-slate-600 text-sm">
                          No contacts loaded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* modal */}
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
