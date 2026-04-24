import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    CreditCard, Zap, Settings, Bell, TrendingDown,
    AlertTriangle, CheckCircle, ArrowRight, RefreshCw,
    BarChart2, Calendar, Shield, Send, Clock, MessageSquare,
    ListChecks, ChevronDown, Wallet, Activity
} from 'lucide-react'
import { billingAPI, tarifsAPI } from '../services/api'
import { useBilling } from '../context/BillingContext'
import { useAuth } from '../context/AuthContext'

/* ── helpers ── */
const CREDIT_COLOR = (b) => {
    if (b <= 0)   return '#dc2626'
    if (b <= 20)  return '#ef4444'
    if (b <= 50)  return '#f97316'
    if (b <= 100) return '#f59e0b'
    return '#16a34a'
}

const TAB_CONFIG = {
    credits: { label: 'Crédits',    icon: <Zap size={15}/>,          grad: 'linear-gradient(135deg,#047857,#10b981)', accent: '#059669' },
    tarifs:  { label: 'Tarifs',     icon: <ListChecks size={15}/>,   grad: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', accent: '#7c3aed' },
    forfait: { label: 'Forfait',    icon: <Shield size={15}/>,       grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', accent: '#2563eb' },
    history: { label: 'Historique', icon: <BarChart2 size={15}/>,    grad: 'linear-gradient(135deg,#334155,#64748b)', accent: '#475569' },
    alerts:  { label: 'Alertes',    icon: <Bell size={15}/>,         grad: 'linear-gradient(135deg,#b45309,#f59e0b)', accent: '#d97706' },
    request: { label: 'Demande',    icon: <MessageSquare size={15}/>, grad: 'linear-gradient(135deg,#9f1239,#e11d48)', accent: '#e11d48' },
}

/* ── style atoms ── */
const card = (extra = {}) => ({
    background: 'white', borderRadius: '1rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    padding: '1.5rem', ...extra
})
const labelSt = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }
const inputSt = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
}
const btnPrimary = (extra = {}) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'linear-gradient(135deg,#047857,#10b981)', color: 'white',
    border: 'none', borderRadius: '8px', padding: '10px 20px',
    cursor: 'pointer', fontWeight: 700, fontSize: '14px',
    boxShadow: '0 4px 12px rgba(5,150,105,0.3)', transition: 'all 0.2s', ...extra
})
const btnSecondary = (extra = {}) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
    padding: '9px 16px', cursor: 'pointer', color: 'white',
    fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', ...extra
})

/* ── sub-components ── */
function SectionHeader({ icon, title, color = '#059669', grad = 'linear-gradient(135deg,#047857,#10b981)' }) {
    return (
        <div style={{
            background: grad, borderRadius: '0.85rem 0.85rem 0 0',
            padding: '0.85rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.6rem'
        }}>
            <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{icon}</div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{title}</span>
        </div>
    )
}

function BlockCard({ icon, title, grad, children, style = {} }) {
    return (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden', ...style }}>
            <SectionHeader icon={icon} title={title} grad={grad} />
            <div style={{ padding: '1.35rem' }}>{children}</div>
        </div>
    )
}

function StatusBadge({ status }) {
    const map = {
        COMPLETED: { bg: '#dcfce7', color: '#15803d', label: 'Complété' },
        PENDING:   { bg: '#fef9c3', color: '#a16207', label: 'En attente' },
        FAILED:    { bg: '#fee2e2', color: '#dc2626', label: 'Échoué' },
        CANCELLED: { bg: '#f3f4f6', color: '#6b7280', label: 'Annulé' },
    }
    const s = map[status] || map.PENDING
    return <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
}

