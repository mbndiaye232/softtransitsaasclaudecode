import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsAPI } from '../services/api';
import WhatsAppButton from '../components/WhatsAppButton';
import {
    Calculator, Clock, FileCheck, Layers, ShieldCheck, Zap,
    CheckCircle2, AlertTriangle, Mail, Phone, Globe2, ArrowRight
} from 'lucide-react';

// Bleu de la marque SST (logo Soft Services Technologies)
const PURPLE = '#1d4ed8';        // bleu principal
const PURPLE_DARK = '#1e3a8a';   // bleu marine
const PURPLE_LIGHT = '#eff6ff';  // bleu très clair (fonds)

const COUNTRIES = [
    'Sénégal', 'Mali', 'Côte d\'Ivoire', 'Burkina Faso', 'Bénin', 'Togo',
    'Niger', 'Guinée-Bissau', 'Mauritanie',
    'Cameroun', 'Congo', 'Gabon', 'RCA', 'Tchad', 'Guinée équatoriale',
    'Autre'
];

const VOLUMES = [
    '< 20 dossiers / mois',
    '20 à 100 dossiers / mois',
    '100 à 500 dossiers / mois',
    '500+ dossiers / mois'
];

const FEATURES = [
    {
        icon: <Clock size={28} />,
        title: '3 minutes par note',
        text: 'Saisissez la matrice, lancez la liquidation. Toutes les taxes apparaissent calculées au franc près.'
    },
    {
        icon: <Calculator size={28} />,
        title: 'UEMOA · CEDEAO · COSEC',
        text: 'DD, RS, TVA, COSEC, UEMOA, CEDEAO, PROMAD. Tous les régimes et tous les barèmes intégrés.'
    },
    {
        icon: <FileCheck size={28} />,
        title: 'Facturation auto-remplie',
        text: 'Récupérez la somme des taxes de toutes les notes validées en un clic. Plus jamais de re-saisie.'
    },
    {
        icon: <Layers size={28} />,
        title: 'Multi-agents · Multi-rôles',
        text: 'SUPER_ADMIN, ADMIN, AGENT. Permissions fines par module. Chaque action est tracée.'
    },
    {
        icon: <ShieldCheck size={28} />,
        title: 'Vos données en sécurité',
        text: 'Hébergement Aiven (ISO 27001), sauvegardes automatiques, audit complet, accès JWT.'
    },
    {
        icon: <Zap size={28} />,
        title: 'PDF officiels',
        text: 'Notes de détail et factures générées en PDF prêtes à imprimer ou envoyer par email.'
    },
];

const PAINS = [
    '« Je perds 2 heures par dossier sur Excel »',
    '« Une erreur de COSEC et tout est à refaire »',
    '« Mes agents n\'arrivent pas à se coordonner »',
];

const FAQ = [
    {
        q: 'Combien ça coûte ?',
        a: 'Nous contacter pour obtenir un devis personnalisé adapté à votre volume et à vos besoins.'
    },
    {
        q: 'Mes données sont-elles sécurisées ?',
        a: 'Oui. Base hébergée chez Aiven (certifié ISO 27001), sauvegardes automatiques quotidiennes, accès par token JWT, audit complet de toutes les actions par agent.'
    },
    {
        q: 'Combien d\'agents puis-je avoir ?',
        a: 'Illimité. Vous créez les agents et leur attribuez des rôles et permissions par module (notes, dossiers, facturation, paramètres...).'
    },
    {
        q: 'Comment se passe la formation ?',
        a: 'En présentiel ou en ligne pour 30 heures, suivie d\'une assistance gratuite en ligne pendant 2 mois.'
    },
    {
        q: 'Quels pays sont supportés ?',
        a: 'CEDEAO, CEMAC, RDC et Mauritanie sont pris en charge nativement. Pour tout autre pays : il suffit de nous fournir le TEC (Tarif Extérieur Commun) et nous l\'intégrons.'
    },
];

