-- Migration 024 : Rôle SUPER_ADMIN
-- Convertit les admins is_provider en SUPER_ADMIN

UPDATE Agents a
JOIN structur s ON a.structur_id = s.IDSociete
SET a.role = 'SUPER_ADMIN'
WHERE s.is_provider = 1 AND a.role = 'ADMIN';
