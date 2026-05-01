-- Migration 032: Seed taxes_complements from ComplementsTaxes.xml data
-- Uses CodeTaxe codes (stable) to resolve IDTaxes from our database

-- Clear existing data to avoid duplicates on re-run
DELETE FROM taxes_complements;

-- TVA (05) : base = CAF + DD(01) + RS(03) + TAXE ADD(45) + TICOSMETIQUE(50) + TI(53)
INSERT INTO taxes_complements (IDTaxesPrincipal, CodeTaxePrincipal, IDTaxesComplement, CodeTaxeComplement)
SELECT tp.IDTaxes, tp.CodeTaxe, tc.IDTaxes, tc.CodeTaxe
FROM taxes tp, taxes tc
WHERE tp.CodeTaxe = '05' AND tc.CodeTaxe IN ('01','03','45','50','53')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = '05')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = tc.CodeTaxe);

-- TCI (34) : base = CAF + DD(01) + RS(03)
INSERT INTO taxes_complements (IDTaxesPrincipal, CodeTaxePrincipal, IDTaxesComplement, CodeTaxeComplement)
SELECT tp.IDTaxes, tp.CodeTaxe, tc.IDTaxes, tc.CodeTaxe
FROM taxes tp, taxes tc
WHERE tp.CodeTaxe = '34' AND tc.CodeTaxe IN ('01','03')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = '34')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = tc.CodeTaxe);

-- BIC (46) : base = CAF + DD(01) + RS(03)
INSERT INTO taxes_complements (IDTaxesPrincipal, CodeTaxePrincipal, IDTaxesComplement, CodeTaxeComplement)
SELECT tp.IDTaxes, tp.CodeTaxe, tc.IDTaxes, tc.CodeTaxe
FROM taxes tp, taxes tc
WHERE tp.CodeTaxe = '46' AND tc.CodeTaxe IN ('01','03')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = '46')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = tc.CodeTaxe);

-- TICOSMETIQUE (50) : base = CAF + DD(01) + RS(03)
INSERT INTO taxes_complements (IDTaxesPrincipal, CodeTaxePrincipal, IDTaxesComplement, CodeTaxeComplement)
SELECT tp.IDTaxes, tp.CodeTaxe, tc.IDTaxes, tc.CodeTaxe
FROM taxes tp, taxes tc
WHERE tp.CodeTaxe = '50' AND tc.CodeTaxe IN ('01','03')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = '50')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = tc.CodeTaxe);

-- TI (53) : base = CAF + DD(01) + RS(03)
INSERT INTO taxes_complements (IDTaxesPrincipal, CodeTaxePrincipal, IDTaxesComplement, CodeTaxeComplement)
SELECT tp.IDTaxes, tp.CodeTaxe, tc.IDTaxes, tc.CodeTaxe
FROM taxes tp, taxes tc
WHERE tp.CodeTaxe = '53' AND tc.CodeTaxe IN ('01','03')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = '53')
  AND EXISTS (SELECT 1 FROM taxes WHERE CodeTaxe = tc.CodeTaxe);
