-- Migration: create leads table for /demo landing page
-- Description: Stores demo requests from prospects coming through softtransit.net/demo.
--              Public endpoint (no auth) inserts here; admin endpoint reads.

CREATE TABLE IF NOT EXISTS `leads` (
    `id`              BIGINT PRIMARY KEY AUTO_INCREMENT,
    `full_name`       VARCHAR(255) NOT NULL,
    `company`         VARCHAR(255) NULL,
    `email`           VARCHAR(255) NOT NULL,
    `whatsapp`        VARCHAR(64)  NULL,
    `country`         VARCHAR(64)  NULL,
    `monthly_volume`  VARCHAR(32)  NULL,
    `message`         TEXT NULL,
    `source`          VARCHAR(64)  DEFAULT 'demo_page',
    `status`          ENUM('new','contacted','demo_scheduled','converted','lost') DEFAULT 'new',
    `notes`           TEXT NULL,
    `ip_address`      VARCHAR(64)  NULL,
    `user_agent`      VARCHAR(512) NULL,
    `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_leads_status`  (`status`),
    INDEX `idx_leads_created` (`created_at`),
    INDEX `idx_leads_email`   (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
