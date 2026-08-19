import { useState } from 'react'
import { Dict } from '../i18n'
import { loginOrRegister } from '../utils/account'

interface Props {
  onLogin: (accountKey: string) => void
  t: Dict
}

export default function LoginScreen({ onLogin, t }: Props) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    const trimmedName = name.trim()
    if (!trimmedName || !password) return
    const result = loginOrRegister(trimmedName, password)
    if (result.ok) {
      setError(false)
      onLogin(trimmedName.toLowerCase())
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 scanlines">
      <div className="w-full max-w-sm border border-edge bg-surface2 rounded-xl p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-block w-8 h-8 rounded-full border-2 border-gold-500" />
          <span className="font-display font-semibold text-ink">Critical Path Scanner</span>
        </div>
        <h1 className="font-display text-xl font-bold mb-1 text-ink">{t.loginTitle}</h1>
        <p className="text-xs text-ink3 mb-6">{t.loginSubtitle}</p>

        <label className="block mb-4">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.loginName}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
            autoFocus
          />
        </label>

        <label className="block mb-2">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.loginPassword}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
          />
        </label>

        {error && (
          <p className="text-xs mb-3 mt-1" style={{ color: '#C4703B' }}>
            {t.loginWrongPassword}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!name.trim() || !password}
          className="w-full px-4 py-2.5 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {t.loginButton}
        </button>
      </div>
    </div>
  )
}