function RequestStatusBadge({ status }) {
    const map = {
        pending:  { bg: '#fef9c3', color: '#a16207', label: '⏳ En attente' },
        approved: { bg: '#dcfce7', color: '#15803d', label: '✅ Approuvée' },
        rejected: { bg: '#fee2e2', color: '#dc2626', label: '❌ Refusée' },
    }
    const s = map[status] || map.pending
    return <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

function SimpleBarChart({ data }) {
    if (!data.length) return (
        <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem' }}>
            <Activity size={28} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '0.85rem' }}>Aucune donnée de consommation pour cette période</span>
        </div>
    )
    const max = Math.max(...data.map(d => d.credits_used || 0), 1)
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '130px', padding: '0 4px' }}>
            {data.map((d, i) => {
                const pct = Math.max(4, ((d.credits_used || 0) / max) * 100)
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div title={`${d.date}: ${d.credits_used} crédits`} style={{
                            width: '100%',
                            background: `linear-gradient(to top, #047857, #34d399)`,
                            borderRadius: '4px 4px 0 0',
                            height: `${pct}%`, minHeight: '4px', cursor: 'default',
                            transition: 'height 0.3s',
                        }} />
                        {data.length <= 14 && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                {new Date(d.date).toLocaleDateString('fr-FR', { month: 'numeric', day: 'numeric' })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ── composant principal ── */
export default function BillingDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const { refresh: refreshBilling } = useBilling()
    const { user } = useAuth()
    const [tab, setTab]                         = useState('credits')
    const [status, setStatus]                   = useState(null)
    const [forfaitOptions, setForfaitOptions]   = useState([])
    const [consumption, setConsumption]         = useState(null)
    const [history, setHistory]                 = useState([])
    const [loading, setLoading]                 = useState(true)
    const [spinning, setSpinning]               = useState(false)
    const [loadError, setLoadError]             = useState(false)
    const [alertForm, setAlertForm]             = useState({ email: '', t1: 100, t2: 50, t3: 20 })
    const [alertSaving, setAlertSaving]         = useState(false)
    const [alertSuccess, setAlertSuccess]       = useState(false)
    const [period, setPeriod]                   = useState(30)
    const [myRequests, setMyRequests]           = useState([])
    const [requestForm, setRequestForm]         = useState({ requested_mode: '', requested_forfait_type: '', message: '' })
    const [requestSending, setRequestSending]   = useState(false)
    const [requestMsg, setRequestMsg]           = useState('')
    const [tarifs, setTarifs]                   = useState(null)
    const [tarifsLoading, setTarifsLoading]     = useState(false)
    const [tarifsPeriod, setTarifsPeriod]       = useState(30)

    const load = useCallback(async () => {
        setLoading(true); setSpinning(true); setLoadError(false)
        try {
            const [statusR, forfaitR, histR, consR, reqR] = await Promise.allSettled([
                billingAPI.getStatus(),
                billingAPI.getForfaitOptions(),
                billingAPI.getHistory({ limit: 10 }),
                billingAPI.getConsumption(period),
                billingAPI.getMyRequests(),
            ])
            if (statusR.status === 'rejected') { setLoadError(true); return }
            setStatus(statusR.value.data)
            setAlertForm({
                email: statusR.value.data.credit_alert_email || '',
                t1: statusR.value.data.thresholds?.level_1 || 100,
                t2: statusR.value.data.thresholds?.level_2 || 50,
                t3: statusR.value.data.thresholds?.level_3 || 20,
            })
            if (forfaitR.status === 'fulfilled') setForfaitOptions(forfaitR.value.data)
            if (histR.status === 'fulfilled')    setHistory(histR.value.data.data || [])
            if (consR.status === 'fulfilled')    setConsumption(consR.value.data)
            if (reqR.status === 'fulfilled')     setMyRequests(reqR.value.data || [])
            refreshBilling()
        } catch (e) {
            setLoadError(true)
        } finally {
            setLoading(false)
            setTimeout(() => setSpinning(false), 700)
        }
    }, [period])

    useEffect(() => { load() }, [load])

    const loadTarifs = useCallback(async () => {
        setTarifsLoading(true)
        try {
            const res = await tarifsAPI.getBillingTarifs(tarifsPeriod)
            setTarifs(res.data)
        } catch (e) {
            console.warn('Tarifs load error:', e)
        } finally { setTarifsLoading(false) }
    }, [tarifsPeriod])

    useEffect(() => { if (tab === 'tarifs') loadTarifs() }, [tab, loadTarifs])

    useEffect(() => {
        if (location.state?.purchased) {
            load(); refreshBilling()
            navigate('/billing', { replace: true, state: {} })
        }
    }, [location.state])

    const sendModeRequest = async () => {
        if (!requestForm.requested_mode) return
        setRequestSending(true); setRequestMsg('')
        try {
            await billingAPI.requestMode(requestForm)
            setRequestMsg('success')
            setRequestForm({ requested_mode: '', requested_forfait_type: '', message: '' })
            load()
        } catch (e) {
            setRequestMsg('error:' + (e.response?.data?.error || 'Erreur'))
        } finally { setRequestSending(false) }
    }

    const saveAlerts = async () => {
        setAlertSaving(true)
        try {
            await billingAPI.updateAlerts({
                credit_alert_email: alertForm.email,
                threshold_1: alertForm.t1, threshold_2: alertForm.t2, threshold_3: alertForm.t3,
            })
            setAlertSuccess(true)
            setTimeout(() => setAlertSuccess(false), 3000)
        } catch (e) { alert('Erreur lors de la sauvegarde') }
        finally { setAlertSaving(false) }
    }

    /* loading */
    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#047857,#10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'spin 1s linear infinite', boxShadow: '0 4px 20px rgba(5,150,105,0.35)'
            }}>
                <RefreshCw size={24} color="white" />
            </div>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Chargement des données de facturation…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    /* error */
    if (loadError) return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <AlertTriangle size={40} color="#dc2626" />
            <p style={{ color: '#dc2626', fontWeight: 600 }}>Impossible de charger les données de facturation.</p>
            <button onClick={load} style={btnPrimary()}>
                <RefreshCw size={14} /> Réessayer
            </button>
        </div>
    )

    const isForfait    = status?.billing_mode === 'forfait'
    const balance      = status !== null ? (status?.credit_balance ?? 0) : null
    const balanceColor = CREDIT_COLOR(balance ?? 0)

    const tabs = [
        { key: 'credits' },
        { key: 'tarifs' },
        { key: 'forfait' },
        { key: 'history' },
        { key: 'alerts' },
        ...(user?.role === 'ADMIN' ? [{ key: 'request', badge: myRequests.filter(r => r.status === 'pending').length }] : []),
    ]
    const tc = TAB_CONFIG[tab]

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

            {/* ── Hero ── */}
            <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
                padding: '2rem 2rem 5.5rem',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position:'absolute', top:'-70px', right:'-70px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:'-40px', left:'30%', width:'180px', height:'180px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                        <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.25)' }}>
                            <CreditCard size={24} color="white" />
                        </div>
                        <div>
                            <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:900, color:'white', letterSpacing:'-0.02em' }}>
                                Facturation & Crédits
                            </h1>
                            <p style={{ margin:'0.25rem 0 0', color:'rgba(255,255,255,0.65)', fontSize:'0.85rem' }}>
                                Gérez votre solde, vos tarifs et vos alertes de consommation.
                            </p>
                        </div>
                    </div>

                    <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                        <button onClick={load} disabled={loading} style={btnSecondary()}>
                            <RefreshCw size={14} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
                            Actualiser
                        </button>
                        {!isForfait && (
                            <button onClick={() => navigate('/billing/purchase')} style={{
                                display:'flex', alignItems:'center', gap:'6px',
                                background:'white', color:'#065f46', border:'none', borderRadius:'8px',
                                padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:'14px',
                                boxShadow:'0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                                <CreditCard size={15} /> Acheter des crédits
                            </button>
                        )}

                        {/* Solde pill dans le hero */}
                        {!isForfait && balance !== null && (
                            <div style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'1rem', padding:'0.6rem 1.1rem', textAlign:'center' }}>
                                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'white', lineHeight:1 }}>
                                    {balance.toLocaleString()}
                                </div>
                                <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', marginTop:'0.15rem' }}>crédits</div>
                            </div>
                        )}
                        {isForfait && (
                            <div style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'1rem', padding:'0.6rem 1.1rem', textAlign:'center' }}>
                                <div style={{ fontSize:'1rem', fontWeight:800, color:'white', lineHeight:1 }}>✅ Forfait</div>
                                <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', marginTop:'0.15rem' }}>actif</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Floating card ── */}
            <div style={{ maxWidth:'1300px', margin:'-48px auto 0', padding:'0 2rem 3rem', position:'relative', zIndex:10 }}>

                {/* Alert banners */}
                {!isForfait && balance !== null && balance <= 0 && (
                    <div style={{ background:'#fee2e2', border:'2px solid #dc2626', borderRadius:'1rem', padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem', boxShadow:'0 4px 16px rgba(220,38,38,0.15)' }}>
                        <AlertTriangle size={22} color="#dc2626" />
                        <div style={{ flex:1 }}>
                            <strong style={{ color:'#991b1b', display:'block' }}>Crédits épuisés — Compte en lecture seule</strong>
                            <p style={{ margin:'4px 0 0', color:'#7f1d1d', fontSize:'13px' }}>La saisie, modification et suppression de données sont suspendues.</p>
                        </div>
                        <button onClick={() => navigate('/billing/purchase')} style={btnPrimary({ background:'#dc2626', boxShadow:'0 4px 12px rgba(220,38,38,0.3)' })}>
                            Recharger →
                        </button>
                    </div>
                )}
                {!isForfait && balance !== null && balance > 0 && balance <= 20 && (
                    <div style={{ background:'#fee2e2', border:'1px solid #f87171', borderRadius:'1rem', padding:'0.85rem 1.25rem', display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        <span style={{ color:'#b91c1c', fontSize:'14px', flex:1 }}>
                            Solde critique : <strong>{balance} crédits</strong> restants. Rechargez au plus vite.
                        </span>
                        <button onClick={() => navigate('/billing/purchase')} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:'6px', padding:'6px 14px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>Recharger</button>
                    </div>
                )}
                {!isForfait && balance !== null && balance > 20 && balance <= 50 && (
                    <div style={{ background:'#fff7ed', border:'1px solid #fb923c', borderRadius:'1rem', padding:'0.85rem 1.25rem', display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
                        <AlertTriangle size={18} color="#f97316" />
                        <span style={{ color:'#c2410c', fontSize:'14px' }}>
                            Solde faible : <strong>{balance} crédits</strong>. Pensez à recharger prochainement.
                        </span>
                    </div>
                )}

                {/* ── Tab bar ── */}
                <div style={{
                    background:'white', borderRadius:'1.15rem',
                    boxShadow:'0 8px 32px rgba(0,0,0,0.1)',
                    border:'1px solid #e2e8f0',
                    padding:'0.5rem', marginBottom:'1.5rem',
                    display:'flex', gap:'0.4rem', overflowX:'auto'
                }}>
                    {tabs.map(t => {
                        const cfg = TAB_CONFIG[t.key]
                        const active = tab === t.key
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{
                                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                                padding:'0.6rem 1rem', borderRadius:'0.8rem', border:'none', cursor:'pointer',
                                fontWeight: active ? 700 : 500, fontSize:'0.85rem',
                                background: active ? cfg.grad : 'transparent',
                                color: active ? 'white' : '#64748b',
                                boxShadow: active ? `0 4px 14px ${cfg.accent}44` : 'none',
                                transition:'all 0.2s', whiteSpace:'nowrap', position:'relative'
                            }}>
                                {cfg.icon} {cfg.label}
                                {t.badge > 0 && (
                                    <span style={{ background:'#ef4444', color:'white', borderRadius:'99px', fontSize:'10px', fontWeight:700, padding:'1px 6px' }}>
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* ══════════ ONGLET CRÉDITS ══════════ */}
                {tab === 'credits' && (
                    <div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem', marginBottom:'1.25rem' }}>

                            {/* Solde */}
                            <div style={{ background:'white', borderRadius:'1rem', border:'1px solid #a7f3d0', boxShadow:'0 4px 16px rgba(5,150,105,0.08)', overflow:'hidden' }}>
                                <div style={{ height:'4px', background:'linear-gradient(135deg,#047857,#10b981)' }} />
                                <div style={{ padding:'1.5rem', textAlign:'center' }}>
                                    <div style={{ fontSize:'12px', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>
                                        {isForfait ? 'Mode actif' : 'Solde crédits'}
                                    </div>
                                    {isForfait ? (
                                        <div>
                                            <Shield size={36} color="#16a34a" style={{ marginBottom:'8px' }} />
                                            <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#16a34a' }}>Forfait actif</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize:'3.5rem', fontWeight:900, color: balanceColor, lineHeight:1, letterSpacing:'-0.03em' }}>
                                                {balance === null ? '—' : balance.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize:'13px', color:'#94a3b8', marginTop:'4px' }}>crédits</div>
                                            <div style={{ background:'#f1f5f9', borderRadius:'99px', height:'8px', margin:'1rem 0 0.5rem', overflow:'hidden' }}>
                                                <div style={{
                                                    height:'100%', borderRadius:'99px', background: balanceColor,
                                                    width:`${Math.min(100, Math.max(0, (balance / Math.max((status?.thresholds?.level_1||100)*2, balance)) * 100))}%`,
                                                    transition:'width 0.5s ease'
                                                }} />
                                            </div>
                                            {status?.analytics?.days_remaining != null && (
                                                <div style={{ fontSize:'12px', color:'#94a3b8' }}>
                                                    ≈ <strong style={{ color: balanceColor }}>{status.analytics.days_remaining} jours</strong> à ce rythme
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Consommation 30j */}
                            <div style={{ background:'white', borderRadius:'1rem', border:'1px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                                <div style={{ height:'4px', background:'linear-gradient(135deg,#5b21b6,#8b5cf6)' }} />
                                <div style={{ padding:'1.5rem' }}>
                                    <div style={{ fontSize:'12px', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                                        <TrendingDown size={13} /> Consommation 30j
                                    </div>
                                    <div style={{ fontSize:'2.5rem', fontWeight:900, color:'#1e293b', lineHeight:1 }}>
                                        {status?.analytics?.consumed_30d?.toLocaleString() || 0}
                                    </div>
                                    <div style={{ fontSize:'13px', color:'#94a3b8', marginTop:'4px' }}>crédits utilisés</div>
                                    <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #f1f5f9' }}>
                                        <div style={{ fontSize:'12px', color:'#64748b' }}>{status?.analytics?.operations_30d || 0} opérations</div>
                                        <div style={{ fontSize:'12px', color:'#64748b', marginTop:'2px' }}>Moy. {status?.analytics?.avg_daily || 0} crédits/jour</div>
                                    </div>
                                </div>
                            </div>

                            {/* Mode facturation */}
                            <div style={{ background:'white', borderRadius:'1rem', border:'1px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                                <div style={{ height:'4px', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)' }} />
                                <div style={{ padding:'1.5rem' }}>
                                    <div style={{ fontSize:'12px', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                                        <Settings size={13} /> Mode de facturation
                                    </div>
                                    <div style={{ marginBottom:'1rem' }}>
                                        <span style={{
                                            padding:'6px 16px', borderRadius:'99px', fontWeight:700, fontSize:'14px',
                                            background: isForfait ? '#dcfce7' : '#dbeafe',
                                            color: isForfait ? '#16a34a' : '#1d4ed8',
                                            border: `1px solid ${isForfait ? '#a7f3d0' : '#bfdbfe'}`
                                        }}>
                                            {isForfait ? `Forfait ${status?.forfait_type === 'annuel' ? 'Annuel' : 'Lifetime'}` : 'Crédits'}
                                        </span>
                                    </div>
                                    {isForfait && status?.forfait_type === 'annuel' && status?.forfait_expires_at && (
                                        <div style={{ fontSize:'13px', color:'#64748b' }}>
                                            <Calendar size={12} style={{ display:'inline', marginRight:4 }} />
                                            Expire le {new Date(status.forfait_expires_at).toLocaleDateString('fr-FR')}
                                            {status.forfait_expired && <span style={{ color:'#dc2626', fontWeight:600, display:'block', marginTop:4 }}>⚠️ Forfait expiré</span>}
                                        </div>
                                    )}
                                    {isForfait && status?.forfait_type === 'indefini' && (
                                        <div style={{ fontSize:'13px', color:'#16a34a', display:'flex', alignItems:'center', gap:4 }}>
                                            <CheckCircle size={13} /> Accès illimité permanent
                                        </div>
                                    )}
                                    {!isForfait && (
                                        <button onClick={() => setTab('forfait')} style={{ fontSize:'13px', color:'#2563eb', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0, fontWeight:600 }}>
                                            Passer au forfait <ArrowRight size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Graphique */}
                        <BlockCard icon={<BarChart2 size={16} color="white" />} title="Consommation par jour"
                            grad="linear-gradient(135deg,#047857,#10b981)"
                            style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
                                <select value={period} onChange={e => setPeriod(+e.target.value)}
                                    style={{ border:'1px solid #e2e8f0', borderRadius:'0.5rem', padding:'5px 10px', fontSize:'13px', color:'#374151', cursor:'pointer' }}>
                                    <option value={7}>7 jours</option>
                                    <option value={30}>30 jours</option>
                                    <option value={90}>90 jours</option>
                                </select>
                            </div>
                            <SimpleBarChart data={consumption?.daily || []} />
                        </BlockCard>

                        {!isForfait && (
                            <div style={{ textAlign:'center' }}>
                                <button onClick={() => navigate('/billing/purchase')} style={btnPrimary({ padding:'14px 36px', fontSize:'15px' })}>
                                    <CreditCard size={18} /> Acheter des crédits
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ ONGLET TARIFS ══════════ */}
                {tab === 'tarifs' && (
                    <div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
                            <div>
                                <h2 style={{ margin:0, fontSize:'1.05rem', fontWeight:700, color:'#1e293b' }}>Tarifs & Consommation</h2>
                                <p style={{ margin:'4px 0 0', fontSize:'13px', color:'#64748b' }}>Grille tarifaire et détail de votre consommation de crédits</p>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <Calendar size={14} color="#64748b" />
                                <select value={tarifsPeriod} onChange={e => setTarifsPeriod(Number(e.target.value))}
                                    style={{ padding:'7px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'14px', color:'#374151', cursor:'pointer' }}>
                                    {[7,30,60,90,180,365].map(d => <option key={d} value={d}>{d === 365 ? '1 an' : `${d} jours`}</option>)}
                                </select>
                                <button onClick={loadTarifs} disabled={tarifsLoading}
                                    style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'7px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                                    <RefreshCw size={14} color="#64748b" style={tarifsLoading ? { animation:'spin 1s linear infinite' } : {}} />
                                </button>
                            </div>
                        </div>

                        {tarifsLoading && (
                            <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
                                <RefreshCw size={24} style={{ animation:'spin 1s linear infinite' }} />
                            </div>
                        )}

                        {!tarifsLoading && tarifs && (
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>

                                {/* Grille tarifaire */}
                                <BlockCard icon={<ListChecks size={16} color="white" />} title="Grille tarifaire"
                                    grad="linear-gradient(135deg,#5b21b6,#8b5cf6)"
                                    style={{ gridColumn: tarifs.usageByType.length === 0 ? '1 / -1' : undefined }}>
                                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                                        <thead>
                                            <tr style={{ borderBottom:'2px solid #f1f5f9' }}>
                                                <th style={{ textAlign:'left', padding:'8px 0', color:'#64748b', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Opération</th>
                                                <th style={{ textAlign:'right', padding:'8px 0', color:'#64748b', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Coût</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tarifs.rules.map((r, i) => (
                                                <tr key={r.operation_type} style={{ borderBottom:'1px solid #f8fafc', background: i%2===0 ? 'white' : '#fafbff' }}>
                                                    <td style={{ padding:'10px 4px 10px 0', color:'#374151' }}>
                                                        <span style={{ display:'inline-block', fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'99px', background: r.is_active ? '#ede9fe' : '#f3f4f6', color: r.is_active ? '#7c3aed' : '#9ca3af', marginRight:'8px' }}>
                                                            {r.operation_type}
                                                        </span>
                                                        {r.operation_name}
                                                    </td>
                                                    <td style={{ padding:'10px 0', textAlign:'right' }}>
                                                        <span style={{ fontWeight:800, fontSize:'15px', color: r.cost >= 5 ? '#dc2626' : r.cost >= 2 ? '#f97316' : '#16a34a' }}>{r.cost}</span>
                                                        <span style={{ color:'#94a3b8', fontSize:'12px', marginLeft:'4px' }}>crédit{r.cost>1?'s':''}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={{ marginTop:'1rem', padding:'10px 12px', background: isForfait ? '#f0fdf4' : '#eff6ff', borderRadius:'8px', fontSize:'13px', color: isForfait ? '#15803d' : '#1d4ed8' }}>
                                        {isForfait ? '✅ Forfait actif — toutes les opérations sont incluses sans débit.' : '💡 En mode crédits, chaque opération débite votre solde selon ce barème.'}
                                    </div>
                                </BlockCard>

                                {/* Consommation par opération */}
                                {tarifs.usageByType.length > 0 && (
                                    <BlockCard icon={<TrendingDown size={16} color="white" />} title={`Consommation sur ${tarifsPeriod} jours`}
                                        grad="linear-gradient(135deg,#b45309,#f59e0b)">
                                        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
                                            <span style={{ fontWeight:800, fontSize:'1.1rem', color:'#dc2626' }}>{tarifs.totalConsumed.toLocaleString()} crédits</span>
                                        </div>
                                        {tarifs.usageByType.map((u, i) => {
                                            const pct = tarifs.totalConsumed > 0 ? Math.round((u.total_credits/tarifs.totalConsumed)*100) : 0
                                            const colors = ['#6366f1','#f97316','#10b981','#3b82f6','#ec4899','#8b5cf6','#ef4444']
                                            const color = colors[i % colors.length]
                                            return (
                                                <div key={i} style={{ marginBottom:'14px' }}>
                                                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'13px' }}>
                                                        <span style={{ fontWeight:600, color:'#374151' }}>{u.operation_name || u.operation_type || 'Autre'}</span>
                                                        <span style={{ color:'#64748b' }}>
                                                            <strong style={{ color:'#1e293b' }}>{parseFloat(u.total_credits).toLocaleString()}</strong> cr · {u.count}× · {pct}%
                                                        </span>
                                                    </div>
                                                    <div style={{ height:'8px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden' }}>
                                                        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'99px', transition:'width 0.5s ease' }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </BlockCard>
                                )}

                                {/* Détail opérations */}
                                {tarifs.usageDetail.length > 0 && (
                                    <BlockCard icon={<Clock size={16} color="white" />} title="Détail des opérations (50 dernières)"
                                        grad="linear-gradient(135deg,#334155,#64748b)"
                                        style={{ gridColumn:'1 / -1' }}>
                                        <div style={{ overflowX:'auto' }}>
                                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                                                <thead>
                                                    <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                                                        {['Date','Opération','Référence','Crédits débités'].map(h => (
                                                            <th key={h} style={{ padding:'8px 12px', textAlign: h==='Crédits débités' ? 'right' : 'left', color:'#475569', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tarifs.usageDetail.map((op, i) => (
                                                        <tr key={op.id} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0 ? 'white' : '#fafafa' }}>
                                                            <td style={{ padding:'8px 12px', color:'#64748b', whiteSpace:'nowrap' }}>
                                                                {new Date(op.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                                                            </td>
                                                            <td style={{ padding:'8px 12px', color:'#374151', fontWeight:500 }}>{op.operation_name}</td>
                                                            <td style={{ padding:'8px 12px', color:'#94a3b8', fontFamily:'monospace', fontSize:'12px' }}>{op.reference || '—'}</td>
                                                            <td style={{ padding:'8px 12px', textAlign:'right' }}>
                                                                <span style={{ fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'2px 8px', borderRadius:'99px', fontSize:'12px' }}>
                                                                    −{parseFloat(op.credits).toLocaleString()}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                                                        <td colSpan={3} style={{ padding:'10px 12px', fontWeight:700, color:'#374151', fontSize:'13px' }}>Total sur {tarifsPeriod} jours</td>
                                                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, color:'#dc2626', fontSize:'15px' }}>−{tarifs.totalConsumed.toLocaleString()} crédits</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </BlockCard>
                                )}

                                {tarifs.usageByType.length === 0 && (
                                    <div style={{ ...card(), textAlign:'center', color:'#94a3b8', gridColumn:'2/3' }}>
                                        <BarChart2 size={32} style={{ marginBottom:'8px', opacity:0.3 }} />
                                        <p style={{ margin:0 }}>Aucune consommation enregistrée sur cette période.</p>
                                        <p style={{ margin:'4px 0 0', fontSize:'12px' }}>Les opérations que vous effectuez seront listées ici.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ ONGLET FORFAIT ══════════ */}
                {tab === 'forfait' && (
                    <div>
                        {isForfait ? (
                            <BlockCard icon={<Shield size={16} color="white"/>} title="Forfait actif"
                                grad="linear-gradient(135deg,#047857,#10b981)"
                                style={{ maxWidth:'540px', margin:'0 auto', textAlign:'center' }}>
                                <div style={{ padding:'1.5rem 0' }}>
                                    <CheckCircle size={56} color="#16a34a" style={{ marginBottom:'16px' }} />
                                    <h2 style={{ color:'#15803d', marginBottom:'8px', fontSize:'1.3rem' }}>
                                        Forfait {status?.forfait_type === 'annuel' ? 'Annuel' : 'Lifetime'} Actif
                                    </h2>
                                    {status?.forfait_type === 'annuel' && status?.forfait_expires_at && (
                                        <p style={{ color:'#64748b', margin:0 }}>
                                            Valide jusqu'au <strong>{new Date(status.forfait_expires_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</strong>
                                        </p>
                                    )}
                                    {status?.forfait_type === 'indefini' && <p style={{ color:'#64748b', margin:0 }}>Votre accès est illimité et permanent.</p>}
                                </div>
                            </BlockCard>
                        ) : (
                            <div>
                                <p style={{ color:'#64748b', marginBottom:'1.5rem', fontSize:'15px', background:'white', borderRadius:'1rem', padding:'1rem 1.25rem', border:'1px solid #e2e8f0' }}>
                                    💡 Passez au forfait pour un accès illimité sans débit de crédits. Contactez votre administrateur Soft Transit pour activer un forfait.
                                </p>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', maxWidth:'700px' }}>
                                    {forfaitOptions.map(f => (
                                        <div key={f.type} style={{ background:'white', borderRadius:'1rem', border:'1px solid #bfdbfe', boxShadow:'0 4px 16px rgba(37,99,235,0.08)', padding:'2rem', textAlign:'center', position:'relative' }}>
                                            {f.type === 'indefini' && (
                                                <div style={{ position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', fontSize:'11px', fontWeight:700, padding:'4px 14px', borderRadius:'99px', boxShadow:'0 4px 10px rgba(37,99,235,0.3)' }}>
                                                    MEILLEURE VALEUR
                                                </div>
                                            )}
                                            <Shield size={36} color="#2563eb" style={{ marginBottom:'12px' }} />
                                            <h3 style={{ marginBottom:'8px', color:'#1e293b' }}>{f.label}</h3>
                                            <p style={{ color:'#64748b', fontSize:'13px', marginBottom:'16px' }}>{f.description}</p>
                                            <div style={{ fontSize:'2.2rem', fontWeight:900, color:'#2563eb', letterSpacing:'-0.03em' }}>{f.price_eur}€</div>
                                            <div style={{ fontSize:'13px', color:'#94a3b8', marginBottom:'20px' }}>
                                                {Number(f.price_cfa).toLocaleString()} CFA {f.type==='annuel' ? '/ an' : '— paiement unique'}
                                            </div>
                                            <a href="mailto:contact@softtransit.com" style={{ display:'block', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', padding:'10px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'14px' }}>
                                                Contacter pour activer
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ ONGLET HISTORIQUE ══════════ */}
                {tab === 'history' && (
                    <BlockCard icon={<BarChart2 size={16} color="white"/>} title="Historique des transactions"
                        grad="linear-gradient(135deg,#334155,#64748b)">
                        <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                <thead>
                                    <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                                        {['Date','Type','Crédits','Montant','Méthode','Statut'].map(h => (
                                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((t, i) => (
                                        <tr key={t.id} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0 ? 'white' : '#fafafa' }}>
                                            <td style={{ padding:'10px 12px', fontSize:'13px', color:'#374151' }}>
                                                {new Date(t.created_at).toLocaleDateString('fr-FR')}{' '}
                                                <span style={{ color:'#94a3b8' }}>{new Date(t.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                                            </td>
                                            <td style={{ padding:'10px 12px' }}>
                                                <span style={{ padding:'3px 10px', borderRadius:'99px', fontSize:'12px', fontWeight:600, background: t.type==='PURCHASE'?'#dbeafe':t.type==='USAGE'?'#fef9c3':'#f3f4f6', color: t.type==='PURCHASE'?'#1d4ed8':t.type==='USAGE'?'#a16207':'#6b7280' }}>
                                                    {t.type==='PURCHASE'?'Achat':t.type==='USAGE'?'Consommation':t.type}
                                                </span>
                                            </td>
                                            <td style={{ padding:'10px 12px', fontWeight:700, color: t.type==='PURCHASE'?'#16a34a':'#dc2626', fontSize:'14px' }}>
                                                {t.type==='PURCHASE'?'+':'-'}{Math.abs(t.credits).toLocaleString()}
                                            </td>
                                            <td style={{ padding:'10px 12px', fontSize:'13px', color:'#374151' }}>
                                                {t.amount_eur ? `${t.amount_eur}€` : '—'}
                                                {t.amount_cfa ? <span style={{ color:'#94a3b8', marginLeft:4, fontSize:'11px' }}>/ {Number(t.amount_cfa).toLocaleString()} CFA</span> : ''}
                                            </td>
                                            <td style={{ padding:'10px 12px', fontSize:'13px', color:'#64748b', textTransform:'capitalize' }}>
                                                {t.payment_provider?.replace('_',' ') || '—'}
                                            </td>
                                            <td style={{ padding:'10px 12px' }}><StatusBadge status={t.status} /></td>
                                        </tr>
                                    ))}
                                    {!history.length && (
                                        <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>Aucune transaction</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </BlockCard>
                )}

                {/* ══════════ ONGLET ALERTES ══════════ */}
                {tab === 'alerts' && (
                    <div style={{ maxWidth:'600px' }}>
                        <BlockCard icon={<Bell size={16} color="white"/>} title="Configuration des alertes crédit"
                            grad="linear-gradient(135deg,#b45309,#f59e0b)" style={{ marginBottom:'1.25rem' }}>
                            <p style={{ color:'#64748b', fontSize:'14px', marginBottom:'1.5rem', marginTop:0 }}>
                                Recevez un email automatique quand votre solde passe en dessous des seuils définis ci-dessous.
                            </p>
                            <div style={{ marginBottom:'1.25rem' }}>
                                <label style={labelSt}>Email de notification</label>
                                <input type="email" value={alertForm.email} onChange={e => setAlertForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="email@votre-entreprise.com" style={inputSt} />
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
                                {[
                                    { key:'t1', label:'Seuil 1 (Attention)', color:'#f59e0b' },
                                    { key:'t2', label:'Seuil 2 (Urgent)',    color:'#f97316' },
                                    { key:'t3', label:'Seuil 3 (Critique)',  color:'#ef4444' },
                                ].map(({ key, label, color }) => (
                                    <div key={key}>
                                        <label style={{ ...labelSt, color }}>{label}</label>
                                        <input type="number" min="1" value={alertForm[key]}
                                            onChange={e => setAlertForm(f => ({ ...f, [key]: +e.target.value }))}
                                            style={{ ...inputSt, borderColor: color }} />
                                        <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px' }}>crédits</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'10px 14px', marginBottom:'1.5rem', fontSize:'13px', color:'#92400e' }}>
                                ℹ️ Les seuils doivent être décroissants : Seuil 1 &gt; Seuil 2 &gt; Seuil 3. Les flags se réinitialisent à chaque recharge.
                            </div>
                            {alertSuccess && (
                                <div style={{ background:'#dcfce7', color:'#15803d', padding:'10px 14px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px', display:'flex', alignItems:'center', gap:6 }}>
                                    <CheckCircle size={16} /> Alertes enregistrées avec succès
                                </div>
                            )}
                            <button onClick={saveAlerts} disabled={alertSaving} style={{ ...btnPrimary({ background:'linear-gradient(135deg,#b45309,#f59e0b)', boxShadow:'0 4px 12px rgba(217,119,6,0.3)', width:'100%', justifyContent:'center', padding:'12px' }) }}>
                                {alertSaving ? 'Enregistrement...' : 'Enregistrer les alertes'}
                            </button>
                        </BlockCard>

                        {status?.alerts_sent && (
                            <BlockCard icon={<Activity size={16} color="white"/>} title="État des alertes"
                                grad="linear-gradient(135deg,#334155,#64748b)">
                                {[
                                    { level:1, label:'Niveau 1 (Attention)', sent:status.alerts_sent.level_1, value:status.thresholds.level_1 },
                                    { level:2, label:'Niveau 2 (Urgent)',    sent:status.alerts_sent.level_2, value:status.thresholds.level_2 },
                                    { level:3, label:'Niveau 3 (Critique)',  sent:status.alerts_sent.level_3, value:status.thresholds.level_3 },
                                ].map(a => (
                                    <div key={a.level} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                                        <span style={{ fontSize:'13px', color:'#374151' }}>{a.label} (≤ {a.value} crédits)</span>
                                        <span style={{ fontSize:'12px', fontWeight:600, padding:'3px 10px', borderRadius:'99px', background: a.sent ? '#fee2e2' : '#dcfce7', color: a.sent ? '#dc2626' : '#16a34a' }}>
                                            {a.sent ? '⚠️ Envoyée' : '✓ En attente'}
                                        </span>
                                    </div>
                                ))}
                            </BlockCard>
                        )}
                    </div>
                )}

                {/* ══════════ ONGLET DEMANDE ══════════ */}
                {tab === 'request' && user?.role === 'ADMIN' && (
                    <div style={{ maxWidth:'640px' }}>
                        <BlockCard icon={<Send size={16} color="white"/>} title="Demander un changement de mode"
                            grad="linear-gradient(135deg,#9f1239,#e11d48)" style={{ marginBottom:'1.25rem' }}>
                            <p style={{ color:'#64748b', fontSize:'14px', margin:'0 0 1.5rem' }}>
                                Votre demande sera transmise à l'équipe Soft Transit et traitée sous 24h ouvrées.
                            </p>

                            {myRequests.some(r => r.status === 'pending') ? (
                                <div style={{ background:'#fef9c3', border:'1px solid #fbbf24', borderRadius:'8px', padding:'14px 16px', fontSize:'14px', color:'#92400e', display:'flex', alignItems:'center', gap:'10px' }}>
                                    <Clock size={16} />
                                    Vous avez une demande en attente. Vous pourrez en soumettre une nouvelle après traitement.
                                </div>
                            ) : (
                                <>
                                    {requestMsg === 'success' && (
                                        <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:'8px', padding:'12px 16px', marginBottom:'1rem', color:'#15803d', fontSize:'14px', display:'flex', alignItems:'center', gap:8 }}>
                                            <CheckCircle size={16} /> Demande envoyée ! L'équipe Soft Transit vous répondra sous 24h.
                                        </div>
                                    )}
                                    {requestMsg.startsWith('error:') && (
                                        <div style={{ background:'#fee2e2', border:'1px solid #f87171', borderRadius:'8px', padding:'12px 16px', marginBottom:'1rem', color:'#991b1b', fontSize:'14px' }}>
                                            {requestMsg.replace('error:', '')}
                                        </div>
                                    )}

                                    <div style={{ marginBottom:'1.25rem' }}>
                                        <label style={labelSt}>Mode souhaité *</label>
                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                            {[
                                                { mode:'credits', label:'Crédits', icon:<Zap size={18}/>, desc:"Paiement à l'usage", disabled: isForfait===false },
                                                { mode:'forfait', label:'Forfait', icon:<Shield size={18}/>, desc:'Accès illimité', disabled: isForfait===true },
                                            ].map(opt => (
                                                <button key={opt.mode}
                                                    onClick={() => !opt.disabled && setRequestForm(f => ({ ...f, requested_mode: opt.mode }))}
                                                    style={{ padding:'14px', borderRadius:'10px', textAlign:'left', border:`2px solid ${requestForm.requested_mode===opt.mode ? '#e11d48' : '#e2e8f0'}`, background: opt.disabled ? '#f9fafb' : requestForm.requested_mode===opt.mode ? '#fff1f2' : 'white', cursor: opt.disabled ? 'not-allowed' : 'pointer', opacity: opt.disabled ? 0.5 : 1 }}>
                                                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', color:'#111827', fontWeight:600 }}>{opt.icon} {opt.label}</div>
                                                    <div style={{ fontSize:'12px', color:'#64748b' }}>{opt.desc}</div>
                                                    {opt.disabled && <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px' }}>Mode actuel</div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {requestForm.requested_mode === 'forfait' && (
                                        <div style={{ marginBottom:'1.25rem' }}>
                                            <label style={labelSt}>Type de forfait souhaité</label>
                                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                                {[
                                                    { type:'annuel',  label:'Annuel',  price:'599€/an',  cfa:'393 000 CFA/an' },
                                                    { type:'indefini',label:'Lifetime', price:'1 199€',   cfa:'786 000 CFA' },
                                                ].map(ft => (
                                                    <button key={ft.type} onClick={() => setRequestForm(f => ({ ...f, requested_forfait_type: ft.type }))}
                                                        style={{ padding:'12px', borderRadius:'10px', textAlign:'left', border:`2px solid ${requestForm.requested_forfait_type===ft.type ? '#e11d48' : '#e2e8f0'}`, background: requestForm.requested_forfait_type===ft.type ? '#fff1f2' : 'white', cursor:'pointer' }}>
                                                        <div style={{ fontWeight:600, color:'#111827', marginBottom:'2px' }}>{ft.label}</div>
                                                        <div style={{ fontSize:'13px', color:'#e11d48', fontWeight:700 }}>{ft.price}</div>
                                                        <div style={{ fontSize:'11px', color:'#94a3b8' }}>{ft.cfa}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom:'1.5rem' }}>
                                        <label style={labelSt}>Message (optionnel)</label>
                                        <textarea value={requestForm.message} onChange={e => setRequestForm(f => ({ ...f, message: e.target.value }))}
                                            placeholder="Précisez vos besoins ou posez vos questions..."
                                            rows={4} style={{ ...inputSt, resize:'vertical' }} />
                                    </div>

                                    <button onClick={sendModeRequest} disabled={requestSending || !requestForm.requested_mode}
                                        style={{ ...btnPrimary({ background:'linear-gradient(135deg,#9f1239,#e11d48)', boxShadow:'0 4px 12px rgba(225,29,72,0.3)', width:'100%', justifyContent:'center', padding:'12px', opacity: (!requestForm.requested_mode || requestSending) ? 0.6 : 1 }) }}>
                                        <Send size={16} />
                                        {requestSending ? 'Envoi en cours...' : 'Envoyer la demande'}
                                    </button>
                                </>
                            )}
                        </BlockCard>

                        {myRequests.length > 0 && (
                            <BlockCard icon={<Clock size={16} color="white"/>} title="Mes demandes précédentes"
                                grad="linear-gradient(135deg,#334155,#64748b)">
                                {myRequests.map(r => (
                                    <div key={r.id} style={{ padding:'12px 0', borderBottom:'1px solid #f1f5f9' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                            <div>
                                                <span style={{ fontWeight:600, fontSize:'14px', color:'#1e293b', textTransform:'capitalize' }}>
                                                    {r.current_mode} → {r.requested_mode}{r.requested_forfait_type ? ` (${r.requested_forfait_type})` : ''}
                                                </span>
                                                <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px' }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                                                {r.admin_notes && <div style={{ fontSize:'13px', color:'#374151', marginTop:'6px', fontStyle:'italic' }}>"{r.admin_notes}"</div>}
                                            </div>
                                            <RequestStatusBadge status={r.status} />
                                        </div>
                                    </div>
                                ))}
                            </BlockCard>
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}
