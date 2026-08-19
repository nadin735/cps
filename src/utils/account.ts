// Demo-only local "account" system. There is no server, no hashing, no
// real security here, this exists so the app can demonstrate a login and
// portfolio pattern end to end. Passwords are stored in plain text in the
// browser's localStorage under a namespaced key. Never reuse a real
// password here. This is documented prominently in the login screen and
// the README, not just in this comment.

const ACCOUNTS_KEY = 'cps-accounts-v1'
const SESSION_KEY = 'cps-session-v1'

interface StoredAccount {
  name: string
  password: string
}

function readAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAccounts(accounts: Record<string, StoredAccount>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export type LoginResult = { ok: true } | { ok: false; reason: 'wrong-password' }

// First login with a given name creates the account. Any later login with
// the same name must match the password that was set the first time.
export function loginOrRegister(name: string, password: string): LoginResult {
  const key = name.trim().toLowerCase()
  const accounts = readAccounts()
  const existing = accounts[key]

  if (existing) {
    if (existing.password !== password) return { ok: false, reason: 'wrong-password' }
  } else {
    accounts[key] = { name: name.trim(), password }
    writeAccounts(accounts)
  }

  localStorage.setItem(SESSION_KEY, key)
  return { ok: true }
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function getAccountDisplayName(key: string): string {
  const accounts = readAccounts()
  return accounts[key]?.name ?? key
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}
