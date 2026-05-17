/**
 * Leads route — demo page submissions.
 *
 * POST /api/leads        (PUBLIC)  — used by softtransit.net/demo
 * GET  /api/leads        (admin)   — list leads
 * PUT  /api/leads/:id    (admin)   — update status / notes
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { sendMail } = require('../services/mailer');
const { authMiddleware } = require('../middleware/auth');

const SALES_INBOX = process.env.SALES_INBOX_EMAIL || 'sst@sst.best';

// Very simple email regex (frontend already validates more strictly)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/leads — PUBLIC
 * Creates a new demo request and notifies the sales inbox.
 */
router.post('/', async (req, res) => {
    try {
        const {
            full_name, company, email, whatsapp,
            country, monthly_volume, message
        } = req.body || {};

        // Minimal validation
        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ error: 'Le nom complet est requis.' });
        }
        if (!email || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Adresse email invalide.' });
        }
        if (!whatsapp || whatsapp.trim().length < 6) {
            return res.status(400).json({ error: 'Un numéro WhatsApp est requis.' });
        }

        // Anti-spam: refuse if same email submitted < 60s ago
        const [[recent]] = await pool.query(
            `SELECT id FROM leads
             WHERE email = ? AND created_at > (NOW() - INTERVAL 60 SECOND)
             LIMIT 1`,
            [email]
        );
        if (recent) {
            return res.status(429).json({ error: 'Demande déjà reçue, merci de patienter quelques instants.' });
        }

        const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 64);
        const ua = (req.headers['user-agent'] || '').toString().slice(0, 512);

        const [result] = await pool.query(
            `INSERT INTO leads
             (full_name, company, email, whatsapp, country, monthly_volume, message, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                full_name.trim(),
                (company || '').trim() || null,
                email.trim().toLowerCase(),
                whatsapp.trim(),
                (country || '').trim() || null,
                (monthly_volume || '').trim() || null,
                (message || '').trim() || null,
                ip, ua
            ]
        );

        // Fire-and-forget notification email to sales (don't fail the request if it errors)
        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
              <h2 style="color:#7c3aed">🎯 Nouveau lead Soft Transit</h2>
              <table style="border-collapse:collapse">
                <tr><td style="padding:4px 8px;color:#64748b">Nom</td><td style="padding:4px 8px;font-weight:700">${escapeHtml(full_name)}</td></tr>
                <tr><td style="padding:4px 8px;color:#64748b">Entreprise</td><td style="padding:4px 8px">${escapeHtml(company || '—')}</td></tr>
                <tr><td style="padding:4px 8px;color:#64748b">Email</td><td style="padding:4px 8px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding:4px 8px;color:#64748b">WhatsApp</td><td style="padding:4px 8px"><a href="https://wa.me/${encodeURIComponent(whatsapp.replace(/[^0-9+]/g,''))}">${escapeHtml(whatsapp)}</a></td></tr>
                <tr><td style="padding:4px 8px;color:#64748b">Pays</td><td style="padding:4px 8px">${escapeHtml(country || '—')}</td></tr>
                <tr><td style="padding:4px 8px;color:#64748b">Volume mensuel</td><td style="padding:4px 8px">${escapeHtml(monthly_volume || '—')}</td></tr>
                ${message ? `<tr><td style="padding:4px 8px;color:#64748b;vertical-align:top">Message</td><td style="padding:4px 8px">${escapeHtml(message)}</td></tr>` : ''}
              </table>
              <p style="margin-top:24px;color:#64748b;font-size:12px">
                ID lead : #${result.insertId} · Reçu le ${new Date().toLocaleString('fr-FR')}
              </p>
            </div>
        `;

        sendMail({
            to: SALES_INBOX,
            subject: `🎯 Nouveau lead Soft Transit : ${full_name}${company ? ' (' + company + ')' : ''}`,
            html
        }).catch(err => console.error('[leads] sales notification email failed:', err.message));

        // Auto-reply to the prospect (also fire-and-forget)
        const confirmationHtml = `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:600px">
              <h2 style="color:#7c3aed">Bonjour ${escapeHtml(full_name)},</h2>
              <p>Merci d'avoir demandé une démo de <strong>Soft Transit</strong>.</p>
              <p>Notre équipe vous contactera dans les <strong>24 heures</strong> sur WhatsApp (${escapeHtml(whatsapp)}) pour planifier votre démo gratuite de 30 minutes.</p>
              <p>Pendant la démo, nous vous montrerons :</p>
              <ul>
                <li>Comment liquider une note de détail en 3 minutes</li>
                <li>Le calcul automatique de toutes les taxes UEMOA / CEDEAO / COSEC</li>
                <li>La facturation client auto-remplie depuis les notes validées</li>
              </ul>
              <p style="margin-top:24px">À très vite !</p>
              <p style="color:#64748b;font-size:13px">L'équipe Soft Transit<br>
                 <a href="https://softtransit.net">softtransit.net</a></p>
            </div>
        `;
        sendMail({
            to: email,
            subject: 'Votre démo Soft Transit — confirmation',
            html: confirmationHtml
        }).catch(err => console.error('[leads] confirmation email failed:', err.message));

        res.status(201).json({
            id: result.insertId,
            message: 'Demande reçue. Nous vous contactons sous 24h.'
        });
    } catch (err) {
        console.error('[leads] POST error:', err);
        res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
    }
});

/**
 * GET /api/leads — admin only
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!req.user.is_provider && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const [rows] = await pool.query(
            `SELECT id, full_name, company, email, whatsapp, country,
                    monthly_volume, message, status, notes, created_at
             FROM leads
             ORDER BY created_at DESC
             LIMIT 500`
        );
        res.json(rows);
    } catch (err) {
        console.error('[leads] GET error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /api/leads/:id — admin only (update status / notes)
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.user.is_provider && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const { status, notes } = req.body || {};
        const allowed = ['new', 'contacted', 'demo_scheduled', 'converted', 'lost'];
        const updates = [];
        const params = [];
        if (status !== undefined) {
            if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
            updates.push('status = ?'); params.push(status);
        }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (updates.length === 0) return res.status(400).json({ error: 'Rien à mettre à jour' });
        params.push(req.params.id);
        await pool.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Lead mis à jour' });
    } catch (err) {
        console.error('[leads] PUT error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = router;
