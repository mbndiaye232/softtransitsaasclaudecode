-- Migration 029 : Table de configuration des forfaits (prix modifiables par super admin)

CREATE TABLE IF NOT EXISTS `forfait_config` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `type`            ENUM('annuel','indefini') NOT NULL,
  `label`           VARCHAR(100) NOT NULL,
  `description`     TEXT NULL,
  `price_eur`       DECIMAL(10,2) NOT NULL,
  `price_cfa`       DECIMAL(12,0) NOT NULL,
  `duration_months` INT NULL COMMENT 'NULL = illimité',
  `is_active`       TINYINT DEFAULT 1,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tarifs initiaux : 400 000 F CFA / an · 3 000 000 F CFA lifetime
INSERT IGNORE INTO `forfait_config` (`type`, `label`, `description`, `price_eur`, `price_cfa`, `duration_months`) VALUES
  ('annuel',   'Forfait Annuel',    'Accès illimité pendant 12 mois',        610,  400000, 12),
  ('indefini', 'Forfait Lifetime',  'Accès illimité sans limite de durée',  4574, 3000000, NULL);

-- Mise à jour de la grille tarifaire :
-- Supprime "Déclaration" (10 crédits) et ajoute "Note de détail" (6 crédits)
-- + ajouter les règles manquantes si credit_rules existe
CREATE TABLE IF NOT EXISTS `credit_rules` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `operation_type`  VARCHAR(100) NOT NULL,
  `operation_name`  VARCHAR(200) NOT NULL,
  `cost`            DECIMAL(24,6) NOT NULL DEFAULT 0,
  `duration_factor` DECIMAL(10,4) NULL,
  `is_active`       TINYINT DEFAULT 1,
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operation_type` (`operation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insérer/remplacer les règles de base
INSERT INTO `credit_rules` (`operation_type`, `operation_name`, `cost`, `is_active`) VALUES
  ('note_detail',       'Note de détail',                6, 1),
  ('dossier_create',    'Création de Dossier',           5, 1),
  ('bl_create',         'Création de Bill of Lading',    5, 1),
  ('facture_create',    'Création de Facture',           3, 1),
  ('cotation_create',   'Création de Cotation',          2, 1),
  ('dossier_update',    'Modification de Dossier',       1, 1),
  ('client_create',     'Création de Client',            1, 1)
ON DUPLICATE KEY UPDATE
  `operation_name` = VALUES(`operation_name`),
  `cost`           = VALUES(`cost`),
  `is_active`      = VALUES(`is_active`);

-- Supprimer l'ancienne règle "declaration_create" si elle existe
DELETE FROM `credit_rules` WHERE `operation_type` = 'declaration_create';
