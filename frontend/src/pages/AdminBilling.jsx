import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Building2, CreditCard, Shield, ShieldCheck, Search, RefreshCw,
    Plus, Edit2, X, AlertTriangle, Users, FileText, Euro,
    MessageSquare, CheckCircle, Clock, Calendar, ListChecks, Trash2,
    Tag, Coins, Settings, Activity
} from 'lucide-react'
import { billingAPI, usersAPI, tarifsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

/* ── tab config ── */
const TAB_CFG = {
    companies:  { label: 'Entreprises',    icon: <Building2 size={14}/>,  grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', accent: '#2563eb' },
    requests:   { label: 'Demandes',       icon: <MessageSquare size={14}/>, grad: 'linear-gradient(135deg,#b45309,#f59e0b)', accent: '#d97706' },
    packs:      { label: 'Packs crédits',  icon: <CreditCard size={14}/>, grad: 'linear-gradient(135deg,#047857,#10b981)', accent: '#059669' },
    tarifs:     { label: 'Tarifs & Forfaits', icon: <ListChecks size={14}/>, grad: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', accent: '#7c3aed' },
    superadmins:{ label: 'Super Admins',   icon: <ShieldCheck size={14}/>, grad: 'linear-gradient(135deg,#0f172a,#334155)', accent: '#334155' },
}

/* ── atoms ── */
const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }
const inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'14px', boxSizing:'border-box', outline:'none' }
const btnP = (ex={}) => ({ display:'inline-flex', alignItems:'center', gap:'6px', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:'8px', padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:'13px', boxShadow:'0 4px 12px rgba(37,99,235,0.3)', transition:'all 0.2s', ...ex })
const btnS = (ex={}) => ({ display:'inline-flex', alignItems:'center', gap:'6px', background:'white', color:'#374151', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'9px 14px', cursor:'pointer', fontWeight:600, fontSize:'13px', ...ex })

/* ── sub-components ── */
function KpiPill({ icon, label, value, grad }) {
    return (
        <div style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.22)', borderRadius:'1rem', padding:'0.75rem 1.2rem', minWidth:'120px' }}>
            <div style={{ fontSize:'1.6rem', fontWeight:900, color:'white', lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.75)', marginTop:'0.2rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                {icon} {label}
            </div>
        </div>
    )
}

function BlockCard({ grad, icon, title, children, action, style={} }) {
    return (
        <div style={{ background:'white', borderRadius:'1rem', border:'1px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,0.06)', overflow:'hidden', ...style }}>
            <div style={{ background:grad, padding:'0.85rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <div style={{ width:'30px', height:'30px', borderRadius:'8px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
                    <span style={{ color:'white', fontWeight:700, fontSize:'0.9rem' }}>{title}</span>
                </div>
                {action}
            </div>
            <div style={{ padding:'1.35rem' }}>{children}</div>
        </div>
    )
}

function RequestBadge({ status }) {
    const map = {
        pending:  { bg:'#fef9c3', color:'#a16207', label:'⏳ En attente' },
        approved: { bg:'#dcfce7', color:'#15803d', label:'✅ Approuvée' },
        rejected: { bg:'#fee2e2', color:'#dc2626', label:'❌ Refusée' },
    }
    const s = map[status] || map.pending
    return <span style={{ padding:'4px 12px', borderRadius:'99px', fontSize:'12px', fontWeight:600, background:s.bg, color:s.color }}>{s.label}</span>
}

function Modal({ title, children, onClose }) {
    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'white', borderRadius:'1.15rem', padding:'2rem', width:'100%', maxWidth:'490px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                    <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#1e293b' }}>{title}</h3>
                    <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}><X size={17}/></button>
                </div>
                {children}
            </div>
        </div>
    )
}

