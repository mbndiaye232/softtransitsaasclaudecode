-- Migration 023 : Demandes de changement de mode + alertes renouvellement forfait

-- 1. Demandes de changement de mode (client → super admin)
CREATE TABLE IF NOT EXISTS `billing_requests` (
  `id`                   BIGINT        NOT NULL AUTO_INCREMENT,
  `structur_id`          BIGINT        NOT NULL,
  `agent_id`             BIGINT        NOT NULL COMMENT 'Admin client qui fait la demande',
  `current_mode`         ENUM('credits','forfait') NOT NULL,
  `requested_mode`       ENUM('credits','forfait') NOT NULL,
  `requested_forfait_type` ENUM('annuel','indefini') NULL,
  `message`              TEXT          NULL COMMENT 'Message du client',
  `status`               ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_notes`          TEXT          NULL COMMENT 'Réponse du super admin',
  `handled_by`           BIGINT        NULL COMMENT 'ID super admin traitant',
  `handled_at`           DATETIME      NULL,
  `created_at`           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_br_structur`  (`structur_id`),
  KEY `idx_br_status`    (`status`),
  CONSTRAINT `fk_br_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur`(`IDSociete`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Suivi des alertes de renouvellement forfait (évite les doublons)
CREATE TABLE IF NOT EXISTS `forfait_renewal_alerts` (
  `id`           BIGINT    NOT NULL AUTO_INCREMENT,
  `structur_id`  BIGINT    NOT NULL,
  `days_before`  INT       NOT NULL COMMENT '30, 15 ou 7 jours avant expiration',
  `sent_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_renewal` (`structur_id`, `days_before`),
  CONSTRAINT `fk_fra_structur` FOREIGN KEY (`structur_id`) REFERENCES `structur`(`IDSociete`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
