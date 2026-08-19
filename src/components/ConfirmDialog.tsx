import { Dict } from '../i18n'

interface Props {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  t: Dict
}

// Native confirm() dialogs are functional but break the illusion entirely,
// wrong font, wrong colors, no RTL awareness for Arabic, and they look like
// the browser interrupted the app rather than the app itself asking a
// question. This is a drop-in replacement styled like every other modal in
// the app.
export default function ConfirmDialog({ message, confirmLabel, cancelLabel, danger, onConfirm, onCancel, t }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div
        className="bg-surface2 border border-edge rounded-xl max-w-sm w-full p-6 shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-ink mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
            {cancelLabel ?? t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-mono rounded font-semibold ${
              danger
                ? 'text-white hover:opacity-90'
                : 'bg-gold-500 text-inkOnGold hover:bg-gold-400'
            }`}
            style={danger ? { backgroundColor: '#B23A32' } : undefined}
          >
            {confirmLabel ?? t.delete}
          </button>
        </div>
      </div>
    </div>
  )
}
