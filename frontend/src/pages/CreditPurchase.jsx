import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsAPI, structureAPI } from '../services/api';
import { 
    CreditCard, 
    ArrowLeft, 
    CheckCircle2, 
    AlertCircle, 
    TrendingUp, 
    Clock, 
    ShieldCheck, 
    Package 
} from 'lucide-react';

export default function CreditPurchase() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [creditBalance, setCreditBalance] = useState(0);

    // Pre-defined packages
    const packages = [
        { credits: 100, amount: 10000, label: 'Pack Découverte', color: '#3b82f6', icon: Package },
        { credits: 500, amount: 45000, label: 'Pack Standard', color: '#8b5cf6', icon: TrendingUp },
        { credits: 1000, amount: 80000, label: 'Pack Premium', color: '#10b981', icon: ShieldCheck, popular: true },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [transRes, structRes] = await Promise.all([
                transactionsAPI.getAll(),
                structureAPI.getMe()
            ]);
            setTransactions(transRes.data);
            setCreditBalance(structRes.data.credit_balance);
        } catch (err) {
            setError('Impossible de charger les données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (pkg) => {
        if (!window.confirm(`Confirmez-vous l'achat de ${pkg.credits} crédits pour un montant de ${pkg.amount.toLocaleString()} FCFA ?`)) return;

        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            // 1. Initiate Purchase
            const initRes = await transactionsAPI.purchase({
                amount: pkg.amount,
                credits: pkg.credits,
                paymentMethod: 'MOCK_CARD'
            });

            // 2. Mock Payment Confirmation (Delay simulation)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. Confirm Purchase
            await transactionsAPI.confirm({
                transactionId: initRes.data.id
            });

            setSuccess(`Achat de ${pkg.credits} crédits effectué avec succès ! Vos crédits ont été rechargés.`);
            loadData(); // Refresh data
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur lors de la transaction. Veuillez réessayer.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="credit-page-wrapper">
            <style>{`
                .credit-page-wrapper { min-height: 100vh; background: var(--bg); padding: 2rem; padding-bottom: 5rem; }
                .cp-container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
                
                .cp-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 1.5rem 2rem; border-radius: var(--radius-2xl); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
                .cp-header-left { display: flex; align-items: center; gap: 1.25rem; }
                .credit-icon-container { width: 56px; height: 56px; border-radius: var(--radius-xl); background: var(--indigo-50); color: var(--primary); display: flex; align-items: center; justify-content: center; }
                .cp-title { font-size: 1.5rem; font-weight: 800; color: var(--slate-900); margin: 0; }
                .cp-subtitle { font-size: 0.875rem; color: var(--slate-500); margin: 0.25rem 0 0 0; }
                
                .back-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--slate-50); border: 1px solid var(--border); color: var(--slate-700); font-weight: 700; font-size: 0.875rem; border-radius: var(--radius-lg); cursor: pointer; transition: all 0.2s; }
                .back-btn:hover { background: white; box-shadow: var(--shadow-md); color: var(--slate-900); }

                .cp-balance-card { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border-radius: var(--radius-2xl); padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4); position: relative; overflow: hidden; }
                .cp-balance-card::after { content: ''; position: absolute; right: -5%; top: -20%; width: 300px; height: 300px; background: white; filter: blur(100px); opacity: 0.1; }
                .balance-label { font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; }
                .balance-value { font-size: 3.5rem; font-weight: 800; letter-spacing: -0.02em; display: flex; align-items: baseline; gap: 0.5rem; }
                .balance-unit { font-size: 1.25rem; font-weight: 600; opacity: 0.8; }

                .packages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
                .pkg-card { background: white; border-radius: var(--radius-2xl); padding: 2rem; border: 2px solid var(--border); position: relative; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: var(--shadow-sm); }
                .pkg-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
                .pkg-card.popular { border-color: var(--primary); background: linear-gradient(to bottom, #f8fafc, white); }
                .popular-badge { position: absolute; top: -12px; background: var(--primary); color: white; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 1rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3); }
                
                .pkg-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
                .pkg-label { font-size: 1.125rem; font-weight: 700; color: var(--slate-600); margin-bottom: 0.5rem; }
                .pkg-credits { font-size: 2.5rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.25rem; line-height: 1; }
                .pkg-credit-label { font-size: 0.875rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase; margin-bottom: 1.5rem; }
                .pkg-price { font-size: 1.25rem; font-weight: 800; color: var(--slate-700); margin-bottom: 2rem; background: var(--slate-50); padding: 0.5rem 1.5rem; border-radius: 999px; border: 1px solid var(--border); }
                
                .btn-buy { width: 100%; padding: 1rem; border-radius: var(--radius-xl); font-weight: 800; font-size: 1rem; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .btn-buy:disabled { opacity: 0.6; cursor: not-allowed; }

                .history-card { background: white; border-radius: var(--radius-2xl); border: 1px solid var(--border); box-shadow: var(--shadow-sm); overflow: hidden; }
                .history-header { padding: 1.5rem 2rem; background: var(--slate-50); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 0.75rem; }
                .history-header h2 { font-size: 1.125rem; font-weight: 800; color: var(--slate-900); margin: 0; }
                
                .st-table { width: 100%; border-collapse: collapse; }
                .st-table th { padding: 1rem 2rem; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; background: white; border-bottom: 1px solid var(--border-light); }
                .st-table td { padding: 1.25rem 2rem; font-size: 0.875rem; color: var(--slate-700); border-bottom: 1px solid var(--border-light); }
                
                .status-badge { padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-success { background: #dcfce7; color: #166534; }
                .status-error { background: #fee2e2; color: #991b1b; }

                .alert { padding: 1rem 1.5rem; border-radius: var(--radius-lg); display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 0.9375rem; }
                .alert-success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
                .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
            `}</style>
            
            <div className="cp-container">
                <header className="cp-header">
                    <div className="cp-header-left">
                        <div className="credit-icon-container">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <h1 className="cp-title">Gestion des Crédits</h1>
                            <p className="cp-subtitle">Rechargez votre compte pour continuer à utiliser les services de la plateforme.</p>
                        </div>
                    </div>
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={18} /> Retour au Dashboard
                    </button>
                </header>

                {(error || success) && (
                    <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
                        {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        {error || success}
                    </div>
                )}

                {loading && transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>Chargement de votre solde...</div>
                ) : (
                    <>
                        <div className="cp-balance-card">
                            <div>
                                <div className="balance-label">Solde Actuel</div>
                                <div className="balance-value">
                                    {parseFloat(creditBalance).toLocaleString()} <span className="balance-unit">Crédits de session</span>
                                </div>
                            </div>
                            <ShieldCheck size={100} style={{ opacity: 0.2, position: 'absolute', right: '10%' }} />
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1.5rem' }}>Choisir une recharge</h2>
                            <div className="packages-grid">
                                {packages.map((pkg, idx) => {
                                    const Icon = pkg.icon;
                                    return (
                                        <div key={idx} className={`pkg-card ${pkg.popular ? 'popular' : ''}`}>
                                            {pkg.popular && <div className="popular-badge">Plus Choisis</div>}
                                            <div className="pkg-icon" style={{ background: `${pkg.color}15`, color: pkg.color }}>
                                                <Icon size={32} />
                                            </div>
                                            <div className="pkg-label">{pkg.label}</div>
                                            <div className="pkg-credits">{pkg.credits}</div>
                                            <div className="pkg-credit-label">Crédits</div>
                                            
                                            <div className="pkg-price">{pkg.amount.toLocaleString()} FCFA</div>
                                            
                                            <button 
                                                onClick={() => handlePurchase(pkg)}
                                                className="btn-buy"
                                                style={{ 
                                                    background: pkg.popular ? 'var(--primary)' : 'var(--slate-900)',
                                                    color: 'white',
                                                    boxShadow: pkg.popular ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                                                }}
                                                disabled={loading}
                                            >
                                                {loading ? 'Traitement...' : 'Acheter maintenant'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="history-card">
                            <div className="history-header">
                                <Clock size={20} className="text-slate-500" />
                                <h2>Cahier de facturation et d'historique</h2>
                            </div>
                            {transactions.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                                    <Clock size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Vous n'avez pas encore effectué d'achat de crédits.</p>
                                </div>
                            ) : (
                                <table className="st-table">
                                    <thead>
                                        <tr>
                                            <th>Date d'achat</th>
                                            <th>Canal</th>
                                            <th style={{ textAlign: 'center' }}>Crédits Acquis</th>
                                            <th style={{ textAlign: 'right' }}>Montant Facturé</th>
                                            <th style={{ textAlign: 'center' }}>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(t => (
                                            <tr key={t.id}>
                                                <td style={{ fontWeight: 600 }}>{new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</td>
                                                <td>{t.type === 'PURCHASE' ? 'Achat Standard' : t.type}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--slate-900)' }}>+{t.credits}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{parseFloat(t.amount).toLocaleString()} FCFA</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-badge ${t.status === 'COMPLETED' ? 'status-success' : 'status-error'}`}>
                                                        {t.status === 'COMPLETED' ? 'Payé' : 'Échec'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
