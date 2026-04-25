-- Migration 028 : Ajout sécurisé des colonnes billing (IF NOT EXISTS, MySQL 8.0+)
-- À exécuter si la migration 022_billing_system.sql n'a pas encore été appliquée.

-- 1. Colonnes billing sur structur
ALTER TABLE `structur`
  ADD COLUMN IF NOT EXISTS `billing_mode`         ENUM('credits','forfait') NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS `forfait_type`          ENUM('annuel','indefini') NULL,
  ADD COLUMN IF NOT EXISTS `forfait_expires_at`    DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `credit_alert_email`    VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `alert_threshold_1`     INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS `alert_threshold_2`     INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS `alert_threshold_3`     INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS `alert_sent_1`          TINYINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `alert_sent_2`          TINYINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `alert_sent_3`          TINYINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `trial_credits_given`   TINYINT DEFAULT 0;

-- 2. Table packs de crédits
CREATE TABLE IF NOT EXISTS `credit_packs` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `credits`     INT NOT NULL,
  `price_eur`   DECIMAL(10,2) NOT NULL,
  `price_cfa`   DECIMAL(12,0) NOT NULL,
  `is_popular`  TINYINT DEFAULT 0,
  `is_active`   TINYINT DEFAULT 1,
  `sort_order`  INT DEFAULT 0,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Packs par défaut (ignore si déjà présents)
INSERT IGNORE INTO `credit_packs` (`id`,`name`,`credits`,`price_eur`,`price_cfa`,`is_popular`,`sort_order`) VALUES
  (1,'Démarrage',   100,    9.00,   5900, 0, 1),
  (2,'Essentiel',   300,   24.00,  15750, 0, 2),
  (3,'Pro',         700,   50.00,  32800, 1, 3),
  (4,'Business',   1500,   99.00,  64950, 0, 4),
  (5,'Enterprise', 5000,  299.00, 196100, 0, 5);

-- 3. Colonnes supplémentaires sur transactions
ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `amount_eur`          DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS `amount_cfa`          DECIMAL(12,0) NULL,
  ADD COLUMN IF NOT EXISTS `pack_id`             INT NULL,
  ADD COLUMN IF NOT EXISTS `payment_provider`    ENUM('paypal','wave','orange_money','manuel','trial','admin') NULL,
  ADD COLUMN IF NOT EXISTS `provider_reference`  VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `payment_url`         TEXT NULL,
  ADD COLUMN IF NOT EXISTS `notes`               TEXT NULL,
  ADD COLUMN IF NOT EXISTS `confirmed_by`        BIGINT NULL;

-- 4. Table demandes billing
CREATE TABLE IF NOT EXISTS `billing_requests` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `structur_id`          BIGINT NOT NULL,
  `agent_id`             BIGINT NOT NULL,
  `requested_mode`       ENUM('credits','forfait') NOT NULL,
  `requested_forfait_type` ENUM('annuel','indefini') NULL,
  `message`              TEXT NULL,
  `status`               ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `handled_by`           BIGINT NULL,
  `handled_at`           DATETIME NULL,
  `admin_notes`          TEXT NULL,
  `expires_at`           DATETIME NULL,
  `created_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_br_structur` (`structur_id`),
  KEY `idx_br_status`   (`status`),
  CONSTRAINT `fk_br_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur` (`IDSociete`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_agent`    FOREIGN KEY (`agent_id`)    REFERENCES `Agents` (`IDAgents`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Logs alertes crédits
CREATE TABLE IF NOT EXISTS `credit_alert_logs` (
  `id`                      BIGINT NOT NULL AUTO_INCREMENT,
  `structur_id`             BIGINT NOT NULL,
  `threshold_level`         INT NOT NULL,
  `threshold_value`         INT NOT NULL,
  `credit_balance_at_alert` DECIMAL(24,6) NOT NULL,
  `sent_at`                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cal_structur` (`structur_id`),
  CONSTRAINT `fk_cal_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur` (`IDSociete`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
