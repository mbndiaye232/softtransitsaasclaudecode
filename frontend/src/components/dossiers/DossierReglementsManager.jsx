import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { facturesAPI, reglementsAPI, dossiersAPI } from '../../services/api';

export default function DossierReglementsManager({ dossierId }) {
    const [factures, setFactures] = useState([]);
    const [reglements, setReglements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const dosRes = await dossiersAPI.getOne(dossierId);
            const dossier = dosRes.data;
            const clientId = dossier?.IDCLIENTS || dossier?.clientId;

            const [factRes, reglRes] = await Promise.all([
                facturesAPI.getByDossier(dossierId),
                clientId ? reglementsAPI.getClientHistory(clientId) : Promise.resolve({ data: [] }),
            ]);

            const factureIds = new Set((factRes.data || []).map(f => f.IDFactures));
            setFactures(factRes.data || []);
            setReglements((reglRes.data || []).filter(r => factureIds.has(r.IDFactures)));
        } catch (e) {
            setError('Erreur lors du chargement des règlements.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [dossierId]);

    const totalFacture = factures.reduce((s, f) => s + Number(f.MontantTTCFacture || 0), 0);
    const totalRegle   = factures.reduce((s, f) => s + Number(f.MontantRegleFacture || 0), 0);
    const reliquat     = totalFacture - totalRegle;

    const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

    const statusColor = reliquat <= 0 ? '#16a34a' : reliquat < totalFacture ? '#d97706' : '#dc2626';
    const statusLabel = reliquat <= 0 ? 'Soldé' : reliquat < totalFacture ? 'Partiel' : 'Impayé';
    const StatusIcon  = reliquat <= 0 ? CheckCircle : reliquat < totalFacture ? Clock : AlertCircle;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#b45309' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error) return (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: 20, color: '#be123c', fontWeight: 600 }}>
            {error}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Récapitulatif */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                    { label: 'Total facturé', value: fmt(totalFacture), color: '#1e40af', bg: '#dbeafe' },
                    { label: 'Total réglé',   value: fmt(totalRegle),   color: '#16a34a', bg: '#dcfce7' },
                    { label: 'Reliquat',      value: fmt(reliquat),     color: statusColor, bg: reliquat <= 0 ? '#dcfce7' : '#fef9c3' },
                ].map(c => (
                    <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Factures du dossier */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={15} color="#b45309" />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Factures du dossier</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: statusColor, background: reliquat <= 0 ? '#dcfce7' : '#fef3c7', padding: '2px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StatusIcon size={12} /> {statusLabel}
                    </span>
                    <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><RefreshCw size={14} /></button>
                </div>
                {factures.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucune facture émise pour ce dossier</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['N° Facture', 'Type', 'Montant TTC', 'Réglé', 'Reliquat', 'Statut'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {factures.map(f => {
                                const rel = Number(f.ReliquatFacture || 0);
                                const ttc = Number(f.MontantTTCFacture || 0);
                                const regle = Number(f.MontantRegleFacture || 0);
                                const sc = rel <= 0 ? '#16a34a' : regle > 0 ? '#d97706' : '#dc2626';
                                const sl = rel <= 0 ? 'Soldé' : regle > 0 ? 'Partiel' : 'Impayé';
                                return (
                                    <tr key={f.IDFactures} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{f.NumeroFacture}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{f.TypeFacture || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{fmt(ttc)}</td>
                                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>{fmt(regle)}</td>
                                        <td style={{ padding: '12px 16px', color: sc, fontWeight: 700 }}>{fmt(rel)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: rel <= 0 ? '#dcfce7' : regle > 0 ? '#fef3c7' : '#fee2e2', padding: '2px 10px', borderRadius: 99 }}>{sl}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Historique des règlements */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Historique des règlements</span>
                </div>
                {reglements.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucun règlement enregistré</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Date', 'N° Facture', 'Montant', 'Mode', 'Observations'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reglements.map(r => (
                                <tr key={r.IDReglements} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.Datereglement ? new Date(r.Datereglement).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{r.NumeroFacture || '—'}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{fmt(r.MontantReglement)}</td>
                                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.modeLibelle || '—'}</td>
                                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{r.Observations || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
