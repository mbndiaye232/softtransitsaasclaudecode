-- Add code field to activites table
ALTER TABLE activites ADD COLUMN code VARCHAR(10) NULL AFTER libelle;
