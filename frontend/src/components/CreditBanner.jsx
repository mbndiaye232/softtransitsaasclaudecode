import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useBilling } from '../context/BillingContext'

/**
 * Bannière persistante affichée sur toutes les pages protégées.
 * Affiche progressivement : vert → orange → rouge → bloqué
 */
export default function CreditBanner() {
    const navigate = useNavigate()
    const { billing, isForfait, balance, isBlocked, isLow, isWarning } = useBilling()
    const [dismissed, setDismissed] = useState(false)

    if (!billing || isForfait) return null
    if (dismissed && !isBlocked) return null
    if (!isBlocked && !isLow && !isWarning) return null

    const config = isBlocked
        ? { bg: '#fee2e2', border: '#f87171', text: '#991b1b', icon: '#dc2626', btnBg: '#dc2626', btnText: 'Recharger maintenant', msg: 'Crédits épuisés — Saisie, modification et suppression bloquées.' }
        : isLow
            ? { bg: '#fff1f2', border: '#fda4af', text: '#9f1239', icon: '#ef4444', btnBg: '#ef4444', btnText: 'Recharger', msg: `Solde critique : ${balance} crédits. Rechargez au plus vite.` }
            : { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', icon: '#f97316', btnBg: '#f97316', btnText: 'Recharger', msg: `Solde faible : ${balance} crédits. Pensez à recharger.` }

    return (
        <div style={{
            background: config.bg, borderBottom: `2px solid ${config.border}`,
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px',
            fontSize: '13px', color: config.text, position: 'sticky', top: 0, zIndex: 100,
        }}>
            <AlertTriangle size={16} color={config.icon} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: isBlocked ? 600 : 400 }}>{config.msg}</span>
            <button onClick={() => navigate('/billing/purchase')} style={{
                background: config.btnBg, color: 'white', border: 'none', borderRadius: '6px',
                padding: '5px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
                {config.btnText}
            </button>
            {!isBlocked && (
                <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.icon, padding: '2px' }}>
                    <X size={15} />
                </button>
            )}
        </div>
    )
}
