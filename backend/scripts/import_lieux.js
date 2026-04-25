const pool = require('../config/database');

const lieuxData = [
    { IDLieux: 111, NomLieu: 'Port de Ningbo-Zhoushan', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 112, NomLieu: 'Port de Shanghai', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 113, NomLieu: 'Port de Singapour', TypeLieu: 'Port', IDPays: 196 },
    { IDLieux: 114, NomLieu: 'Port de Tianjin', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 115, NomLieu: 'Port de Taicangn 3', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 116, NomLieu: 'Port de Tangshan', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 117, NomLieu: 'Port de Tsingtao (Qingdao)', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 118, NomLieu: 'Port de Canton (Guangzhou)', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 119, NomLieu: 'Port de Rotterdam', TypeLieu: 'Port', IDPays: 150 },
    { IDLieux: 120, NomLieu: 'Port de Port Hedlandn 4', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 121, NomLieu: 'Port de Dalian', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 122, NomLieu: 'Port de Rizhao', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 123, NomLieu: 'Port de Yingkou', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 124, NomLieu: 'Port de Busan', TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 125, NomLieu: 'Port de la Louisiane du Sud', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 126, NomLieu: 'Port de Hong Kong', TypeLieu: 'Port', IDPays: 100 },
    { IDLieux: 127, NomLieu: 'Port de Gwangyang', TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 128, NomLieu: 'Port de Qinhuangdao', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 129, NomLieu: 'Port Kelang', TypeLieu: 'Port', IDPays: 132 },
    { IDLieux: 130, NomLieu: 'Port de Shenzhen', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 131, NomLieu: 'Port de Xiamen', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 132, NomLieu: 'Port de Houston', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 133, NomLieu: "Port d'Anvers", TypeLieu: 'Port', IDPays: 18 },
    { IDLieux: 134, NomLieu: 'Port de Nagoya', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 135, NomLieu: "Port d'Ulsan", TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 136, NomLieu: 'Port de Dubaï', TypeLieu: 'Port', IDPays: 218 },
    { IDLieux: 137, NomLieu: 'Port de Dampier', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 138, NomLieu: 'Port de Chiba', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 139, NomLieu: 'Port de Newcastle', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 140, NomLieu: "Port d'Inchon", TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 141, NomLieu: 'Port de Yantian', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 142, NomLieu: "Port d'Itaqui", TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 143, NomLieu: 'Port Metro Vancouver', TypeLieu: 'Port', IDPays: 37 },
    { IDLieux: 144, NomLieu: 'Port de Hambourg', TypeLieu: 'Port', IDPays: 84 },
    { IDLieux: 145, NomLieu: 'Port de Tubarão', TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 146, NomLieu: 'Port de Tanjung Pelepas', TypeLieu: 'Port', IDPays: 132 },
    { IDLieux: 147, NomLieu: 'Port de Novorossiysk', TypeLieu: 'Port', IDPays: 182 },
    { IDLieux: 148, NomLieu: 'Port de Santos', TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 149, NomLieu: 'Port de Hay Point', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 150, NomLieu: 'Port de New York/New Jersey', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 151, NomLieu: 'Port de Yokohama', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 152, NomLieu: 'Port de Kaohsiung', TypeLieu: 'Port', IDPays: 45 },
    { IDLieux: 153, NomLieu: 'Port de Sepetiba/Itaguaí', TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 154, NomLieu: 'Port de Gladstone', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 155, NomLieu: 'Port de Richards Bay', TypeLieu: 'Port', IDPays: 201 },
    { IDLieux: 156, NomLieu: 'Port de Kitakyushu', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 157, NomLieu: "Port d'Amsterdam", TypeLieu: 'Port', IDPays: 150 },
    { IDLieux: 158, NomLieu: 'Port de Kobe', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 159, NomLieu: 'Port de Hô-Chi-Minh-Ville (Saigon)', TypeLieu: 'Port', IDPays: 198 },
    { IDLieux: 160, NomLieu: "Port d'Algésiras La Linea", TypeLieu: 'Port', IDPays: 203 },
    { IDLieux: 161, NomLieu: "Port d'Oust-Louga", TypeLieu: 'Port', IDPays: 182 },
    { IDLieux: 162, NomLieu: 'Port de Tokyo', TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 163, NomLieu: 'Port de Marseille', TypeLieu: 'Port', IDPays: 75 },
    { IDLieux: 164, NomLieu: "Port d'Osaka", TypeLieu: 'Port', IDPays: 112 },
    { IDLieux: 165, NomLieu: 'Port de La Nouvelle-Orléans', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 166, NomLieu: 'Port de Beaumont', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 167, NomLieu: 'Port de Botas (Ceyhan)', TypeLieu: 'Port', IDPays: 220 },
    { IDLieux: 168, NomLieu: 'Port de Corpus Christi', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 169, NomLieu: 'Port de Paradip', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 170, NomLieu: 'Port de Taichung', TypeLieu: 'Port', IDPays: 45 },
    { IDLieux: 171, NomLieu: 'Port de Bremerhaven', TypeLieu: 'Port', IDPays: 84 },
    { IDLieux: 172, NomLieu: 'Port de Laem Chabang', TypeLieu: 'Port', IDPays: 213 },
    { IDLieux: 173, NomLieu: 'Port de Jubail', TypeLieu: 'Port', IDPays: 192 },
    { IDLieux: 174, NomLieu: 'Port de Saldanha Bay', TypeLieu: 'Port', IDPays: 201 },
    { IDLieux: 175, NomLieu: 'Port de Long Beach', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 176, NomLieu: 'Port de Valence', TypeLieu: 'Port', IDPays: 203 },
    { IDLieux: 177, NomLieu: 'Port de Daesan', TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 178, NomLieu: 'Port du Havre', TypeLieu: 'Port', IDPays: 75 },
    { IDLieux: 179, NomLieu: 'Port de Bandar Abbas', TypeLieu: 'Port', IDPays: 105 },
    { IDLieux: 180, NomLieu: 'Port de Yanbu', TypeLieu: 'Port', IDPays: 192 },
    { IDLieux: 181, NomLieu: "Port d'Izmit", TypeLieu: 'Port', IDPays: 220 },
    { IDLieux: 182, NomLieu: 'Port de Visakhapatnam', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 183, NomLieu: 'Port de Jawaharlal Nehru (Nhava Sheva près de Bombay)', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 184, NomLieu: 'Port de Bâton-Rouge', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 185, NomLieu: 'Port de Mumbai (Bombay)', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 186, NomLieu: 'Port de Primorsk', TypeLieu: 'Port', IDPays: 182 },
    { IDLieux: 187, NomLieu: 'Port de Grimsby/Immingham', TypeLieu: 'Port', IDPays: 228 },
    { IDLieux: 188, NomLieu: 'Port de Manille', TypeLieu: 'Port', IDPays: 172 },
    { IDLieux: 189, NomLieu: 'Port de Trieste', TypeLieu: 'Port', IDPays: 109 },
    { IDLieux: 190, NomLieu: 'Port de Constan?a', TypeLieu: 'Port', IDPays: 181 },
    { IDLieux: 191, NomLieu: 'Port de Chittagong', TypeLieu: 'Port', IDPays: 15 },
    { IDLieux: 192, NomLieu: 'Port de Los Angeles', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 193, NomLieu: 'Port de Djeddah', TypeLieu: 'Port', IDPays: 192 },
    { IDLieux: 194, NomLieu: 'Port de Mobile', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 195, NomLieu: 'Port de Hampton Roads', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 196, NomLieu: 'Port de Saint-Pétersbourg', TypeLieu: 'Port', IDPays: 182 },
    { IDLieux: 197, NomLieu: 'Port de Lake Charles', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 198, NomLieu: 'Port de Pohang', TypeLieu: 'Port', IDPays: 117 },
    { IDLieux: 199, NomLieu: 'Port de Chennai (Madras)', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 200, NomLieu: 'Port de Gênes', TypeLieu: 'Port', IDPays: 109 },
    { IDLieux: 201, NomLieu: 'Port de Calcutta', TypeLieu: 'Port', IDPays: 103 },
    { IDLieux: 202, NomLieu: 'Port de Karachi', TypeLieu: 'Port', IDPays: 167 },
    { IDLieux: 203, NomLieu: "Port d'Alexandrie et d'el-Dekheila", TypeLieu: 'Port', IDPays: 227 },
    { IDLieux: 204, NomLieu: 'Port de São Sebastião (Almirante Barroso)', TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 205, NomLieu: 'Port de Tanjung Priok', TypeLieu: 'Port', IDPays: 104 },
    { IDLieux: 206, NomLieu: 'Port de Colombo', TypeLieu: 'Port', IDPays: 41 },
    { IDLieux: 207, NomLieu: "Port d'Aliaga (Izmir)", TypeLieu: 'Port', IDPays: 220 },
    { IDLieux: 208, NomLieu: 'Port de Plaquemine', TypeLieu: 'Port', IDPays: 231 },
    { IDLieux: 209, NomLieu: 'Port de Youjne (Odessa)', TypeLieu: 'Port', IDPays: 225 },
    { IDLieux: 210, NomLieu: 'Port de Brisbane', TypeLieu: 'Port', IDPays: 11 },
    { IDLieux: 211, NomLieu: 'Port de Dunkerque', TypeLieu: 'Port', IDPays: 75 },
    { IDLieux: 212, NomLieu: 'Port de Barcelone', TypeLieu: 'Port', IDPays: 203 },
    { IDLieux: 213, NomLieu: 'Port de Bintulu', TypeLieu: 'Port', IDPays: 132 },
    { IDLieux: 214, NomLieu: 'Port de Paranaguá', TypeLieu: 'Port', IDPays: 25 },
    { IDLieux: 215, NomLieu: 'Port de Londres', TypeLieu: 'Port', IDPays: 228 },
    { IDLieux: 216, NomLieu: 'Port de Bandar Khomeini', TypeLieu: 'Port', IDPays: 105 },
    { IDLieux: 217, NomLieu: 'Port de Bergen', TypeLieu: 'Port', IDPays: 161 },
    { IDLieux: 218, NomLieu: 'Port de Callao', TypeLieu: 'Port', IDPays: 171 },
    { IDLieux: 219, NomLieu: 'Port de Dakar', TypeLieu: 'Port', IDPays: 193 },
    { IDLieux: 222, NomLieu: 'Port de NDAYANE', TypeLieu: 'Port', IDPays: 193 },
    { IDLieux: 223, NomLieu: 'Port de Ziguinchor', TypeLieu: 'Port', IDPays: 193 },
    { IDLieux: 224, NomLieu: 'Aéroport de St Louis', TypeLieu: 'Aéroport', IDPays: 193 },
    { IDLieux: 225, NomLieu: 'KAKINADA CASABLANCA', TypeLieu: 'Port', IDPays: 144 },
    { IDLieux: 226, NomLieu: 'AIBD', TypeLieu: 'Aéroport', IDPays: 193 },
    { IDLieux: 227, NomLieu: 'ROISSY CDG', TypeLieu: 'Aéroport', IDPays: 75 },
    { IDLieux: 228, NomLieu: 'Antewerp', TypeLieu: 'Port', IDPays: 18 },
    { IDLieux: 229, NomLieu: 'Fos sur mer', TypeLieu: 'Port', IDPays: 75 },
    { IDLieux: 230, NomLieu: "Port d'Abidjan", TypeLieu: 'Port', IDPays: 110 },
    { IDLieux: 231, NomLieu: 'BILBAO', TypeLieu: 'Port', IDPays: 203 },
    { IDLieux: 232, NomLieu: 'GOTEBORG', TypeLieu: 'Port', IDPays: 209 },
    { IDLieux: 233, NomLieu: 'BRUSSEL', TypeLieu: 'Aéroport', IDPays: 18 },
    { IDLieux: 234, NomLieu: 'LIEU DE DEPART', TypeLieu: 'Gare', IDPays: 193 },
    { IDLieux: 235, NomLieu: 'LIEU DE DESTINATION', TypeLieu: 'Lieu de débarquement', IDPays: 134 },
    { IDLieux: 236, NomLieu: 'LIEU DE DEPART', TypeLieu: 'Gare', IDPays: 150 },
    { IDLieux: 237, NomLieu: 'LIEU D ARRIVE', TypeLieu: 'Gare', IDPays: 193 },
    { IDLieux: 238, NomLieu: 'ROUEN', TypeLieu: 'Port', IDPays: 75 },
    { IDLieux: 262, NomLieu: 'SHANGHAI', TypeLieu: 'Port', IDPays: 44 },
    { IDLieux: 289, NomLieu: 'DAKAR', TypeLieu: 'Port', IDPays: 193 },
    { IDLieux: 298, NomLieu: 'CASABLANCA', TypeLieu: 'Port', IDPays: 144 }
];

async function importLieux() {
    try {
        console.log('--- Starting Lieux Import ---');

        // Clear or update ? The user wants to "mettre dans la table", let's use UPSERT logic
        for (const lieu of lieuxData) {
            const [existing] = await pool.query('SELECT IDLieux FROM lieux WHERE IDLieux = ?', [lieu.IDLieux]);

            if (existing.length > 0) {
                await pool.query(
                    'UPDATE lieux SET NomLieu = ?, TypeLieu = ?, IDPays = ? WHERE IDLieux = ?',
                    [lieu.NomLieu, lieu.TypeLieu, lieu.IDPays, lieu.IDLieux]
                );
            } else {
                await pool.query(
                    'INSERT INTO lieux (IDLieux, NomLieu, TypeLieu, IDPays) VALUES (?, ?, ?, ?)',
                    [lieu.IDLieux, lieu.NomLieu, lieu.TypeLieu, lieu.IDPays]
                );
            }
        }

        console.log(`Successfully imported/updated ${lieuxData.length} locations.`);
        process.exit(0);
    } catch (error) {
        console.error('Import error:', error);
        process.exit(1);
    }
}

importLieux();
