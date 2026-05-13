const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const ALERT_DAYS = [30, 15, 7];

/**
 * Vérifie tous les forfaits annuels et envoie les alertes de renouvellement.
 * À appeler au démarrage du serveur et toutes les 12h via setInterval.
 */
async function checkForfaitRenewals() {
    try {
        // Forfaits annuels qui expirent dans 30, 15 ou 7 jours
        const [expiring] = await pool.query(
            `SELECT
               s.IDSociete as id, s.NomSociete as name,
               s.Emailstructur as email, s.credit_alert_email,
               s.forfait_expires_at,
               DATEDIFF(s.forfait_expires_at, NOW()) as days_left,
               ANY_VALUE(a.Email) as admin_email, ANY_VALUE(a.NomAgent) as admin_name
             FROM structur s
             LEFT JOIN agents a ON a.structur_id = s.IDSociete
               AND a.role = 'ADMIN' AND a.is_active = 1
             WHERE s.billing_mode = 'forfait'
               AND s.forfait_type = 'annuel'
               AND s.forfait_expires_at IS NOT NULL
               AND s.forfait_expires_at > NOW()
               AND DATEDIFF(s.forfait_expires_at, NOW()) <= 30
             GROUP BY s.IDSociete, s.NomSociete, s.Emailstructur, s.credit_alert_email, s.forfait_expires_at`
        );

        for (const company of expiring) {
            const daysLeft = parseInt(company.days_left);
            const alertLevel = ALERT_DAYS.find(d => daysLeft <= d);
            if (!alertLevel) continue;

            // Vérifier si cette alerte a déjà été envoyée
            const [[existing]] = await pool.query(
                'SELECT id FROM forfait_renewal_alerts WHERE structur_id = ? AND days_before = ?',
                [company.id, alertLevel]
            );
            if (existing) continue;

            // Envoyer l'email
            const recipientEmail = company.credit_alert_email || company.admin_email || company.email;
            if (recipientEmail) {
                await sendRenewalAlert(recipientEmail, company, daysLeft, alertLevel);
            }

            // Enregistrer l'alerte envoyée
            await pool.query(
                'INSERT IGNORE INTO forfait_renewal_alerts (structur_id, days_before) VALUES (?, ?)',
                [company.id, alertLevel]
            );
        }

        // Réinitialiser les alertes des forfaits renouvelés
        // (si le forfait_expires_at a été mis à jour, les anciennes alertes sont caduques)
        await pool.query(
            `DELETE fra FROM forfait_renewal_alerts fra
             JOIN structur s ON fra.structur_id = s.IDSociete
             WHERE DATEDIFF(s.forfait_expires_at, NOW()) > 30
                OR s.billing_mode != 'forfait'`
        );

    } catch (err) {
        console.error('[ForfaitAlert] Erreur vérification renouvellements:', err);
    }
}

async function sendRenewalAlert(email, company, daysLeft, alertLevel) {
    const urgency = alertLevel === 7 ? 'URGENT' : alertLevel === 15 ? 'Attention' : 'Information';
    const color = alertLevel === 7 ? '#dc2626' : alertLevel === 15 ? '#f97316' : '#f59e0b';
    const expiresDate = new Date(company.forfait_expires_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    await transporter.sendMail({
        from: `"Soft Transit" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `[${urgency}] Votre forfait Soft Transit expire dans ${daysLeft} jours`,
        html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;">
          <div style="background:${color};color:white;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">🔄 Renouvellement forfait — ${daysLeft} jours restants</h1>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
            <p>Bonjour <strong>${company.admin_name || company.name}</strong>,</p>
            <p>Le forfait Soft Transit de <strong>${company.name}</strong> arrive à expiration.</p>
            <div style="background:white;border:2px solid ${color};border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
              <div style="font-size:14px;color:#6b7280;">Expiration le</div>
              <div style="font-size:28px;font-weight:800;color:${color};">${expiresDate}</div>
              <div style="font-size:13px;color:#9ca3af;margin-top:6px;">J-${daysLeft}</div>
            </div>
            <p style="color:#374151;">
              ${daysLeft <= 7
                ? `⚠️ <strong>Action requise !</strong> Sans renouvellement, votre compte passera en mode <em>Crédits</em> à l'expiration.`
                : `Pensez à contacter votre gestionnaire Soft Transit pour renouveler votre forfait annuel.`}
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${process.env.FRONTEND_URL}/billing"
                 style="background:${color};color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Gérer mon abonnement
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="font-size:12px;color:#9ca3af;">
              Pour renouveler votre forfait, contactez-nous à
              <a href="mailto:${process.env.SMTP_USER}">${process.env.SMTP_USER}</a>
            </p>
          </div>
        </div>`
    });

    console.log(`[ForfaitAlert] Alerte J-${alertLevel} envoyée à ${email} (${company.name})`);
}

/**
 * Lance la vérification périodique toutes les 12h
 */
function startForfaitAlertScheduler() {
    // Premier check au démarrage (avec délai de 10s pour laisser la DB s'initialiser)
    setTimeout(checkForfaitRenewals, 10_000);
    // Puis toutes les 12h
    setInterval(checkForfaitRenewals, 12 * 60 * 60 * 1000);
    console.log('🔔 Forfait renewal scheduler started (check every 12h)');
}

module.exports = { checkForfaitRenewals, startForfaitAlertScheduler };
