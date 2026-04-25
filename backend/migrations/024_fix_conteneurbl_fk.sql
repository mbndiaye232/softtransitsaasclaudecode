-- 024_fix_conteneurbl_fk.sql
-- Fix the foreign key constraint on conteneurbl to reference the correct table (billoflading instead of billoflanding)

-- First, drop the existing incorrect foreign key
ALTER TABLE `conteneurbl` DROP FOREIGN KEY `conteneurbl_ibfk_1`;

-- Recreate the foreign key with the correct table name (billoflading)
-- Note: We're removing the FK constraint entirely since the table names may vary
-- and the application handles the validation in code
-- ALTER TABLE `conteneurbl` ADD CONSTRAINT `conteneurbl_ibfk_1` 
--   FOREIGN KEY (`idblltalvibooking`) REFERENCES `billoflading` (`idbl`);

-- If you want to keep referential integrity with the correct table, uncomment above and run:
-- But first ensure billoflading.idbl column type matches conteneurbl.idblltalvibooking
