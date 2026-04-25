-- 023_create_composition_tables.sql
-- Create tables for Composition Transport (Containers and Groupage) associated with Dossiers/BillOfLading

-- Table: conteneurbl
CREATE TABLE IF NOT EXISTS `conteneurbl` (
  `IDConteneurBL` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `NumeroTC` VARCHAR(150) NULL,
  `TypeTC` VARCHAR(150) NULL,
  `TareTC` DOUBLE NULL DEFAULT 0,
  `DimensionTC` DOUBLE NULL DEFAULT 0,
  `UnitePoids` VARCHAR(50) NULL,
  `idblltalvibooking` BIGINT UNSIGNED NULL,
  `IDAgents` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDConteneurBL`),
  KEY `idx_conteneur_bl` (`idblltalvibooking`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: contenusconteneurs (Child of conteneurbl)
CREATE TABLE IF NOT EXISTS `contenusconteneurs` (
  `IDContenusConteneurs` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `IDConteneurBL` BIGINT UNSIGNED NOT NULL,
  `ObjetConteneur` VARCHAR(150) NULL,
  `Quantite` DOUBLE NULL DEFAULT 0,
  `PoidsTotalNet` DOUBLE NULL DEFAULT 0,
  `Unite` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDContenusConteneurs`),
  KEY `idx_contenus_parent` (`IDConteneurBL`),
  CONSTRAINT `fk_contenus_parent` FOREIGN KEY (`IDConteneurBL`) REFERENCES `conteneurbl` (`IDConteneurBL`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: groupage (Start for Groupage/Conventionnel)
CREATE TABLE IF NOT EXISTS `groupage` (
  `IDGroupage` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idblltalvibooking` BIGINT UNSIGNED NULL,
  `NatureEtQuantiteDesMarchandises` VARCHAR(250) NULL,
  `UnitePoids` VARCHAR(50) NULL,
  `PoidsTaxation` DOUBLE NULL DEFAULT 0,
  `TarifMontant` DECIMAL(24,6) NULL DEFAULT 0,
  `Total` DECIMAL(24,6) NULL DEFAULT 0,
  `classe_tarif` VARCHAR(10) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDGroupage`),
  KEY `idx_groupage_bl` (`idblltalvibooking`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
