const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for other ports (OVH often uses 587 with STARTTLS)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: false
            }
        });
    }

    /**
     * Send an email with attachments
     * @param {Object} options 
     * @param {string} options.to 
     * @param {string} options.subject 
     * @param {string} options.text 
     * @param {string} options.html 
     * @param {Array} options.attachments - Array of { filename, path }
     */
    async sendEmail({ to, subject, text, html, attachments }) {
        const mailOptions = {
            from: `"Soft Transit" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
            attachments,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
