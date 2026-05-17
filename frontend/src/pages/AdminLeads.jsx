import { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, RefreshCw, Mail, Phone, Building2, Globe2,
    MessageSquare, Calendar, Filter, X, Save, ExternalLink
} from 'lucide-react';
import { leadsAPI } from '../services/api';

const STATUS_CFG = {
    new:            { label: 'Nouveau',         bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
    contacted:      { label: 'Contacté',        bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    demo_scheduled: { label: 'Démo planifiée',  bg: '#ede9fe', color: '#5b21b6', dot: '#7c3aed' },
    converted:      { label: 'Converti ✓',      bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
    lost:           { label: 'Perdu',           bg: '#fee2e2', color: '#991b1b', dot: '#dc2626' },
};

const STATUS_ORDER = ['new', 'contacted', 'demo_scheduled', 'converted', 'lost'];

export default function AdminLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedLead, setSelectedLead] = useState(null);
    const [savingLead, setSavingLead] = useState(false);

    const loadLeads = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await leadsAPI.list();
            setLeads(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur de chargement des leads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLeads(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return leads.filter(l => {
            if (statusFilter !== 'all' && l.status !== statusFilter) return false;
            if (!q) return true;
            return (
                (l.full_name || '').toLowerCase().includes(q) ||
                (l.email || '').toLowerCase().includes(q) ||
                (l.company || '').toLowerCase().includes(q) ||
                (l.whatsapp || '').toLowerCase().includes(q) ||
                (l.country || '').toLowerCase().includes(q)
            );
        });
    }, [leads, search, statusFilter]);

    const kpis = useMemo(() => {
        const total = leads.length;
        const byStatus = STATUS_ORDER.reduce((acc, s) => {
            acc[s] = leads.filter(l => l.status === s).length;
            return acc;
        }, {});
        const last7d = leads.filter(l => {
            const d = new Date(l.created_at);
            return Date.now() - d.getTime() < 7 * 24 * 3600 * 1000;
        }).length;
        const conversionRate = total > 0
            ? Math.round((byStatus.converted / total) * 100)
            : 0;
        return { total, byStatus, last7d, conversionRate };
    }, [leads]);

    const handleSaveLead = async (lead, updates) => {
        setSavingLead(true);
        try {
            await leadsAPI.update(lead.id, updates);
            setLeads(leads.map(l => l.id === lead.id ? { ...l, ...updates } : l));
            if (selectedLead?.id === lead.id) {
                setSelectedLead({ ...selectedLead, ...updates });
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Erreur de sauvegarde');
        } finally {
            setSavingLead(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Users size={28} /> Leads / Prospects
                        </h1>
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                            Demandes de démo reçues via softtransit.net/demo
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <KpiPill value={kpis.total} label="Total" />
                        <KpiPill value={kpis.last7d} label="7 derniers jours" />
                        <KpiPill value={kpis.byStatus.new || 0} label="Nouveaux" />
                        <KpiPill value={`${kpis.conversionRate}%`} label="Conversion" />
                    </div>
                </div>
            </div>

            {/* Filters bar */}
            <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Rechercher nom, email, entreprise..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="all">Tous les statuts</option>
                    {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>
                            {STATUS_CFG[s].label} ({kpis.byStatus[s] || 0})
                        </option>
                    ))}
                </select>

                <button
                    onClick={loadLeads}
                    disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    {loading ? 'Chargement...' : 'Rafraîchir'}
                </button>

                <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                    {filtered.length} / {leads.length} affichés
                </div>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #fecaca', fontSize: 14 }}>
                    {error}
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Chargement des leads...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                        <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <div style={{ fontSize: 14 }}>Aucun lead {search || statusFilter !== 'all' ? 'ne correspond aux filtres' : 'pour le moment'}</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <Th>Prospect</Th>
                                    <Th>Entreprise</Th>
                                    <Th>Contact</Th>
                                    <Th>Pays · Volume</Th>
                                    <Th>Reçu</Th>
                                    <Th>Statut</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(lead => (
                                    <LeadRow
                                        key={lead.id}
                                        lead={lead}
                                        onSelect={() => setSelectedLead(lead)}
                                        onQuickStatus={(status) => handleSaveLead(lead, { status })}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail drawer */}
            {selectedLead && (
                <LeadDetailDrawer
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onSave={(updates) => handleSaveLead(selectedLead, updates)}
                    saving={savingLead}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

function KpiPill({ value, label }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '10px 16px', minWidth: 100 }}>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{label}</div>
        </div>
    );
}

function Th({ children }) {
    return (
        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {children}
        </th>
    );
}

function Td({ children, style = {} }) {
    return <td style={{ padding: '12px 16px', verticalAlign: 'top', ...style }}>{children}</td>;
}

function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.new;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cfg.bg, color: cfg.color, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            {cfg.label}
        </span>
    );
}

function LeadRow({ lead, onSelect, onQuickStatus }) {
    const date = new Date(lead.created_at);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const cleanPhone = (lead.whatsapp || '').replace(/[^0-9]/g, '');

    return (
        <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
            <Td>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{lead.full_name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>#{lead.id}</div>
            </Td>
            <Td>
                <div style={{ color: '#475569' }}>{lead.company || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
            </Td>
            <Td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <a href={`mailto:${lead.email}`} style={{ color: '#7c3aed', textDecoration: 'none', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} /> {lead.email}
                    </a>
                    {cleanPhone && (
                        <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> {lead.whatsapp}
                        </a>
                    )}
                </div>
            </Td>
            <Td>
                <div style={{ fontSize: 12, color: '#475569' }}>{lead.country || '—'}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.monthly_volume || '—'}</div>
            </Td>
            <Td>
                <div style={{ fontSize: 12, color: '#475569' }}>{dateStr}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeStr}</div>
            </Td>
            <Td>
                <select
                    value={lead.status}
                    onChange={e => onQuickStatus(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: 'white', cursor: 'pointer' }}
                >
                    {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                    ))}
                </select>
            </Td>
            <Td>
                <button
                    onClick={onSelect}
                    style={{ padding: '6px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                    Détails
                </button>
            </Td>
        </tr>
    );
}

function LeadDetailDrawer({ lead, onClose, onSave, saving }) {
    const [notes, setNotes] = useState(lead.notes || '');
    const [status, setStatus] = useState(lead.status);

    useEffect(() => {
        setNotes(lead.notes || '');
        setStatus(lead.status);
    }, [lead.id]);

    const cleanPhone = (lead.whatsapp || '').replace(/[^0-9]/g, '');
    const dirty = notes !== (lead.notes || '') || status !== lead.status;

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ width: 'min(520px, 100vw)', height: '100vh', background: 'white', overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.2)' }}
            >
                {/* Drawer header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{lead.full_name}</h2>
                            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                                Lead #{lead.id} · reçu le {new Date(lead.created_at).toLocaleString('fr-FR')}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        ><X size={18} /></button>
                    </div>
                </div>

                <div style={{ padding: 24 }}>
                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        {cleanPhone && (
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer"
                                style={{ flex: '1 1 140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#16a34a', color: 'white', textDecoration: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                                <Phone size={14} /> WhatsApp
                            </a>
                        )}
                        <a href={`mailto:${lead.email}`}
                            style={{ flex: '1 1 140px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#7c3aed', color: 'white', textDecoration: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                            <Mail size={14} /> Email
                        </a>
                    </div>

                    {/* Info grid */}
                    <Section title="Informations">
                        <InfoRow icon={<Building2 size={14} />} label="Entreprise" value={lead.company || '—'} />
                        <InfoRow icon={<Mail size={14} />} label="Email" value={<a href={`mailto:${lead.email}`} style={{ color: '#7c3aed' }}>{lead.email}</a>} />
                        <InfoRow icon={<Phone size={14} />} label="WhatsApp" value={lead.whatsapp || '—'} />
                        <InfoRow icon={<Globe2 size={14} />} label="Pays" value={lead.country || '—'} />
                        <InfoRow icon={<Users size={14} />} label="Volume mensuel" value={lead.monthly_volume || '—'} />
                        <InfoRow icon={<Calendar size={14} />} label="Reçu le" value={new Date(lead.created_at).toLocaleString('fr-FR')} />
                    </Section>

                    {lead.message && (
                        <Section title="Message du prospect">
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, fontSize: 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {lead.message}
                            </div>
                        </Section>
                    )}

                    {/* Status */}
                    <Section title="Statut du lead">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                            {STATUS_ORDER.map(s => {
                                const cfg = STATUS_CFG[s];
                                const active = status === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: 8,
                                            border: active ? `2px solid ${cfg.dot}` : '1px solid #e2e8f0',
                                            background: active ? cfg.bg : 'white',
                                            color: active ? cfg.color : '#475569',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Notes commerciales */}
                    <Section title="Notes commerciales">
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={6}
                            placeholder="Compte rendu d'appel, prochaines étapes, besoins spécifiques..."
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </Section>

                    {/* Save button */}
                    <div style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 16, marginTop: 24, borderTop: '1px solid #f1f5f9' }}>
                        <button
                            onClick={() => onSave({ notes, status })}
                            disabled={!dirty || saving}
                            style={{
                                width: '100%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '12px',
                                background: !dirty || saving ? '#cbd5e1' : 'linear-gradient(135deg, #5b21b6, #7c3aed)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: !dirty || saving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={16} />
                            {saving ? 'Sauvegarde...' : dirty ? 'Sauvegarder les modifications' : 'Aucune modification'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                {title}
            </h3>
            {children}
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 13 }}>
            <div style={{ color: '#94a3b8', display: 'flex' }}>{icon}</div>
            <div style={{ color: '#94a3b8', minWidth: 120 }}>{label}</div>
            <div style={{ color: '#0f172a', fontWeight: 500, flex: 1 }}>{value}</div>
        </div>
    );
}
