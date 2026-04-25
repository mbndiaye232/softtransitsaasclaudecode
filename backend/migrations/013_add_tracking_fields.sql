-- Migration 013: Add tracking milestones
USE soft_transit_saas;

-- Add DateRemise to dossiers
ALTER TABLE `dossiers` 
ADD COLUMN `DateRemise` DATE NULL COMMENT 'Date remise des documents au transitaire' AFTER `SaisiLe`;

-- Add milestones to miseenlivraison
ALTER TABLE `miseenlivraison`
ADD COLUMN `DateRetourConteneur` DATE NULL COMMENT 'Date RCO (Retour Conteneur)' AFTER `DateMiseEnLivraison`,
ADD COLUMN `DateEffectiveLivraison` DATE NULL COMMENT 'Date effective de livraison' AFTER `DateRetourConteneur`;
