-- Migration 031: Add SecureSSL column to comptesmails table
-- Allows choosing between SSL/TLS (port 465) and STARTTLS (port 587) explicitly

ALTER TABLE comptesmails
    ADD COLUMN IF NOT EXISTS SecureSSL TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = SSL/TLS direct (port 465), 0 = STARTTLS or plain (port 587)';
