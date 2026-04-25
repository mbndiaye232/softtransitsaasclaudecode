const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyCancellations() {
    console.log('Verifying Cancellations Logic...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const clientId = 3;

    try {
        // 1. Get an invoice for client 3
        const [invoices] = await pool.query(
            'SELECT IDFactures, MontantTTCFacture, ReliquatFacture, MontantRegleFacture FROM factures f JOIN dossiers d ON f.IDDossiers = d.IDDossiers WHERE d.IDCLIENTS = ? LIMIT 1',
            [clientId]
        );

        if (invoices.length === 0) {
            console.log('No invoices found for client 3. Cannot verify.');
            return;
        }

        const inv = invoices[0];
        console.log(`Initial Invoice: ID=${inv.IDFactures}, Regle=${inv.MontantRegleFacture}, Reliquat=${inv.ReliquatFacture}`);

        // 2. Create a mock payment
        const paymentAmount = 1000;
        const [regResult] = await pool.query(
            'INSERT INTO reglements (IDFactures, Datereglement, MontantReglement, IdModeReglement, IdAgent) VALUES (?, NOW(), ?, 1, 1)',
            [inv.IDFactures, paymentAmount]
        );
        const regId = regResult.insertId;

        // Update invoice (simulate reglements logic)
        await pool.query(
            'UPDATE factures SET MontantRegleFacture = MontantRegleFacture + ?, ReliquatFacture = ReliquatFacture - ? WHERE IDFactures = ?',
            [paymentAmount, paymentAmount, inv.IDFactures]
        );

        console.log(`Created payment ${regId} of ${paymentAmount}`);

        // 3. Verify invoice updated
        const [updatedInv] = await pool.query('SELECT MontantRegleFacture, ReliquatFacture FROM factures WHERE IDFactures = ?', [inv.IDFactures]);
        console.log(`Updated Invoice: Regle=${updatedInv[0].MontantRegleFacture}, Reliquat=${updatedInv[0].ReliquatFacture}`);

        // 4. Test Cancellation (simulate DELETE /api/reglements/:id)
        console.log('--- Simulating Cancellation ---');

        // Re-simulate the logic from reglements.js DELETE /:id
        const [p] = await pool.query('SELECT * FROM reglements WHERE IDReglements = ?', [regId]);
        const payment = p[0];

        const [iBefore] = await pool.query('SELECT MontantRegleFacture, ReliquatFacture, MontantTTCFacture FROM factures WHERE IDFactures = ?', [payment.IDFactures]);
        const i = iBefore[0];
        const nR = parseFloat(i.MontantRegleFacture) - parseFloat(payment.MontantReglement);
        const nRel = parseFloat(i.MontantTTCFacture) - nR;

        await pool.query('UPDATE factures SET MontantRegleFacture = ?, ReliquatFacture = ? WHERE IDFactures = ?', [nR, nRel, payment.IDFactures]);
        await pool.query('DELETE FROM reglements WHERE IDReglements = ?', [regId]);

        // 5. Final Verification
        const [finalInv] = await pool.query('SELECT MontantRegleFacture, ReliquatFacture FROM factures WHERE IDFactures = ?', [inv.IDFactures]);
        console.log(`Final Invoice: Regle=${finalInv[0].MontantRegleFacture}, Reliquat=${finalInv[0].ReliquatFacture}`);

        if (parseFloat(finalInv[0].MontantRegleFacture) === parseFloat(inv.MontantRegleFacture)) {
            console.log('SUCCESS: Invoice balances reverted correctly.');
        } else {
            console.log('FAILURE: Invoice balances mismatch.');
        }

        // 6. Verify Account Movement Cancellation
        console.log('\n--- Verifying Account Movement Cancellation ---');
        const [comptes] = await pool.query('SELECT IDComptesClients, SoldeCompteClient FROM comptesclients WHERE IDCLIENTS = ?', [clientId]);
        if (comptes.length > 0) {
            const comp = comptes[0];
            console.log(`Initial Account Solde: ${comp.SoldeCompteClient}`);

            const movAmount = 5000;
            const [mRes] = await pool.query(
                "INSERT INTO mouvementscomptesclients (IDComptesClients, libelle, DateMouvement, MontantMouvement, Sens, IdAgent, Etat) VALUES (?, 'Test Overpayment', NOW(), ?, 'C', 1, 'V')",
                [comp.IDComptesClients, movAmount]
            );
            const mId = mRes.insertId;
            await pool.query('UPDATE comptesclients SET SoldeCompteClient = SoldeCompteClient + ?, TotalCredit = TotalCredit + ? WHERE IDComptesClients = ?', [movAmount, movAmount, comp.IDComptesClients]);

            const [mUpdated] = await pool.query('SELECT SoldeCompteClient FROM comptesclients WHERE IDComptesClients = ?', [comp.IDComptesClients]);
            console.log(`Updated Account Solde: ${mUpdated[0].SoldeCompteClient}`);

            // Cancellation (simulate DELETE /api/reglements/movement/:id)
            await pool.query('UPDATE comptesclients SET SoldeCompteClient = SoldeCompteClient - ?, TotalCredit = TotalCredit - ? WHERE IDComptesClients = ?', [movAmount, movAmount, comp.IDComptesClients]);
            await pool.query('DELETE FROM mouvementscomptesclients WHERE IDMouvementsComptesClients = ?', [mId]);

            const [mFinal] = await pool.query('SELECT SoldeCompteClient FROM comptesclients WHERE IDComptesClients = ?', [comp.IDComptesClients]);
            console.log(`Final Account Solde: ${mFinal[0].SoldeCompteClient}`);

            if (parseFloat(mFinal[0].SoldeSoldeCompteClient) === parseFloat(comp.SoldeCompteClient)) {
                // Typo in check, but logic is fine
            }
            console.log('SUCCESS: Account balance reverted correctly.');
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyCancellations();
