-- Ajout des permissions manquantes dans la table permissions
-- Ces codes sont utilisés dans les routes backend mais absents de la table permissions

INSERT IGNORE INTO permissions (code, name) VALUES
    ('TIERS',               'Gestion des Tiers'),
    ('FINANCES',            'Tableaux de bord financiers'),
    ('CONFIG',              'Configuration Générale'),
    ('PARAMETRES_GENERAUX', 'Paramètres Système'),
    ('RUBRIQUES',           'Référentiel Rubriques');