/* ── main ── */
export default function AdminBilling() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [tab, setTab]                       = useState('companies')
    const [companies, setCompanies]           = useState([])
    const [packs, setPacks]                   = useState([])
    const [requests, setRequests]             = useState([])
    const [requestFilter, setRequestFilter]   = useState('pending')
    const [admins, setAdmins]                 = useState([])
    const [adminSearch, setAdminSearch]       = useState('')
    const [loading, setLoading]               = useState(true)
    const [spinning, setSpinning]             = useState(false)
    const [search, setSearch]                 = useState('')
    const [filter, setFilter]                 = useState('all')
    const [hoveredRow, setHoveredRow]         = useState(null)
    const [handleModal, setHandleModal]       = useState(null)
    const [creditModal, setCreditModal]       = useState(null)
    const [modeModal, setModeModal]           = useState(null)
    const [packModal, setPackModal]           = useState(null)
    const [saving, setSaving]                 = useState(false)
    const [msg, setMsg]                       = useState('')
    const [creditRules, setCreditRules]       = useState([])
    const [forfaitConfig, setForfaitConfig]   = useState([])
    const [tarifsLoading, setTarifsLoading]   = useState(false)
    const [ruleModal, setRuleModal]           = useState(null)
    const [forfaitModal, setForfaitModal]     = useState(null)

    useEffect(() => { if (user?.role !== 'SUPER_ADMIN') navigate('/dashboard') }, [user])

    const load = useCallback(async () => {
        setLoading(true); setSpinning(true)
        const [cRes, pRes, rRes, aRes] = await Promise.allSettled([
            billingAPI.admin.getCompanies(),
            billingAPI.admin.getPacks(),
            billingAPI.admin.getRequests(requestFilter),
            billingAPI.admin.getSuperAdmins(),
        ])
        if (cRes.status === 'fulfilled') setCompanies(cRes.value.data || [])
        if (pRes.status === 'fulfilled') setPacks(pRes.value.data || [])
        if (rRes.status === 'fulfilled') setRequests(rRes.value.data || [])
        if (aRes.status === 'fulfilled') setAdmins(aRes.value.data || [])
        setLoading(false)
        setTimeout(() => setSpinning(false), 700)
    }, [requestFilter])

    useEffect(() => { load() }, [load])

    const loadTarifs = useCallback(async () => {
        setTarifsLoading(true)
        try {
            const [rulesRes, forfaitRes] = await Promise.allSettled([
                billingAPI.admin.getCreditRules(),
                billingAPI.admin.getForfaitConfig(),
            ])
            if (rulesRes.status === 'fulfilled') setCreditRules(rulesRes.value.data || [])
            if (forfaitRes.status === 'fulfilled') setForfaitConfig(forfaitRes.value.data || [])
        } catch (e) { console.error(e) }
        finally { setTarifsLoading(false) }
    }, [])

    useEffect(() => { if (tab === 'tarifs') loadTarifs() }, [tab, loadTarifs])

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

    const handleRequest = async () => {
        if (!handleModal) return
        setSaving(true)
        try {
            await billingAPI.admin.handleRequest(handleModal.request.id, { action: handleModal.action, admin_notes: handleModal.notes, forfait_expires_at: handleModal.expires_at })
            flash(`✓ Demande ${handleModal.action === 'approve' ? 'approuvée' : 'refusée'}`)
            setHandleModal(null); load()
        } catch (e) { flash('Erreur lors du traitement') }
        finally { setSaving(false) }
    }

    const adjustCredits = async () => {
        if (!creditModal || !creditModal.amount) return
        setSaving(true)
        try {
            const res = await billingAPI.admin.adjustCredits(creditModal.company.id, { amount: creditModal.amount, reason: creditModal.reason })
            flash(`✓ ${res.data.message} — Nouveau solde : ${res.data.new_balance}`)
            setCreditModal(null); load()
        } catch (e) { flash("Erreur lors de l'ajustement") }
        finally { setSaving(false) }
    }

    const handleToggleProvider = async (company) => {
        const promote = !company.is_provider
        if (!window.confirm(promote ? `Promouvoir "${company.name}" en super admin ?` : `Retirer le statut super admin de "${company.name}" ?`)) return
        try {
            const res = await billingAPI.admin.toggleProvider(company.id, promote)
            flash(`✓ ${res.data.message}`); load()
        } catch (e) { flash(e.response?.data?.error || 'Erreur lors de la mise à jour') }
    }

    const handleToggleSuperAdmin = async (agent) => {
        const grant = agent.role !== 'SUPER_ADMIN'
        if (!window.confirm(grant ? `Promouvoir "${agent.NomAgent}" en SUPER_ADMIN ?` : `Révoquer le rôle SUPER_ADMIN de "${agent.NomAgent}" ?`)) return
        try {
            const res = await billingAPI.admin.toggleSuperAdmin(agent.IDAgents, grant)
            flash(`✓ ${res.data.message}`); load()
        } catch (e) { flash(e.response?.data?.error || 'Erreur lors de la mise à jour') }
    }

    const setMode = async () => {
        if (!modeModal) return
        setSaving(true)
        try {
            await billingAPI.admin.setMode(modeModal.company.id, { billing_mode: modeModal.mode, forfait_type: modeModal.forfait_type || null, forfait_expires_at: modeModal.expires_at || null })
            flash(`✓ Mode de ${modeModal.company.name} mis à jour`)
            setModeModal(null); load()
        } catch (e) { flash('Erreur lors de la mise à jour') }
        finally { setSaving(false) }
    }

    const saveRule = async () => {
        if (!ruleModal) return; setSaving(true)
        try {
            if (ruleModal.id) { await billingAPI.admin.updateCreditRule(ruleModal.id, ruleModal); flash('✓ Règle mise à jour') }
            else { await billingAPI.admin.createCreditRule(ruleModal); flash('✓ Règle créée') }
            setRuleModal(null); loadTarifs()
        } catch (e) { flash(e.response?.data?.error || 'Erreur lors de la sauvegarde') }
        finally { setSaving(false) }
    }

    const deleteRule = async (rule) => {
        if (!window.confirm(`Supprimer la règle "${rule.operation_name}" ?`)) return
        try { await billingAPI.admin.deleteCreditRule(rule.id); flash('✓ Règle supprimée'); loadTarifs() }
        catch (e) { flash(e.response?.data?.error || 'Erreur lors de la suppression') }
    }

    const saveForfait = async () => {
        if (!forfaitModal) return; setSaving(true)
        try {
            if (forfaitModal._new) { await billingAPI.admin.createForfaitConfig({ type:forfaitModal.type, label:forfaitModal.label, description:forfaitModal.description, price_eur:forfaitModal.price_eur, price_cfa:forfaitModal.price_cfa, duration_months:forfaitModal.duration_months||null, is_active:forfaitModal.is_active!==undefined?forfaitModal.is_active:1 }); flash(`✓ Forfait "${forfaitModal.label}" créé`) }
            else { await billingAPI.admin.updateForfaitConfig(forfaitModal.type, { price_eur:forfaitModal.price_eur, price_cfa:forfaitModal.price_cfa, label:forfaitModal.label, description:forfaitModal.description, duration_months:forfaitModal.duration_months||null, is_active:forfaitModal.is_active!==undefined?forfaitModal.is_active:1 }); flash(`✓ Forfait "${forfaitModal.label}" mis à jour`) }
            setForfaitModal(null); loadTarifs()
        } catch (e) { flash(e.response?.data?.error || 'Erreur lors de la sauvegarde') }
        finally { setSaving(false) }
    }

    const deleteForfait = async (f) => {
        if (!window.confirm(`Supprimer le forfait "${f.label}" ?`)) return
        try { await billingAPI.admin.deleteForfaitConfig(f.type); flash(`✓ Forfait "${f.label}" supprimé`); loadTarifs() }
        catch (e) { flash(e.response?.data?.error || 'Erreur') }
    }

    const savePack = async () => {
        if (!packModal) return; setSaving(true)
        try {
            if (packModal.id) { await billingAPI.admin.updatePack(packModal.id, packModal); flash('✓ Pack mis à jour') }
            else { await billingAPI.admin.createPack(packModal); flash('✓ Pack créé') }
            setPackModal(null); load()
        } catch (e) { flash('Erreur') }
        finally { setSaving(false) }
    }

    const filtered = companies.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || (filter === 'credits' && c.billing_mode === 'credits') || (filter === 'forfait' && c.billing_mode === 'forfait') || (filter === 'empty' && parseFloat(c.credit_balance) <= 0 && c.billing_mode === 'credits')
        return matchSearch && matchFilter
    })

    const totalRevenue  = companies.reduce((s,c) => s + parseFloat(c.total_revenue_eur||0), 0)
    const emptyCount    = companies.filter(c => parseFloat(c.credit_balance) <= 0 && c.billing_mode === 'credits').length
    const forfaitCount  = companies.filter(c => c.billing_mode === 'forfait').length
    const pendingCount  = requests.filter(r => r.status === 'pending').length

    if (loading) return (
        <div style={{ minHeight:'100vh', background:'#f1f5f9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#1e1b4b,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', animation:'spin 1s linear infinite', boxShadow:'0 4px 20px rgba(99,102,241,0.35)' }}>
                <RefreshCw size={24} color="white"/>
            </div>
            <p style={{ color:'#64748b', fontSize:'0.95rem' }}>Chargement de l'administration…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    const tc = TAB_CFG[tab]

    return (
        <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:'system-ui, sans-serif' }}>

            {/* ── Hero ── */}
            <div style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%)', padding:'2rem 2rem 5.5rem', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-50px', left:'30%', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                        <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.25)' }}>
                            <Activity size={24} color="white"/>
                        </div>
                        <div>
                            <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:900, color:'white', letterSpacing:'-0.02em' }}>Administration Facturation</h1>
                            <p style={{ margin:'0.25rem 0 0', color:'rgba(255,255,255,0.6)', fontSize:'0.85rem' }}>Gestion des crédits, forfaits et entreprises clientes.</p>
                        </div>
                    </div>
                    <button onClick={load} style={{ display:'flex', alignItems:'center', gap:'0.45rem', background:'rgba(255,255,255,0.13)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'0.6rem', padding:'0.55rem 1rem', color:'white', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>
                        <RefreshCw size={14} style={{ animation:spinning?'spin 1s linear infinite':'none' }}/> Actualiser
                    </button>
                </div>

                {/* KPI pills */}
                <div style={{ display:'flex', gap:'0.9rem', flexWrap:'wrap', marginTop:'1.75rem', position:'relative' }}>
                    <KpiPill icon={<Building2 size={12}/>} label="Entreprises"     value={companies.length} />
                    <KpiPill icon={<Euro size={12}/>}      label="Revenus totaux"  value={`${totalRevenue.toFixed(0)}€`} />
                    <KpiPill icon={<Shield size={12}/>}    label="En forfait"      value={forfaitCount} />
                    <KpiPill icon={<AlertTriangle size={12}/>} label="Crédits épuisés" value={emptyCount} />
                    {pendingCount > 0 && <KpiPill icon={<MessageSquare size={12}/>} label="Demandes en attente" value={pendingCount} />}
                </div>
            </div>

            {/* ── Floating content ── */}
            <div style={{ maxWidth:'1400px', margin:'-48px auto 0', padding:'0 2rem 3rem', position:'relative', zIndex:10 }}>

                {/* Toast */}
                {msg && (
                    <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:'0.85rem', padding:'0.75rem 1.1rem', marginBottom:'1rem', color:'#15803d', fontSize:'14px', fontWeight:500 }}>
                        {msg}
                    </div>
                )}

                {/* Tab bar */}
                <div style={{ background:'white', borderRadius:'1.15rem', boxShadow:'0 8px 32px rgba(0,0,0,0.1)', border:'1px solid #e2e8f0', padding:'0.5rem', marginBottom:'1.5rem', display:'flex', gap:'0.4rem', overflowX:'auto' }}>
                    {Object.entries(TAB_CFG).map(([key, cfg]) => {
                        const active = tab === key
                        const badge = key === 'requests' ? pendingCount : 0
                        return (
                            <button key={key} onClick={() => setTab(key)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'0.6rem 1rem', borderRadius:'0.8rem', border:'none', cursor:'pointer', fontWeight:active?700:500, fontSize:'0.83rem', background:active?cfg.grad:'transparent', color:active?'white':'#64748b', boxShadow:active?`0 4px 14px ${cfg.accent}44`:'none', transition:'all 0.2s', whiteSpace:'nowrap' }}>
                                {cfg.icon} {cfg.label}
                                {badge > 0 && <span style={{ background:'#ef4444', color:'white', borderRadius:'99px', fontSize:'10px', fontWeight:700, padding:'1px 6px' }}>{badge}</span>}
                            </button>
                        )
                    })}
                </div>

                {/* ══ TAB ENTREPRISES ══ */}
                {tab === 'companies' && (
                    <BlockCard grad={TAB_CFG.companies.grad} icon={<Building2 size={16} color="white"/>} title={`Entreprises (${filtered.length})`}>
                        {/* Barre recherche + filtres */}
                        <div style={{ display:'flex', gap:'10px', marginBottom:'1rem', flexWrap:'wrap' }}>
                            <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
                                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une entreprise..."
                                    style={{ ...inp, paddingLeft:'32px' }}/>
                            </div>
                            <div style={{ display:'flex', gap:'6px' }}>
                                {[{key:'all',label:'Tous'},{key:'credits',label:'Crédits'},{key:'forfait',label:'Forfait'},{key:'empty',label:'⚠️ Épuisés'}].map(f => (
                                    <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding:'7px 13px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:`1px solid ${filter===f.key?'#2563eb':'#e2e8f0'}`, background:filter===f.key?'linear-gradient(135deg,#1d4ed8,#3b82f6)':'white', color:filter===f.key?'white':'#475569', fontWeight:filter===f.key?700:500, transition:'all 0.15s' }}>{f.label}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ overflowX:'auto', borderRadius:'0.75rem', border:'1px solid #f1f5f9' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                                <thead>
                                    <tr style={{ background:'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom:'2px solid #e2e8f0' }}>
                                        {['Entreprise','Mode','Crédits','Utilisateurs','Dossiers','Revenu','Actions'].map(h => (
                                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((c, i) => {
                                        const isForfait = c.billing_mode === 'forfait'
                                        const balance   = parseFloat(c.credit_balance || 0)
                                        const isEmpty   = !isForfait && balance <= 0
                                        const hov       = hoveredRow === c.id
                                        return (
                                            <tr key={c.id}
                                                onMouseEnter={() => setHoveredRow(c.id)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                                style={{ borderBottom:'1px solid #f1f5f9', background: isEmpty ? '#fff5f5' : hov ? '#f0f9ff' : i%2===0?'white':'#fafcff', transition:'background 0.15s' }}>
                                                <td style={{ padding:'11px 12px' }}>
                                                    <div style={{ fontWeight:700, color: hov?'#1d4ed8':'#1e293b', transition:'color 0.15s' }}>{c.name}</div>
                                                    <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'1px' }}>{c.email}</div>
                                                </td>
                                                <td style={{ padding:'11px 12px' }}>
                                                    <span style={{ padding:'4px 10px', borderRadius:'99px', fontSize:'12px', fontWeight:700, background:isForfait?'#dcfce7':'#dbeafe', color:isForfait?'#15803d':'#1d4ed8', border:`1px solid ${isForfait?'#a7f3d0':'#bfdbfe'}` }}>
                                                        {isForfait ? `Forfait ${c.forfait_type||''}` : 'Crédits'}
                                                    </span>
                                                </td>
                                                <td style={{ padding:'11px 12px' }}>
                                                    {isForfait ? <span style={{ color:'#16a34a', fontWeight:800, fontSize:'16px' }}>∞</span>
                                                        : <span style={{ fontWeight:800, fontSize:'15px', color: isEmpty?'#dc2626': balance<=20?'#f97316': balance<=50?'#f59e0b':'#1e293b' }}>
                                                            {balance.toLocaleString()}
                                                        </span>}
                                                </td>
                                                <td style={{ padding:'11px 12px', color:'#475569' }}>
                                                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><Users size={12} color="#94a3b8"/>{c.user_count||0}</span>
                                                </td>
                                                <td style={{ padding:'11px 12px', color:'#475569' }}>
                                                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><FileText size={12} color="#94a3b8"/>{c.dossier_count||0}</span>
                                                </td>
                                                <td style={{ padding:'11px 12px', fontWeight:700, color:'#16a34a' }}>
                                                    {parseFloat(c.total_revenue_eur||0).toFixed(0)}€
                                                </td>
                                                <td style={{ padding:'11px 12px' }}>
                                                    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                                                        <button onClick={() => setCreditModal({ company:c, amount:100, reason:'' })} style={{ background:'#eff6ff', border:'none', borderRadius:'6px', padding:'5px 9px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', fontSize:'12px', color:'#2563eb', fontWeight:600 }}>
                                                            <CreditCard size={12}/> Crédits
                                                        </button>
                                                        <button onClick={() => setModeModal({ company:c, mode:c.billing_mode, forfait_type:c.forfait_type, expires_at:c.forfait_expires_at?c.forfait_expires_at.split('T')[0]:'' })} style={{ background:'#f1f5f9', border:'none', borderRadius:'6px', padding:'5px 9px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', fontSize:'12px', color:'#475569', fontWeight:600 }}>
                                                            <Edit2 size={12}/> Mode
                                                        </button>
                                                        <button onClick={() => handleToggleProvider(c)} style={{ background:c.is_provider?'#fef3c7':'#f1f5f9', border:'none', borderRadius:'6px', padding:'5px 9px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', fontSize:'12px', color:c.is_provider?'#d97706':'#475569', fontWeight:600 }}>
                                                            <ShieldCheck size={12}/> {c.is_provider?'Super Admin':'Promouvoir'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {!filtered.length && (
                                        <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>Aucune entreprise trouvée</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </BlockCard>
                )}

                {/* ══ TAB DEMANDES ══ */}
                {tab === 'requests' && (
                    <BlockCard grad={TAB_CFG.requests.grad} icon={<MessageSquare size={16} color="white"/>} title="Demandes de changement de mode"
                        action={
                            <div style={{ display:'flex', gap:'6px' }}>
                                {[{key:'pending',label:'⏳ En attente'},{key:'approved',label:'✅ Approuvées'},{key:'rejected',label:'❌ Refusées'}].map(f => (
                                    <button key={f.key} onClick={() => setRequestFilter(f.key)} style={{ padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'none', background:requestFilter===f.key?'rgba(255,255,255,0.9)':' rgba(255,255,255,0.2)', color:requestFilter===f.key?'#b45309':'white' }}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        }>
                        {requests.length === 0 ? (
                            <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
                                <MessageSquare size={32} style={{ marginBottom:'12px', opacity:0.3 }}/>
                                <div>Aucune demande {requestFilter === 'pending' ? 'en attente' : ''}</div>
                            </div>
                        ) : (
                            <div>
                                {requests.map(r => (
                                    <div key={r.id} style={{ padding:'1.1rem', borderBottom:'1px solid #f1f5f9', borderRadius:'0.75rem', marginBottom:'0.5rem', background:'#fafbff', border:'1px solid #f1f5f9' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' }}>
                                            <div style={{ flex:1 }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px' }}>
                                                    <span style={{ fontWeight:800, fontSize:'15px', color:'#1e293b' }}>{r.company_name}</span>
                                                    <span style={{ fontSize:'12px', color:'#94a3b8' }}>{r.company_email}</span>
                                                </div>
                                                <div style={{ fontSize:'13px', color:'#374151', marginBottom:'5px' }}>
                                                    <span style={{ textTransform:'capitalize' }}>{r.current_mode}</span> → <strong style={{ textTransform:'capitalize', color:'#1d4ed8' }}>{r.requested_mode}</strong>
                                                    {r.requested_forfait_type && <span style={{ color:'#6b7280' }}> ({r.requested_forfait_type})</span>}
                                                </div>
                                                {r.message && <div style={{ fontSize:'13px', color:'#6b7280', fontStyle:'italic', marginBottom:'5px', background:'#f8fafc', padding:'7px 10px', borderRadius:'6px' }}>"{r.message}"</div>}
                                                <div style={{ fontSize:'12px', color:'#94a3b8', display:'flex', alignItems:'center', gap:'4px' }}>
                                                    <Clock size={11}/>{new Date(r.created_at).toLocaleDateString('fr-FR')} — {r.requester_name} ({r.requester_email})
                                                </div>
                                                {r.admin_notes && <div style={{ fontSize:'12px', color:'#374151', marginTop:'5px' }}>Réponse : <em>{r.admin_notes}</em></div>}
                                            </div>
                                            <div style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end', flexShrink:0 }}>
                                                <RequestBadge status={r.status}/>
                                                {r.status === 'pending' && (
                                                    <div style={{ display:'flex', gap:'6px' }}>
                                                        <button onClick={() => setHandleModal({ request:r, action:'approve', notes:'', expires_at:'' })} style={{ background:'linear-gradient(135deg,#047857,#10b981)', color:'white', border:'none', borderRadius:'7px', padding:'6px 13px', cursor:'pointer', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', gap:'4px', boxShadow:'0 3px 10px rgba(5,150,105,0.3)' }}>
                                                            <CheckCircle size={13}/> Approuver
                                                        </button>
                                                        <button onClick={() => setHandleModal({ request:r, action:'reject', notes:'', expires_at:'' })} style={{ background:'linear-gradient(135deg,#b91c1c,#ef4444)', color:'white', border:'none', borderRadius:'7px', padding:'6px 13px', cursor:'pointer', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', gap:'4px', boxShadow:'0 3px 10px rgba(220,38,38,0.3)' }}>
                                                            <X size={13}/> Refuser
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </BlockCard>
                )}

                {/* ══ TAB PACKS ══ */}
                {tab === 'packs' && (
                    <BlockCard grad={TAB_CFG.packs.grad} icon={<CreditCard size={16} color="white"/>} title="Packs de crédits"
                        action={
                            <button onClick={() => setPackModal({ name:'', credits:'', price_eur:'', price_cfa:'', is_popular:0, is_active:1, sort_order:0 })} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'7px', padding:'6px 12px', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:700 }}>
                                <Plus size={14}/> Nouveau pack
                            </button>
                        }>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1rem' }}>
                            {packs.map(p => (
                                <div key={p.id} style={{ background:'white', borderRadius:'1rem', border:`1px solid ${p.is_popular?'#fde68a':'#e2e8f0'}`, boxShadow:`0 4px 16px rgba(0,0,0,${p.is_popular?'0.1':'0.05'})`, padding:'1.35rem', opacity:p.is_active?1:0.55, overflow:'hidden', position:'relative' }}>
                                    {p.is_popular && <div style={{ position:'absolute', top:0, right:0, background:'linear-gradient(135deg,#b45309,#f59e0b)', color:'white', fontSize:'11px', fontWeight:700, padding:'3px 12px', borderRadius:'0 1rem 0 0.5rem' }}>★ Populaire</div>}
                                    <div style={{ fontWeight:800, fontSize:'15px', color:'#1e293b', marginBottom:'8px' }}>{p.name}</div>
                                    <div style={{ fontSize:'2.2rem', fontWeight:900, color:'#059669', lineHeight:1, letterSpacing:'-0.03em' }}>{p.credits.toLocaleString()}</div>
                                    <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'12px' }}>crédits</div>
                                    <div style={{ fontSize:'16px', fontWeight:800, color:'#1e293b' }}>{p.price_eur}€ <span style={{ fontSize:'12px', fontWeight:500, color:'#94a3b8' }}>/ {Number(p.price_cfa).toLocaleString()} CFA</span></div>
                                    {!p.is_active && <div style={{ color:'#dc2626', fontSize:'12px', marginTop:'4px', fontWeight:600 }}>Désactivé</div>}
                                    <button onClick={() => setPackModal({...p})} style={{ marginTop:'14px', background:'#f1f5f9', border:'none', borderRadius:'7px', padding:'7px 14px', cursor:'pointer', fontSize:'13px', fontWeight:600, display:'flex', alignItems:'center', gap:'5px', color:'#475569' }}>
                                        <Edit2 size={13}/> Modifier
                                    </button>
                                </div>
                            ))}
                        </div>
                    </BlockCard>
                )}

                {/* ══ TAB TARIFS & FORFAITS ══ */}
                {tab === 'tarifs' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1.35rem' }}>
                        {tarifsLoading ? (
                            <div style={{ background:'white', borderRadius:'1rem', border:'1px solid #e2e8f0', padding:'4rem', textAlign:'center', color:'#94a3b8' }}>
                                <RefreshCw size={28} style={{ animation:'spin 1s linear infinite' }}/>
                            </div>
                        ) : (
                            <>
                                {/* Forfaits */}
                                <BlockCard grad="linear-gradient(135deg,#5b21b6,#8b5cf6)" icon={<Tag size={16} color="white"/>} title="Forfaits"
                                    action={<button onClick={() => setForfaitModal({ _new:true, type:'', label:'', description:'', price_eur:'', price_cfa:'', duration_months:'', is_active:1 })} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'7px', padding:'6px 12px', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:700 }}><Plus size={14}/> Nouveau forfait</button>}>
                                    {forfaitConfig.length === 0 ? (
                                        <div style={{ color:'#94a3b8', fontSize:'14px', padding:'1rem', textAlign:'center' }}>Aucune configuration de forfait (migration 029 non exécutée ?)</div>
                                    ) : (
                                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
                                            {forfaitConfig.map(f => (
                                                <div key={f.type} style={{ background:'#faf5ff', borderRadius:'0.85rem', border:'1px solid #ddd6fe', padding:'1.25rem' }}>
                                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                                                        <div>
                                                            <div style={{ fontWeight:800, fontSize:'15px', color:'#1e293b' }}>{f.label}</div>
                                                            {f.description && <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px' }}>{f.description}</div>}
                                                        </div>
                                                        <span style={{ padding:'3px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:700, background:f.type==='indefini'?'#f5f3ff':'#eff6ff', color:f.type==='indefini'?'#7c3aed':'#2563eb', border:`1px solid ${f.type==='indefini'?'#ddd6fe':'#bfdbfe'}` }}>
                                                            {f.type==='indefini'?'Lifetime':'Annuel'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize:'24px', fontWeight:900, color:'#1e293b', letterSpacing:'-0.02em' }}>{Number(f.price_cfa).toLocaleString()} <span style={{ fontSize:'13px', fontWeight:500, color:'#6b7280' }}>FCFA</span></div>
                                                    <div style={{ fontSize:'13px', color:'#6b7280', marginTop:'2px', marginBottom:'14px' }}>≈ {Number(f.price_eur).toLocaleString()} €</div>
                                                    <div style={{ display:'flex', gap:'8px' }}>
                                                        <button onClick={() => setForfaitModal({...f})} style={{ background:'white', border:'1px solid #ddd6fe', borderRadius:'7px', padding:'6px 13px', cursor:'pointer', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', gap:'5px', color:'#7c3aed' }}><Edit2 size={12}/> Modifier</button>
                                                        <button onClick={() => deleteForfait(f)} style={{ background:'#fee2e2', border:'none', borderRadius:'7px', padding:'6px 13px', cursor:'pointer', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', gap:'5px', color:'#dc2626' }}><Trash2 size={12}/> Supprimer</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </BlockCard>

                                {/* Règles de crédits */}
                                <BlockCard grad="linear-gradient(135deg,#1d4ed8,#3b82f6)" icon={<Coins size={16} color="white"/>} title="Règles de crédits"
                                    action={<button onClick={() => setRuleModal({ operation_type:'', operation_name:'', cost:1, is_active:1 })} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'7px', padding:'6px 12px', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:700 }}><Plus size={14}/> Nouvelle règle</button>}>
                                    <div style={{ overflowX:'auto', borderRadius:'0.75rem', border:'1px solid #f1f5f9' }}>
                                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                                            <thead>
                                                <tr style={{ background:'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom:'2px solid #e2e8f0' }}>
                                                    {['Clé technique','Nom affiché','Coût','Statut','Actions'].map(h => (
                                                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {creditRules.length === 0 && (
                                                    <tr><td colSpan={5} style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
                                                        <Settings size={24} style={{ display:'block', margin:'0 auto 8px', opacity:0.3 }}/>
                                                        Aucune règle de crédit
                                                    </td></tr>
                                                )}
                                                {creditRules.map((r, i) => (
                                                    <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'white':'#fafafa', opacity:r.is_active?1:0.45 }}>
                                                        <td style={{ padding:'10px 12px' }}>
                                                            <code style={{ background:'#f1f5f9', padding:'3px 8px', borderRadius:'5px', fontSize:'12px', color:'#374151', fontFamily:'monospace' }}>{r.operation_type}</code>
                                                        </td>
                                                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1e293b' }}>{r.operation_name}</td>
                                                        <td style={{ padding:'10px 12px' }}>
                                                            <span style={{ fontWeight:800, fontSize:'16px', color: r.cost<=2?'#16a34a':r.cost<=5?'#2563eb':'#dc2626' }}>{r.cost}</span>
                                                            <span style={{ fontSize:'11px', color:'#94a3b8', marginLeft:'3px' }}>cr.</span>
                                                        </td>
                                                        <td style={{ padding:'10px 12px' }}>
                                                            <span style={{ padding:'3px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:700, background:r.is_active?'#dcfce7':'#f3f4f6', color:r.is_active?'#15803d':'#9ca3af' }}>
                                                                {r.is_active?'Actif':'Inactif'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding:'10px 12px' }}>
                                                            <div style={{ display:'flex', gap:'6px' }}>
                                                                <button onClick={() => setRuleModal({...r})} style={{ background:'#eff6ff', border:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px', fontWeight:600, color:'#2563eb', display:'flex', alignItems:'center', gap:'4px' }}><Edit2 size={12}/> Modifier</button>
                                                                <button onClick={() => deleteRule(r)} style={{ background:'#fee2e2', border:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px', fontWeight:600, color:'#dc2626', display:'flex', alignItems:'center', gap:'4px' }}><Trash2 size={12}/> Supprimer</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </BlockCard>
                            </>
                        )}
                    </div>
                )}

                {/* ══ TAB SUPER ADMINS ══ */}
                {tab === 'superadmins' && (
                    <BlockCard grad={TAB_CFG.superadmins.grad} icon={<ShieldCheck size={16} color="white"/>} title="Super Administrateurs">
                        <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:'0.75rem', padding:'0.85rem 1rem', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'flex-start', fontSize:'13px', color:'#92400e' }}>
                            <AlertTriangle size={15} style={{ color:'#d97706', marginTop:'1px', flexShrink:0 }}/>
                            Seul un <strong>SUPER_ADMIN</strong> peut accorder ou révoquer ce rôle. Un SUPER_ADMIN a accès à toutes les fonctionnalités, y compris la gestion des crédits et forfaits de toutes les entreprises.
                        </div>
                        <div style={{ position:'relative', marginBottom:'1rem' }}>
                            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                            <input placeholder="Rechercher un administrateur..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} style={{ ...inp, paddingLeft:'32px' }}/>
                        </div>
                        <div style={{ overflowX:'auto', borderRadius:'0.75rem', border:'1px solid #f1f5f9' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                                <thead>
                                    <tr style={{ background:'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom:'2px solid #e2e8f0' }}>
                                        {['Nom','Email','Société','Rôle actuel','Action'].map(h => (
                                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.filter(a => !adminSearch || a.NomAgent?.toLowerCase().includes(adminSearch.toLowerCase()) || a.Email?.toLowerCase().includes(adminSearch.toLowerCase()) || a.company_name?.toLowerCase().includes(adminSearch.toLowerCase()))
                                        .map((a, i) => (
                                        <tr key={a.IDAgents} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'white':'#fafafa' }}>
                                            <td style={{ padding:'10px 12px', fontWeight:700, color:'#1e293b' }}>{a.NomAgent}</td>
                                            <td style={{ padding:'10px 12px', color:'#64748b', fontSize:'13px' }}>{a.Email}</td>
                                            <td style={{ padding:'10px 12px', color:'#64748b', fontSize:'13px' }}>{a.company_name}</td>
                                            <td style={{ padding:'10px 12px' }}>
                                                <span style={{ background:a.role==='SUPER_ADMIN'?'#f5f3ff':'#f0fdf4', color:a.role==='SUPER_ADMIN'?'#7c3aed':'#16a34a', padding:'3px 10px', borderRadius:'99px', fontSize:'12px', fontWeight:700, border:`1px solid ${a.role==='SUPER_ADMIN'?'#ddd6fe':'#a7f3d0'}` }}>
                                                    {a.role==='SUPER_ADMIN'?'★ SUPER_ADMIN':'ADMIN'}
                                                </span>
                                            </td>
                                            <td style={{ padding:'10px 12px' }}>
                                                {String(a.IDAgents) !== String(user?.id) ? (
                                                    <button onClick={() => handleToggleSuperAdmin(a)} style={{ background:a.role==='SUPER_ADMIN'?'#fef3c7':'#f5f3ff', border:'none', borderRadius:'7px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontWeight:700, color:a.role==='SUPER_ADMIN'?'#d97706':'#7c3aed', display:'flex', alignItems:'center', gap:'5px' }}>
                                                        <ShieldCheck size={13}/>{a.role==='SUPER_ADMIN'?'Révoquer':'Promouvoir'}
                                                    </button>
                                                ) : <span style={{ fontSize:'12px', color:'#94a3b8' }}>Vous-même</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {!admins.filter(a => !adminSearch || a.NomAgent?.toLowerCase().includes(adminSearch.toLowerCase()) || a.Email?.toLowerCase().includes(adminSearch.toLowerCase()) || a.company_name?.toLowerCase().includes(adminSearch.toLowerCase())).length && (
                                        <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#94a3b8' }}>Aucun administrateur trouvé</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </BlockCard>
                )}
            </div>

            {/* ══════ MODALS (logique inchangée, style amélioré) ══════ */}

            {creditModal && (
                <Modal title={`Ajuster les crédits — ${creditModal.company.name}`} onClose={() => setCreditModal(null)}>
                    <p style={{ color:'#64748b', fontSize:'14px', marginBottom:'16px' }}>Solde actuel : <strong style={{ color:'#1e293b' }}>{parseFloat(creditModal.company.credit_balance).toLocaleString()} crédits</strong></p>
                    <div style={{ display:'flex', gap:'6px', marginBottom:'1rem', flexWrap:'wrap' }}>
                        {[-100,-50,-10,50,100,500].map(v => (
                            <button key={v} onClick={() => setCreditModal(m => ({...m,amount:v}))} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${creditModal.amount===v?'#2563eb':'#e2e8f0'}`, background:creditModal.amount===v?'linear-gradient(135deg,#1d4ed8,#3b82f6)':'white', color:creditModal.amount===v?'white':v<0?'#dc2626':'#16a34a', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>
                                {v>0?`+${v}`:v}
                            </button>
                        ))}
                    </div>
                    <label style={lbl}>Montant personnalisé</label>
                    <input type="number" value={creditModal.amount} onChange={e => setCreditModal(m => ({...m,amount:+e.target.value}))} style={{ ...inp, marginBottom:'12px' }}/>
                    <label style={lbl}>Raison</label>
                    <input type="text" value={creditModal.reason} onChange={e => setCreditModal(m => ({...m,reason:e.target.value}))} placeholder="Ex: Remboursement, geste commercial..." style={{ ...inp, marginBottom:'16px' }}/>
                    <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={adjustCredits} disabled={saving} style={btnP({ flex:1, justifyContent:'center', padding:'10px' })}>{saving?'Enregistrement...':`Appliquer (${creditModal.amount>0?'+':''}${creditModal.amount} crédits)`}</button>
                        <button onClick={() => setCreditModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            {modeModal && (
                <Modal title={`Mode facturation — ${modeModal.company.name}`} onClose={() => setModeModal(null)}>
                    <div style={{ display:'flex', gap:'10px', marginBottom:'1rem' }}>
                        {['credits','forfait'].map(m => (
                            <button key={m} onClick={() => setModeModal(mm => ({...mm,mode:m}))} style={{ flex:1, padding:'12px', borderRadius:'10px', border:`2px solid ${modeModal.mode===m?'#2563eb':'#e2e8f0'}`, background:modeModal.mode===m?'#eff6ff':'white', fontWeight:700, cursor:'pointer', fontSize:'14px', color:modeModal.mode===m?'#1d4ed8':'#374151' }}>
                                {m==='credits'?<><CreditCard size={14} style={{ display:'inline', marginRight:4 }}/>Crédits</>:<><Shield size={14} style={{ display:'inline', marginRight:4 }}/>Forfait</>}
                            </button>
                        ))}
                    </div>
                    {modeModal.mode === 'forfait' && (
                        <>
                            <label style={lbl}>Type de forfait</label>
                            <select value={modeModal.forfait_type||''} onChange={e => setModeModal(m => ({...m,forfait_type:e.target.value}))} style={{ ...inp, marginBottom:'12px' }}>
                                <option value="">Choisir...</option>
                                <option value="annuel">Annuel</option>
                                <option value="indefini">Indéfini (Lifetime)</option>
                            </select>
                            {modeModal.forfait_type === 'annuel' && (
                                <>
                                    <label style={lbl}>Date d'expiration</label>
                                    <input type="date" value={modeModal.expires_at||''} onChange={e => setModeModal(m => ({...m,expires_at:e.target.value}))} style={{ ...inp, marginBottom:'12px' }}/>
                                </>
                            )}
                        </>
                    )}
                    <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                        <button onClick={setMode} disabled={saving} style={btnP({ flex:1, justifyContent:'center', padding:'10px' })}>{saving?'Enregistrement...':'Appliquer'}</button>
                        <button onClick={() => setModeModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            {packModal && (
                <Modal title={packModal.id?'Modifier le pack':'Nouveau pack'} onClose={() => setPackModal(null)}>
                    {[{key:'name',label:'Nom du pack',type:'text'},{key:'credits',label:'Nombre de crédits',type:'number'},{key:'price_eur',label:'Prix (EUR)',type:'number'},{key:'price_cfa',label:'Prix (CFA)',type:'number'},{key:'sort_order',label:"Ordre d'affichage",type:'number'}].map(f => (
                        <div key={f.key} style={{ marginBottom:'12px' }}>
                            <label style={lbl}>{f.label}</label>
                            <input type={f.type} value={packModal[f.key]||''} onChange={e => setPackModal(m => ({...m,[f.key]:e.target.value}))} style={inp}/>
                        </div>
                    ))}
                    <div style={{ display:'flex', gap:'16px', marginBottom:'16px' }}>
                        {[{key:'is_popular',label:'Populaire'},{key:'is_active',label:'Actif'}].map(cb => (
                            <label key={cb.key} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px' }}>
                                <input type="checkbox" checked={!!packModal[cb.key]} onChange={e => setPackModal(m => ({...m,[cb.key]:e.target.checked?1:0}))}/> {cb.label}
                            </label>
                        ))}
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={savePack} disabled={saving} style={btnP({ flex:1, justifyContent:'center', padding:'10px' })}>{saving?'Enregistrement...':(packModal.id?'Modifier':'Créer')}</button>
                        <button onClick={() => setPackModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            {ruleModal && (
                <Modal title={ruleModal.id?'Modifier la règle':'Nouvelle règle de crédit'} onClose={() => setRuleModal(null)}>
                    <div style={{ marginBottom:'12px' }}>
                        <label style={lbl}>Clé technique (operation_type)</label>
                        <input type="text" value={ruleModal.operation_type||''} onChange={e => setRuleModal(m => ({...m,operation_type:e.target.value.toLowerCase().replace(/\s+/g,'_')}))} placeholder="ex: note_detail, facture_create..." disabled={!!ruleModal.id} style={{ ...inp, background:ruleModal.id?'#f9fafb':'white', color:ruleModal.id?'#9ca3af':'#111827', fontFamily:'monospace' }}/>
                        {ruleModal.id && <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'3px' }}>La clé ne peut pas être modifiée après création.</div>}
                    </div>
                    <div style={{ marginBottom:'12px' }}>
                        <label style={lbl}>Nom affiché</label>
                        <input type="text" value={ruleModal.operation_name||''} onChange={e => setRuleModal(m => ({...m,operation_name:e.target.value}))} placeholder="ex: Note de détail" style={inp}/>
                    </div>
                    <div style={{ marginBottom:'16px' }}>
                        <label style={lbl}>Coût en crédits</label>
                        <div style={{ display:'flex', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
                            {[1,2,3,5,6,10,15,20].map(v => (
                                <button key={v} onClick={() => setRuleModal(m => ({...m,cost:v}))} style={{ padding:'6px 12px', borderRadius:'7px', border:`1px solid ${ruleModal.cost==v?'#2563eb':'#e2e8f0'}`, background:ruleModal.cost==v?'linear-gradient(135deg,#1d4ed8,#3b82f6)':'white', color:ruleModal.cost==v?'white':'#374151', fontWeight:ruleModal.cost==v?700:400, cursor:'pointer', fontSize:'13px' }}>{v}</button>
                            ))}
                        </div>
                        <input type="number" min="0" step="0.5" value={ruleModal.cost||''} onChange={e => setRuleModal(m => ({...m,cost:e.target.value}))} style={inp}/>
                    </div>
                    <div style={{ marginBottom:'16px' }}>
                        <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px' }}>
                            <input type="checkbox" checked={!!ruleModal.is_active} onChange={e => setRuleModal(m => ({...m,is_active:e.target.checked?1:0}))}/> Règle active
                        </label>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={saveRule} disabled={saving||!ruleModal.operation_type||!ruleModal.operation_name} style={btnP({ flex:1, justifyContent:'center', padding:'10px' })}>{saving?'Enregistrement...':(ruleModal.id?'Modifier':'Créer')}</button>
                        <button onClick={() => setRuleModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            {forfaitModal && (
                <Modal title={forfaitModal._new?'Nouveau forfait':`Modifier — ${forfaitModal.label}`} onClose={() => setForfaitModal(null)}>
                    {forfaitModal._new ? (
                        <div style={{ marginBottom:'12px' }}>
                            <label style={lbl}>Clé technique (type)</label>
                            <input type="text" value={forfaitModal.type||''} onChange={e => setForfaitModal(m => ({...m,type:e.target.value.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}))} placeholder="ex: trimestriel, semestriel..." style={{ ...inp, fontFamily:'monospace' }}/>
                            <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'3px' }}>Identifiant unique, ne peut pas être modifié après création.</div>
                        </div>
                    ) : (
                        <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'10px 14px', marginBottom:'1rem', fontSize:'13px', color:'#64748b' }}>
                            <span style={{ fontWeight:600, color:'#374151' }}>Type :</span>{' '}
                            <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px' }}>{forfaitModal.type}</code>
                        </div>
                    )}
                    <div style={{ marginBottom:'12px' }}>
                        <label style={lbl}>Libellé</label>
                        <input type="text" value={forfaitModal.label||''} onChange={e => setForfaitModal(m => ({...m,label:e.target.value}))} placeholder="ex: Forfait Trimestriel" style={inp}/>
                    </div>
                    <div style={{ marginBottom:'12px' }}>
                        <label style={lbl}>Description</label>
                        <input type="text" value={forfaitModal.description||''} onChange={e => setForfaitModal(m => ({...m,description:e.target.value}))} placeholder="Courte description affichée au client" style={inp}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                        <div>
                            <label style={lbl}>Prix en € (EUR)</label>
                            <input type="number" min="0" step="1" value={forfaitModal.price_eur||''} onChange={e => setForfaitModal(m => ({...m,price_eur:e.target.value,price_cfa:Math.round(e.target.value*655.957)}))} style={inp}/>
                        </div>
                        <div>
                            <label style={lbl}>Prix en FCFA</label>
                            <input type="number" min="0" step="1000" value={forfaitModal.price_cfa||''} onChange={e => setForfaitModal(m => ({...m,price_cfa:e.target.value,price_eur:Math.round(e.target.value/655.957)}))} style={inp}/>
                        </div>
                    </div>
                    <div style={{ marginBottom:'16px' }}>
                        <label style={lbl}>Durée (mois) — laisser vide pour illimité</label>
                        <input type="number" min="1" step="1" value={forfaitModal.duration_months||''} onChange={e => setForfaitModal(m => ({...m,duration_months:e.target.value}))} placeholder="ex: 3, 6, 12 — vide = illimité" style={inp}/>
                    </div>
                    <div style={{ marginBottom:'16px' }}>
                        <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px' }}>
                            <input type="checkbox" checked={!!forfaitModal.is_active} onChange={e => setForfaitModal(m => ({...m,is_active:e.target.checked?1:0}))}/> Forfait actif (visible pour les clients)
                        </label>
                    </div>
                    {(forfaitModal.price_cfa || forfaitModal.price_eur) && (
                        <div style={{ background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', color:'#15803d' }}>
                            <strong>Aperçu :</strong> {Number(forfaitModal.price_cfa||0).toLocaleString()} FCFA / {Number(forfaitModal.price_eur||0).toLocaleString()} €
                            {forfaitModal.duration_months ? ` — ${forfaitModal.duration_months} mois` : ' — Illimité'}
                        </div>
                    )}
                    <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={saveForfait} disabled={saving||!forfaitModal.label||!forfaitModal.price_eur||!forfaitModal.price_cfa||(forfaitModal._new&&!forfaitModal.type)} style={btnP({ flex:1, justifyContent:'center', padding:'10px' })}>
                            {saving?'Enregistrement...':(forfaitModal._new?'Créer le forfait':'Sauvegarder')}
                        </button>
                        <button onClick={() => setForfaitModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            {handleModal && (
                <Modal title={handleModal.action==='approve'?'✅ Approuver la demande':'❌ Refuser la demande'} onClose={() => setHandleModal(null)}>
                    <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'12px 16px', marginBottom:'1.25rem', fontSize:'13px' }}>
                        <div style={{ color:'#374151', fontWeight:700, marginBottom:'4px' }}>{handleModal.request.company_name}</div>
                        <div style={{ color:'#64748b' }}>
                            {handleModal.request.current_mode} → <strong>{handleModal.request.requested_mode}</strong>
                            {handleModal.request.requested_forfait_type && ` (${handleModal.request.requested_forfait_type})`}
                        </div>
                        {handleModal.request.message && <div style={{ color:'#64748b', fontStyle:'italic', marginTop:'6px' }}>"{handleModal.request.message}"</div>}
                    </div>
                    {handleModal.action === 'approve' && handleModal.request.requested_mode === 'forfait' && handleModal.request.requested_forfait_type === 'annuel' && (
                        <div style={{ marginBottom:'1.25rem' }}>
                            <label style={lbl}><Calendar size={13} style={{ display:'inline', marginRight:4 }}/>Date d'expiration du forfait</label>
                            <input type="date" value={handleModal.expires_at||''} onChange={e => setHandleModal(m => ({...m,expires_at:e.target.value}))} style={inp}/>
                            <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px' }}>Si vide : +12 mois automatiquement</div>
                        </div>
                    )}
                    <div style={{ marginBottom:'1.5rem' }}>
                        <label style={lbl}>Message au client (optionnel)</label>
                        <textarea value={handleModal.notes} onChange={e => setHandleModal(m => ({...m,notes:e.target.value}))} placeholder={handleModal.action==='approve'?'Ex: Votre forfait est actif, merci de votre confiance.':'Ex: Merci de nous contacter pour finaliser le paiement.'} rows={3} style={{ ...inp, resize:'vertical' }}/>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={handleRequest} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:800, fontSize:'14px', background:handleModal.action==='approve'?'linear-gradient(135deg,#047857,#10b981)':'linear-gradient(135deg,#b91c1c,#ef4444)', color:'white', boxShadow:handleModal.action==='approve'?'0 4px 14px rgba(5,150,105,0.3)':'0 4px 14px rgba(220,38,38,0.3)' }}>
                            {saving?'Traitement...':(handleModal.action==='approve'?'✅ Confirmer l\'approbation':'❌ Confirmer le refus')}
                        </button>
                        <button onClick={() => setHandleModal(null)} style={btnS()}>Annuler</button>
                    </div>
                </Modal>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}
