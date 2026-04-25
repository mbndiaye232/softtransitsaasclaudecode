-- Migration 022: Système de facturation complet (Crédits + Forfait)
-- Compatible MySQL 8.0 (sans ADD COLUMN IF NOT EXISTS)

-- 1. Mise à jour table structur
ALTER TABLE `structur`
  ADD COLUMN `billing_mode` ENUM('credits', 'forfait') NOT NULL DEFAULT 'credits' COMMENT 'Mode de facturation',
  ADD COLUMN `forfait_type` ENUM('annuel', 'indefini') NULL COMMENT 'Type de forfait',
  ADD COLUMN `forfait_expires_at` DATETIME NULL COMMENT 'Date expiration forfait annuel',
  ADD COLUMN `credit_alert_email` VARCHAR(255) NULL COMMENT 'Email pour alertes crédit',
  ADD COLUMN `alert_threshold_1` INT DEFAULT 100 COMMENT 'Seuil alerte niveau 1',
  ADD COLUMN `alert_threshold_2` INT DEFAULT 50 COMMENT 'Seuil alerte niveau 2',
  ADD COLUMN `alert_threshold_3` INT DEFAULT 20 COMMENT 'Seuil alerte niveau 3',
  ADD COLUMN `alert_sent_1` TINYINT DEFAULT 0 COMMENT 'Alerte niveau 1 envoyée',
  ADD COLUMN `alert_sent_2` TINYINT DEFAULT 0 COMMENT 'Alerte niveau 2 envoyée',
  ADD COLUMN `alert_sent_3` TINYINT DEFAULT 0 COMMENT 'Alerte niveau 3 envoyée',
  ADD COLUMN `trial_credits_given` TINYINT DEFAULT 0 COMMENT 'Crédits essai accordés';

-- 2. Table des packs de crédits
CREATE TABLE IF NOT EXISTS `credit_packs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `credits` INT NOT NULL,
  `price_eur` DECIMAL(10,2) NOT NULL,
  `price_cfa` DECIMAL(12,0) NOT NULL,
  `is_popular` TINYINT DEFAULT 0,
  `is_active` TINYINT DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Données des packs
INSERT INTO `credit_packs` (`name`, `credits`, `price_eur`, `price_cfa`, `is_popular`, `sort_order`) VALUES
  ('Démarrage',   100,    9.00,   5900,   0, 1),
  ('Essentiel',   300,   24.00,  15750,   0, 2),
  ('Pro',         700,   50.00,  32800,   1, 3),
  ('Business',   1500,   99.00,  64950,   0, 4),
  ('Enterprise', 5000,  299.00, 196100,   0, 5);

-- 3. Extension table transactions
ALTER TABLE `transactions`
  ADD COLUMN `amount_eur` DECIMAL(10,2) NULL COMMENT 'Montant en EUR',
  ADD COLUMN `amount_cfa` DECIMAL(12,0) NULL COMMENT 'Montant en CFA',
  ADD COLUMN `pack_id` INT NULL COMMENT 'Pack acheté',
  ADD COLUMN `payment_provider` ENUM('paypal','wave','orange_money','manuel','trial','admin') NULL COMMENT 'Fournisseur paiement',
  ADD COLUMN `provider_reference` VARCHAR(255) NULL COMMENT 'Référence chez le fournisseur',
  ADD COLUMN `payment_url` TEXT NULL COMMENT 'URL redirection paiement',
  ADD COLUMN `notes` TEXT NULL COMMENT 'Notes internes',
  ADD COLUMN `confirmed_by` BIGINT NULL COMMENT 'Admin ayant confirmé';

-- 4. Historique des alertes crédit
CREATE TABLE IF NOT EXISTS `credit_alert_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `structur_id` BIGINT NOT NULL,
  `threshold_level` INT NOT NULL COMMENT 'Niveau alerte (1,2,3)',
  `threshold_value` INT NOT NULL COMMENT 'Valeur seuil au moment de l alerte',
  `credit_balance_at_alert` DECIMAL(24,6) NOT NULL COMMENT 'Solde au moment alerte',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cal_structur` (`structur_id`),
  CONSTRAINT `fk_cal_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur` (`IDSociete`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Historique des forfaits
CREATE TABLE IF NOT EXISTS `forfait_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `structur_id` BIGINT NOT NULL,
  `forfait_type` ENUM('annuel','indefini') NOT NULL,
  `amount_eur` DECIMAL(10,2) NOT NULL,
  `amount_cfa` DECIMAL(12,0) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `provider_reference` VARCHAR(255) NULL,
  `starts_at` DATETIME NOT NULL,
  `expires_at` DATETIME NULL,
  `created_by` BIGINT NULL COMMENT 'ID super admin ayant activé',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fh_structur` (`structur_id`),
  CONSTRAINT `fk_fh_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur` (`IDSociete`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
