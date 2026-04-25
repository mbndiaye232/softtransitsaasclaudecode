-- Migration 030 : Nouvelles opérations tarifaires + CRUD forfaits

-- 1) Ajouter les opérations manquantes dans credit_rules
INSERT INTO `credit_rules` (`operation_type`, `operation_name`, `cost`, `is_active`) VALUES
  ('tiers_create',       'Création de Tiers',              1, 1),
  ('tiers_update',       'Modification de Tiers',          1, 1),
  ('reglement_create',   'Création de Règlement',          2, 1),
  ('reglement_update',   'Modification de Règlement',      1, 1),
  ('sauvegarde_export',  'Export / Sauvegarde',            1, 1),
  ('rapport_generate',   'Génération de Rapport',          2, 1),
  ('declaration_create', 'Création de Déclaration',       10, 1)
ON DUPLICATE KEY UPDATE
  `operation_name` = VALUES(`operation_name`),
  `cost`           = VALUES(`cost`),
  `is_active`      = VALUES(`is_active`);

-- 2) Changer le type ENUM → VARCHAR(50) dans forfait_config pour permettre des types personnalisés
ALTER TABLE `forfait_config`
  MODIFY COLUMN `type` VARCHAR(50) NOT NULL;

-- 3) Changer le type ENUM → VARCHAR(50) dans structr pour rester cohérent
ALTER TABLE `structr`
  MODIFY COLUMN `forfait_type` VARCHAR(50) NULL DEFAULT NULL;

-- 4) Ajouter un index sur forfait_config.type si pas déjà présent (remplace l'ancien UNIQUE du ENUM)
-- (L'index UNIQUE uq_type est normalement conservé lors du MODIFY, mais on le recrée au cas où)
ALTER TABLE `forfait_config`
  DROP INDEX IF EXISTS `uq_type`;

ALTER TABLE `forfait_config`
  ADD UNIQUE KEY `uq_type` (`type`);
