import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    CreditCard, CheckCircle, ArrowLeft, ArrowRight,
    Star, Zap, Shield, AlertCircle, Copy, ExternalLink
} from 'lucide-react'
import { billingAPI } from '../services/api'
import { useBilling } from '../context/BillingContext'

const STEPS = ['Choisir un pack', 'Mode de paiement', 'Paiement']
const PAYMENT_METHODS = [
    { id: 'paypal', label: 'PayPal', icon: '🅿️', desc: 'Carte bancaire / PayPal', currency: 'EUR' },
    { id: 'wave', label: 'Wave', icon: '🌊', desc: 'Mobile Money Sénégal / CI', currency: 'CFA' },
    { id: 'orange_money', label: 'Orange Money', icon: '🟠', desc: 'Orange Money Afrique', currency: 'CFA' },
    { id: 'manuel', label: 'Virement manuel', icon: '🏦', desc: 'Virement bancaire — activation sous 24h', currency: 'both' },
]

export default function BillingPurchase() {
    const navigate = useNavigate()
    const { refresh: refreshBilling } = useBilling()
    const [searchParams] = useSearchParams()
    const returnStatus = searchParams.get('status') // 'success' | 'cancel'
    const txnParam = searchParams.get('txn')

    const [step, setStep] = useState(0)
    const [packs, setPacks] = useState([])
    const [selectedPack, setSelectedPack] = useState(null)
    const [selectedMethod, setSelectedMethod] = useState(null)
    const [currency, setCurrency] = useState('CFA')
    const [loading, setLoading] = useState(false)
    const [transaction, setTransaction] = useState(null)
    const [paymentData, setPaymentData] = useState(null)
    const [confirming, setConfirming] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        billingAPI.getPacks().then(r => setPacks(r.data))
        // Retour PayPal/Wave/Orange après paiement externe
        if (returnStatus === 'success' && txnParam) {
            handleExternalReturn(txnParam)
        }
    }, [])

    const handleExternalReturn = async (txnId) => {
        setLoading(true)
        try {
            await billingAPI.confirmPurchase({ transaction_id: parseInt(txnId) })
            await refreshBilling()
            setConfirmed(true)
            setStep(3)
        } catch (e) {
            setError('Impossible de confirmer le paiement. Contactez le support.')
        } finally {
            setLoading(false)
        }
    }

    const initiatePurchase = async () => {
        if (!selectedPack || !selectedMethod) return
        setLoading(true)
        setError('')
        try {
            const res = await billingAPI.initiatePurchase({
                pack_id: selectedPack.id,
                payment_provider: selectedMethod,
                currency,
            })
            setTransaction(res.data)
            setPaymentData(res.data.payment_data)
            setStep(2)

            // Si URL de paiement externe (PayPal, Wave, Orange)
            if (res.data.payment_data?.payment_url) {
                window.location.href = res.data.payment_data.payment_url
            }
        } catch (e) {
            setError('Erreur lors de l\'initiation du paiement')
        } finally {
            setLoading(false)
        }
    }

    const confirmManual = async () => {
        if (!transaction) return
        setConfirming(true)
        try {
            await billingAPI.confirmPurchase({ transaction_id: transaction.transaction_id })
            await refreshBilling()
            setConfirmed(true)
            setStep(3)
        } catch (e) {
            setError('Erreur de confirmation')
        } finally {
            setConfirming(false)
        }
    }

    const copy = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Page de succès
    if (step === 3 || confirmed) {
        return (
            <div className="dashboard">
                <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <div className="dashboard-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '3rem' }}>
                        <CheckCircle size={72} color="#16a34a" style={{ marginBottom: '20px' }} />
                        <h2 style={{ color: '#15803d', marginBottom: '8px' }}>Paiement confirmé !</h2>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            {transaction?.pack?.credits || txnParam
                                ? `Vos crédits ont été ajoutés à votre compte.`
                                : 'Votre compte a été crédité.'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => navigate('/billing', { state: { purchased: true } })} className="btn btn-primary">
                                Voir mon tableau de bord
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
                                Retour
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/billing')}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#6b7280', fontSize: '14px' }}>
                    <ArrowLeft size={16} /> Retour
                </button>
                <h1>Achat de crédits</h1>
            </div>

            <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '14px', flexShrink: 0,
                                background: step > i ? '#16a34a' : step === i ? '#2563eb' : '#e5e7eb',
                                color: step >= i ? 'white' : '#9ca3af',
                            }}>
                                {step > i ? <CheckCircle size={16} /> : i + 1}
                            </div>
                            <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: step === i ? 600 : 400, color: step === i ? '#111827' : '#9ca3af', whiteSpace: 'nowrap' }}>
                                {s}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', background: step > i ? '#16a34a' : '#e5e7eb', margin: '0 12px' }} />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: '#991b1b', fontSize: '14px' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* ── STEP 0 : Choisir un pack ── */}
                {step === 0 && (
                    <div>
                        <h3 style={{ marginBottom: '1.5rem' }}>Choisissez votre pack</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {packs.map(p => (
                                <div key={p.id} onClick={() => setSelectedPack(p)} style={{
                                    border: `2px solid ${selectedPack?.id === p.id ? '#2563eb' : '#e5e7eb'}`,
                                    borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', position: 'relative',
                                    background: selectedPack?.id === p.id ? '#eff6ff' : 'white',
                                    transition: 'all 0.15s',
                                }}>
                                    {p.is_popular ? (
                                        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Star size={10} /> Populaire
                                        </div>
                                    ) : null}
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{p.name}</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
                                        {p.credits.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>crédits</div>
                                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '16px' }}>{p.price_eur}€</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{Number(p.price_cfa).toLocaleString()} CFA</div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                            {(p.price_eur / p.credits * 100).toFixed(1)} cts / crédit
                                        </div>
                                    </div>
                                    {selectedPack?.id === p.id && (
                                        <CheckCircle size={20} color="#2563eb" style={{ position: 'absolute', top: '12px', right: '12px' }} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setStep(1)} disabled={!selectedPack} className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 28px' }}>
                                Continuer <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1 : Mode de paiement ── */}
                {step === 1 && (
                    <div>
                        <h3 style={{ marginBottom: '4px' }}>Mode de paiement</h3>
                        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.5rem' }}>
                            Pack sélectionné : <strong>{selectedPack?.name}</strong> — {selectedPack?.credits.toLocaleString()} crédits
                        </p>

                        {/* Devise */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                            {['EUR', 'CFA'].map(c => (
                                <button key={c} onClick={() => setCurrency(c)} style={{
                                    padding: '6px 18px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    border: `2px solid ${currency === c ? '#2563eb' : '#e5e7eb'}`,
                                    background: currency === c ? '#2563eb' : 'white',
                                    color: currency === c ? 'white' : '#374151',
                                }}>
                                    {c}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {PAYMENT_METHODS.map(m => (
                                <div key={m.id} onClick={() => setSelectedMethod(m.id)} style={{
                                    border: `2px solid ${selectedMethod === m.id ? '#2563eb' : '#e5e7eb'}`,
                                    borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                                    background: selectedMethod === m.id ? '#eff6ff' : 'white', transition: 'all 0.15s',
                                }}>
                                    <span style={{ fontSize: '28px' }}>{m.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '15px' }}>{m.label}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{m.desc}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {m.currency === 'EUR' || m.currency === 'both'
                                            ? <div style={{ fontWeight: 700, color: '#2563eb' }}>{selectedPack?.price_eur}€</div>
                                            : null}
                                        {m.currency === 'CFA' || m.currency === 'both'
                                            ? <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '13px' }}>{Number(selectedPack?.price_cfa).toLocaleString()} CFA</div>
                                            : null}
                                    </div>
                                    {selectedMethod === m.id && <CheckCircle size={20} color="#2563eb" />}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setStep(0)} className="btn btn-secondary">Retour</button>
                            <button onClick={initiatePurchase} disabled={!selectedMethod || loading} className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 28px' }}>
                                {loading ? 'Initialisation...' : <><CreditCard size={16} /> Procéder au paiement</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2 : Paiement (manuel / instructions) ── */}
                {step === 2 && transaction && (
                    <div>
                        <h3 style={{ marginBottom: '1.5rem' }}>Finaliser le paiement</h3>

                        {selectedMethod === 'manuel' && paymentData && (
                            <div>
                                <div className="dashboard-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🏦 Instructions de virement
                                    </h4>
                                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                        <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151' }}>
                                            {paymentData.instructions}
                                        </p>
                                        <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', whiteSpace: 'pre-line' }}>
                                            {paymentData.bank_details}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', borderRadius: '8px', padding: '12px 16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Référence à mentionner</div>
                                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: '18px' }}>
                                                {paymentData.reference}
                                            </div>
                                        </div>
                                        <button onClick={() => copy(paymentData.reference)} style={{
                                            background: 'none', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px',
                                            cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', color: '#2563eb', fontSize: '13px'
                                        }}>
                                            <Copy size={14} /> {copied ? 'Copié !' : 'Copier'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#92400e', marginBottom: '1.5rem' }}>
                                    ⚠️ Votre compte sera activé dans les <strong>24h ouvrées</strong> après réception du virement. Conservez votre référence de transaction.
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => navigate('/billing')} className="btn btn-secondary">
                                        J'ai effectué le virement
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedMethod !== 'manuel' && paymentData && !paymentData.payment_url && (
                            <div className="dashboard-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <AlertCircle size={40} color="#f97316" style={{ marginBottom: '12px' }} />
                                <h4 style={{ color: '#c2410c' }}>{paymentData.error || 'Service temporairement indisponible'}</h4>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                                    {paymentData.instructions || 'Contactez l\'administrateur pour configurer ce mode de paiement.'}
                                </p>
                                <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginTop: '16px' }}>
                                    Choisir un autre mode
                                </button>
                            </div>
                        )}

                        {selectedMethod !== 'manuel' && paymentData?.payment_url && (
                            <div className="dashboard-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                                    {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon}
                                </div>
                                <h4>Redirection vers {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}</h4>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                                    Vous allez être redirigé vers la page de paiement sécurisée.
                                </p>
                                <a href={paymentData.payment_url} className="btn btn-primary"
                                    style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                    Payer maintenant <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
