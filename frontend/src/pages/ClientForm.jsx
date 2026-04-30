import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clientsAPI, statutsAPI } from '../services/api'
import {
    Save,
    X,
    Building2,
    Mail,
    Phone,
    MapPin,
    User,
    Shield,
    CreditCard,
    Percent,
    Calendar,
    FileText,
    CheckCircle,
    Building,
    UserCircle,
    Info,
    ChevronLeft,
    DollarSign,
    Zap
} from 'lucide-react'

export default function ClientForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = !!id

    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [statuts, setStatuts] = useState([])

    // Form Data
    const [formData, setFormData] = useState({
        NomRS: '',
        NINEA: '',
        adresseClient: '',
        TelClient: '',
        EmailClient: '',
        CelClient: '', // Tel 2
        faxClient: '',
        IDStatuts: '',
        EncoursAutorise: '0',
        DelaiReglement: '30',
        DelaiReglementDouane: '15',
        TauxRemise: '0.00',
        AssuranceCredit: '0',
        ExonereTVA: false,
        NumExoneration: '', // Lettre Exo
        CodeClient: '',
        NumCompteSAARI: '',
        PersonneContact: '',
        TelPersonneContact: '',
        EmailPersonneContact: '',
        FactureDouaneAvecCommissionEtTVA: false,
        Observations: '',
        TauxCommissionDDouane: '0.00',
        TauxCommissionDebours: '0.00',
        sappliqueTousDebours: false
    })

    const [file, setFile] = useState(null)
    const [filePreview, setFilePreview] = useState(null)

    useEffect(() => {
        if (isEdit) {
            loadClient()
        }
        loadStatuts()
    }, [id])

    const loadStatuts = async () => {
        try {
            const response = await statutsAPI.getAll()
            setStatuts(response.data)
        } catch (err) {
            console.error('Erreur chargement statuts:', err)
        }
    }

    const loadClient = async () => {
        try {
            const response = await clientsAPI.getOne(id)
            const data = response.data

            setFormData({
                NomRS: data.NomRS || '',
                NINEA: data.NINEA || '',
                adresseClient: data.adresseClient || '',
                TelClient: data.TelClient || '',
                EmailClient: data.EmailClient || '',
                CelClient: data.CelClient || '',
                faxClient: data.faxClient || '',
                IDStatuts: data.IDStatuts || '',
                EncoursAutorise: data.EncoursAutorise || '0',
                DelaiReglement: data.DelaiReglement != null ? String(data.DelaiReglement) : '30',
                DelaiReglementDouane: data.DelaiReglementDouane != null ? String(data.DelaiReglementDouane) : '15',
                TauxRemise: data.TauxRemise || '0.00',
                AssuranceCredit: data.AssuranceCredit || '0',
                ExonereTVA: !!data.ExonereTVA,
                NumExoneration: data.NumExoneration || '',
                CodeClient: data.CodeClient || '',
                NumCompteSAARI: data.NumCompteSAARI || '',
                PersonneContact: data.PersonneContact || '',
                TelPersonneContact: data.TelPersonneContact || '',
                EmailPersonneContact: data.EmailPersonneContact || '',
                FactureDouaneAvecCommissionEtTVA: !!data.FactureDouaneAvecCommissionEtTVA,
                Observations: data.Observations || '',
                TauxCommissionDDouane: data.TauxCommissionDDouane || '0.00',
                TauxCommissionDebours: data.TauxCommissionDebours || '0.00',
                sappliqueTousDebours: !!data.sappliqueTousDebours
            })

            if (data.CheminLettreEXO) {
                const baseUrl = import.meta.env.VITE_API_URL.replace('/api', '')
                setFilePreview(`${baseUrl}/${data.CheminLettreEXO}`)
            }

        } catch (err) {
            setError('Impossible de charger le client')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setFilePreview(URL.createObjectURL(selectedFile))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        let dataToSend = { ...formData }
        if (formData.ExonereTVA && !file && !filePreview) {
            if (!window.confirm("Si vous n'associez pas de lettre d'exonération au client, le système va considérer qu'il ne bénéficie pas d'exonération.\nVoulez-vous continuer ?")) {
                return
            }
            dataToSend.ExonereTVA = false
        }

        setSaving(true)

        try {
            const formDataObj = new FormData()
            Object.keys(dataToSend).forEach(key => {
                formDataObj.append(key, dataToSend[key])
            })

            if (file) {
                formDataObj.append('CheminLettreEXO', file)
            }

            if (isEdit) {
                await clientsAPI.update(id, formDataObj)
                setSuccess('Client modifié avec succès')
                setTimeout(() => navigate('/dashboard'), 1500)
            } else {
                await clientsAPI.create(formDataObj)
                setSuccess('Client créé avec succès')
                setTimeout(() => navigate('/dashboard'), 1500)
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="view-loading">
            <div className="spinner"></div>
            <style>{`
                .view-loading { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--bg); }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--slate-200); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );

    return (
        <div className="client-wrapper">
            <style>{`
                .client-wrapper { min-height: 100vh; background: var(--bg); padding: 2.5rem; }
                .client-container { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
                
                .header-nav { display: flex; justify-content: space-between; align-items: center; }
                .back-btn { display: flex; align-items: center; gap: 0.5rem; color: var(--slate-500); text-decoration: none; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; background: none; }
                .back-btn:hover { color: var(--primary); }
                
                .title-box h1 { font-size: 1.5rem; font-weight: 800; color: var(--slate-900); margin: 0.5rem 0 0 0; }
                
                .form-main { background: white; border-radius: var(--radius-xl); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
                .form-strip { padding: 1rem 2.5rem; background: var(--slate-50); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; }
                .form-strip h2 { font-size: 0.75rem; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
                
                .form-body { padding: 2.5rem; }
                .form-section { margin-bottom: 3rem; }
                .form-section:last-child { margin-bottom: 0; }
                .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--slate-100); }
                .section-title { font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; }
                
                .grid-form { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5rem; }
                .col-3 { grid-column: span 3; }
                .col-4 { grid-column: span 4; }
                .col-6 { grid-column: span 6; }
                .col-8 { grid-column: span 8; }
                .col-12 { grid-column: span 12; }
                @media (max-width: 768px) { .col-3, .col-4, .col-6, .col-8 { grid-column: span 12; } }
                
                .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .input-label { font-size: 0.75rem; font-weight: 700; color: var(--slate-600); }
                .premium-input, .premium-select, .premium-textarea { 
                    width: 100%; 
                    padding: 0.75rem 1rem; 
                    border: 1px solid var(--border); 
                    border-radius: var(--radius-md); 
                    font-size: 0.875rem; 
                    outline: none; 
                    background: var(--slate-50); 
                    transition: all 0.2s; 
                }
                .premium-input:focus, .premium-select:focus, .premium-textarea:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px var(--primary-light); }
                
                .checkbox-group { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 0.75rem; border-radius: var(--radius-md); transition: all 0.2s; }
                .checkbox-group:hover { background: var(--slate-50); }
                .checkbox-group input { width: 1.125rem; height: 1.125rem; accent-color: var(--primary); }
                .checkbox-label { font-size: 0.875rem; font-weight: 600; color: var(--slate-800); }

                .form-footer { padding: 1.5rem 2.5rem; background: var(--surface-header); border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; gap: 1rem; }
                .btn { padding: 0.75rem 2rem; border-radius: var(--radius-md); font-weight: 700; font-size: 0.875rem; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
                .btn-secondary { background: white; color: var(--slate-600); border: 1px solid var(--border); }
                .btn-secondary:hover { background: var(--slate-50); border-color: var(--slate-300); }
                .btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
                .btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 6px 12px -2px rgba(79, 70, 229, 0.3); }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

                .alert { padding: 1rem 1.5rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
                .alert-error { background: #fef2f2; color: var(--danger); border: 1px solid #fee2e2; }
                .alert-success { background: #ecfdf5; color: var(--success); border: 1px solid #d1fae5; }
            `}</style>

            <div className="client-container">
                <nav className="header-nav">
                    <div className="title-box">
                        <button className="back-btn" onClick={() => navigate('/dashboard')}>
                            <ChevronLeft size={16} />
                            Tableau de bord
                        </button>
                        <h1>{isEdit ? 'Modification du Client' : 'Nouveau Client Partenaire'}</h1>
                    </div>
                </nav>

                {error && <div className="alert alert-error"><Info size={16} />{error}</div>}
                {success && <div className="alert alert-success"><CheckCircle size={16} />{success}</div>}

                <form className="form-main" onSubmit={handleSubmit}>
                    <div className="form-strip">
                        <h2>Fiche d'identification client</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--slate-200)' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--slate-200)' }}></div>
                        </div>
                    </div>

                    <div className="form-body">
                        {/* Identité */}
                        <div className="form-section">
                            <div className="section-header">
                                <Building2 size={14} />
                                <span className="section-title">Informations Générales</span>
                            </div>
                            <div className="grid-form">
                                <div className="input-group col-8">
                                    <label className="input-label">Raison Sociale / Nom *</label>
                                    <input name="NomRS" className="premium-input" value={formData.NomRS} onChange={handleChange} required placeholder="Ex: IMPORT-EXPORT SARL" />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">NINEA</label>
                                    <input name="NINEA" className="premium-input" value={formData.NINEA} onChange={handleChange} placeholder="Numéro d'identification fiscale" />
                                </div>
                                <div className="input-group col-8">
                                    <label className="input-label">Adresse Physique</label>
                                    <input name="adresseClient" className="premium-input" value={formData.adresseClient} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Statut Client *</label>
                                    <select name="IDStatuts" className="premium-select" value={formData.IDStatuts} onChange={handleChange} required>
                                        <option value="">Sélectionner un statut</option>
                                        {statuts.map(s => <option key={s.IDStatuts} value={s.IDStatuts}>{s.libelle}</option>)}
                                    </select>
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Téléphone 1</label>
                                    <input name="TelClient" className="premium-input" value={formData.TelClient} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Téléphone 2 (Mobile)</label>
                                    <input name="CelClient" className="premium-input" value={formData.CelClient} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Email de l'entreprise</label>
                                    <input type="email" name="EmailClient" className="premium-input" value={formData.EmailClient} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* Financier */}
                        <div className="form-section">
                            <div className="section-header">
                                <DollarSign size={14} />
                                <span className="section-title">Paramètres Financiers</span>
                            </div>
                            <div className="grid-form">
                                <div className="input-group col-4">
                                    <label className="input-label">Encours Autorisé (F CFA)</label>
                                    <input type="number" name="EncoursAutorise" className="premium-input" value={formData.EncoursAutorise} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Délai Règlement (Jours) <span style={{color:'#ef4444'}}>*</span></label>
                                    <input type="number" name="DelaiReglement" className="premium-input" value={formData.DelaiReglement} onChange={handleChange} required min="0" placeholder="30" />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Délai Douane (Jours) <span style={{color:'#ef4444'}}>*</span></label>
                                    <input type="number" name="DelaiReglementDouane" className="premium-input" value={formData.DelaiReglementDouane} onChange={handleChange} required min="0" placeholder="15" />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Taux Remise (%)</label>
                                    <input type="number" step="0.01" name="TauxRemise" className="premium-input" value={formData.TauxRemise} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Commission Douane (%)</label>
                                    <input type="number" step="0.01" name="TauxCommissionDDouane" className="premium-input" value={formData.TauxCommissionDDouane} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Commission Débours (%)</label>
                                    <input type="number" step="0.01" name="TauxCommissionDebours" className="premium-input" value={formData.TauxCommissionDebours} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="checkbox-group">
                                        <input type="checkbox" name="FactureDouaneAvecCommissionEtTVA" checked={formData.FactureDouaneAvecCommissionEtTVA} onChange={handleChange} />
                                        <span className="checkbox-label">Douane avec Comm. & TVA</span>
                                    </label>
                                </div>
                                <div className="input-group col-4">
                                    <label className="checkbox-group">
                                        <input type="checkbox" name="sappliqueTousDebours" checked={formData.sappliqueTousDebours} onChange={handleChange} />
                                        <span className="checkbox-label">Sur tous les débours</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Exonération & Codes */}
                        <div className="form-section">
                            <div className="section-header">
                                <Shield size={14} />
                                <span className="section-title">Exonération & Comptabilité</span>
                            </div>
                            <div className="grid-form">
                                <div className="input-group col-4">
                                    <label className="input-label">Exonéré de TVA ?</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <label className="checkbox-group" style={{ padding: '0.4rem 0.8rem', border: `1px solid ${formData.ExonereTVA ? 'var(--primary)' : 'var(--border)'}`, background: formData.ExonereTVA ? 'var(--primary-light)' : 'transparent' }}>
                                            <input type="radio" name="ExonereTVA" checked={formData.ExonereTVA === true} onChange={() => setFormData(prev => ({ ...prev, ExonereTVA: true }))} />
                                            <span className="checkbox-label">Oui</span>
                                        </label>
                                        <label className="checkbox-group" style={{ padding: '0.4rem 0.8rem', border: `1px solid ${!formData.ExonereTVA ? 'var(--slate-400)' : 'var(--border)'}`, background: !formData.ExonereTVA ? 'var(--slate-50)' : 'transparent' }}>
                                            <input type="radio" name="ExonereTVA" checked={formData.ExonereTVA === false} onChange={() => setFormData(prev => ({ ...prev, ExonereTVA: false }))} />
                                            <span className="checkbox-label">Non</span>
                                        </label>
                                    </div>
                                </div>
                                {formData.ExonereTVA && (
                                    <div className="input-group col-8">
                                        <label className="input-label">Lettre d'Exonération (Pièce Jointe)</label>
                                        <input type="file" onChange={handleFileChange} className="premium-input" style={{ padding: '0.5rem' }} />
                                        {filePreview && (
                                            <a href={filePreview} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                <FileText size={12} /> Voir le document actuel
                                            </a>
                                        )}
                                    </div>
                                )}
                                <div className="input-group col-4">
                                    <label className="input-label">Numéro Lettre Exo</label>
                                    <input name="NumExoneration" className="premium-input" value={formData.NumExoneration} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Code Client (Interne)</label>
                                    <input name="CodeClient" className="premium-input" value={formData.CodeClient} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">N° Compte SAARI</label>
                                    <input name="NumCompteSAARI" className="premium-input" value={formData.NumCompteSAARI} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="form-section">
                            <div className="section-header">
                                <UserCircle size={14} />
                                <span className="section-title">Point Focal de Contact</span>
                            </div>
                            <div className="grid-form">
                                <div className="input-group col-4">
                                    <label className="input-label">Nom Complet</label>
                                    <input name="PersonneContact" className="premium-input" value={formData.PersonneContact} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Téléphone Direct</label>
                                    <input name="TelPersonneContact" className="premium-input" value={formData.TelPersonneContact} onChange={handleChange} />
                                </div>
                                <div className="input-group col-4">
                                    <label className="input-label">Email Direct</label>
                                    <input type="email" name="EmailPersonneContact" className="premium-input" value={formData.EmailPersonneContact} onChange={handleChange} />
                                </div>
                                <div className="input-group col-12">
                                    <label className="input-label">Observations / Notes Particulières</label>
                                    <textarea name="Observations" className="premium-textarea" rows="4" value={formData.Observations} onChange={handleChange} placeholder="Spécificités client, instructions de livraison, etc." />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">Annuler</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Valider le dossier client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
