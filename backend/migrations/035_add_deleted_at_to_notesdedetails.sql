-- Migration: add soft-delete column to notesdedetails
-- Description: Adds a `deleted_at` column to support soft-deletion of notes
--              from the FacturationManager unvalidated-notes modal.
--              Aggregations (taxes-liquidees) and lists must filter
--              `WHERE deleted_at IS NULL`.

ALTER TABLE `notesdedetails`
    ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL
    AFTER `DateCreation`;

CREATE INDEX `idx_notesdedetails_deleted_at`
    ON `notesdedetails` (`deleted_at`);