export default function Demo() {
    const [form, setForm] = useState({
        full_name: '', company: '', email: '', whatsapp: '',
        country: 'Sénégal', monthly_volume: VOLUMES[1], message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await leadsAPI.create(form);
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', background: 'white' }}>
            {/* Top bar */}
            <header style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: PURPLE_DARK, letterSpacing: '-0.02em' }}>
                    Soft Transit
                </div>
                <Link to="/login" style={{ color: PURPLE, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    Connexion →
                </Link>
            </header>

            {/* Hero */}
            <section style={{ padding: '64px 24px 48px', background: `linear-gradient(180deg, ${PURPLE_LIGHT} 0%, white 100%)`, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
                    🎁 5 % de réduction pour les 10 premières inscriptions
                </div>
                <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
                    Liquidez vos notes de détail<br />
                    <span style={{ color: PURPLE }}>en 3 minutes.</span>
                </h1>
                <p style={{ fontSize: 18, color: '#475569', maxWidth: 640, margin: '0 auto 32px' }}>
                    Sans calculatrice. Sans Excel. Sans erreur. Conçu pour les transitaires d'Afrique de l'Ouest, CEMAC et de tout autre pays.
                </p>
                <a href="#form" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PURPLE, color: 'white', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: `0 10px 30px ${PURPLE}40` }}>
                    📅 Réserver une démo gratuite (30 min) <ArrowRight size={18} />
                </a>
                <div style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>
                    Sans carte bancaire · Réponse sous 24h
                </div>
            </section>

            {/* Pain points */}
            <section style={{ padding: '48px 24px', background: '#fef2f2' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', margin: '0 0 32px', color: '#991b1b' }}>
                        <AlertTriangle size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Vous reconnaissez l'un de ces problèmes ?
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        {PAINS.map((p, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid #dc2626`, fontSize: 15, color: '#475569', fontStyle: 'italic' }}>
                                {p}
                            </div>
                        ))}
                    </div>
                    <p style={{ textAlign: 'center', marginTop: 32, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                        Soft Transit fait tout. Pour vous. Mieux.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '64px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em' }}>
                        Tout ce dont un transitaire moderne a besoin.
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: 16, padding: '24px', border: `1px solid #f1f5f9`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ background: PURPLE_LIGHT, color: PURPLE, width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    {f.icon}
                                </div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Form */}
            <section id="form" style={{ padding: '64px 24px', background: PURPLE_LIGHT }}>
                <div style={{ maxWidth: 560, margin: '0 auto' }}>
                    {success ? (
                        <div style={{ background: 'white', borderRadius: 16, padding: '48px 32px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
                            <CheckCircle2 size={56} color="#16a34a" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Demande reçue !</h2>
                            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                                Merci <strong>{form.full_name}</strong>. Notre équipe vous contacte dans les <strong>24 heures</strong> sur WhatsApp pour planifier votre démo gratuite.
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 24 }}>
                                Un email de confirmation a été envoyé à <strong>{form.email}</strong>.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
                            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', textAlign: 'center' }}>Réservez votre démo</h2>
                            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', margin: '0 0 28px' }}>
                                30 minutes en français ou wolof. Gratuit.
                            </p>

                            <Field label="Nom complet *" required value={form.full_name} onChange={handleChange('full_name')} />
                            <Field label="Entreprise" value={form.company} onChange={handleChange('company')} placeholder="Ex : Sénégalaise de Transit SARL" />
                            <Field label="Email *" type="email" required value={form.email} onChange={handleChange('email')} />
                            <Field label="WhatsApp *" required value={form.whatsapp} onChange={handleChange('whatsapp')} placeholder="+221 77 123 45 67" />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <SelectField label="Pays" value={form.country} onChange={handleChange('country')} options={COUNTRIES} />
                                <SelectField label="Volume mensuel" value={form.monthly_volume} onChange={handleChange('monthly_volume')} options={VOLUMES} />
                            </div>

                            <Field label="Message (optionnel)" textarea value={form.message} onChange={handleChange('message')} placeholder="Vos besoins spécifiques, questions..." />

                            {error && (
                                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fecaca' }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{ width: '100%', background: submitting ? '#a78bfa' : PURPLE, color: 'white', padding: '14px', borderRadius: 12, border: 'none', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: `0 10px 30px ${PURPLE}30` }}
                            >
                                {submitting ? 'Envoi en cours...' : 'Réserver ma démo gratuite'}
                            </button>

                            <div style={{ marginTop: 18, fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                                ✓ Pas de carte bancaire requise<br />
                                ✓ 5 % de réduction pour les 10 premiers<br />
                                ✓ Réponse sous 24h
                            </div>
                        </form>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: '64px 24px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>Questions fréquentes</h2>
                    {FAQ.map((item, i) => (
                        <details key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', marginBottom: 12, cursor: 'pointer' }}>
                            <summary style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{item.q}</summary>
                            <p style={{ marginTop: 12, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: '#0f172a', color: '#cbd5e1', padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'white', marginBottom: 12 }}>Soft Transit</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', fontSize: 14, marginBottom: 16 }}>
                    <a href="https://softtransit.net" style={{ color: '#cbd5e1', textDecoration: 'none' }}><Globe2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />softtransit.net</a>
                    <a href="mailto:sst@sst.best" style={{ color: '#cbd5e1', textDecoration: 'none' }}><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />sst@sst.best</a>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                    © {new Date().getFullYear()} Soft Services Technologies — Tous droits réservés
                </div>
            </footer>

            <WhatsAppButton />
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, textarea }) {
    const Component = textarea ? 'textarea' : 'input';
    return (
        <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <Component
                type={type}
                required={required}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={textarea ? 3 : undefined}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: textarea ? 'vertical' : 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = PURPLE}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
        </label>
    );
}

function SelectField({ label, value, onChange, options }) {
    return (
        <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <select
                value={value}
                onChange={onChange}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', boxSizing: 'border-box' }}
            >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </label>
    );
}
