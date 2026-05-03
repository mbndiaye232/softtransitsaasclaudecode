-- Migration 034: Permissions granulaires par onglet de dossier
-- Pour chaque agent qui a déjà la permission DOSSIERS, on lui crée automatiquement
-- toutes les permissions d'onglets avec les mêmes droits.

INSERT INTO agent_permissions (agent_id, module_code, can_view, can_create, can_edit, can_delete)
SELECT ap.agent_id, codes.module_code, ap.can_view, ap.can_create, ap.can_edit, ap.can_delete
FROM agent_permissions ap
JOIN (
    SELECT 'DOSSIER_DETAILS'        AS module_code UNION ALL
    SELECT 'DOSSIER_COTATION'                      UNION ALL
    SELECT 'DOSSIER_OT'                            UNION ALL
    SELECT 'DOSSIER_TT'                            UNION ALL
    SELECT 'DOSSIER_TRANSPORTS'                    UNION ALL
    SELECT 'DOSSIER_COMPOSITION'                   UNION ALL
    SELECT 'DOSSIER_NOTES'                         UNION ALL
    SELECT 'DOSSIER_DECLARATION'                   UNION ALL
    SELECT 'DOSSIER_LIVRAISON'                     UNION ALL
    SELECT 'DOSSIER_OTR'                           UNION ALL
    SELECT 'DOSSIER_BL'                            UNION ALL
    SELECT 'DOSSIER_DEVIS'                         UNION ALL
    SELECT 'DOSSIER_FACTURES_TIERS'                UNION ALL
    SELECT 'DOSSIER_FACTURATION'                   UNION ALL
    SELECT 'DOSSIER_ENVOI_FACTURES'                UNION ALL
    SELECT 'DOSSIER_REGLEMENTS'
) codes ON 1=1
WHERE ap.module_code = 'DOSSIERS'
ON DUPLICATE KEY UPDATE
    can_view   = VALUES(can_view),
    can_create = VALUES(can_create),
    can_edit   = VALUES(can_edit),
    can_delete = VALUES(can_delete);
