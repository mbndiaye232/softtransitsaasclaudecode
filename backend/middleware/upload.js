const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const createDirIfNotExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

createDirIfNotExists('uploads/societe/logos');
createDirIfNotExists('uploads/dossiers');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/others';

        if (file.fieldname === 'logo') {
            uploadPath = 'uploads/societe/logos';
        } else if (file.fieldname.includes('cachet')) {
            uploadPath = 'uploads/societe/cachets';
        } else if (file.fieldname === 'file') {
            uploadPath = 'uploads/dossiers';
        } else if (file.fieldname === 'justificatif') {
            uploadPath = 'uploads/justificatifs';
        }

        createDirIfNotExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: fieldname-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    console.log(`[Multer Filter] Incoming file: fieldname=${file.fieldname}, originalname=${file.originalname}, mimetype=${file.mimetype}`);
    
    // Accept images and documents (case-insensitive)
    if (!file.originalname || !file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|zip|txt)$/i)) {
        console.error(`[Multer Filter] Rejected file: ${file.originalname}`);
        return cb(new Error('Only image and document files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;
