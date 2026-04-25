CREATE TABLE IF NOT EXISTS unitespoids (
    IDUnitePoids INT AUTO_INCREMENT PRIMARY KEY,
    LibelleUnitePoids VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des données initiales
INSERT INTO unitespoids (LibelleUnitePoids) VALUES ('Kg'), ('Tonne');
