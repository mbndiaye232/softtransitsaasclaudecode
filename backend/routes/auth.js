const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const {
    hashPassword,
    comparePassword,
    generateToken,
    generateResetToken,
    validateEmail,
    validatePassword
} = require('../utils/auth');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new company (structur) with admin user
 */
router.post('/register', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            // Company info
            companyName,
            companyEmail,
            companyAddress,
            companyPhone,
            countryId,
            // Admin user info
            adminName,
            adminEmail,
            adminLogin,
            adminPassword
        } = req.body;

        // Validation
        if (!companyName || !companyEmail || !adminName || !adminEmail || !adminLogin || !adminPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!validateEmail(companyEmail) || !validateEmail(adminEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const passwordValidation = validatePassword(adminPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        await connection.beginTransaction();

        // Check if company email or login already exists
        const [existingCompany] = await connection.query(
            'SELECT IDSociete FROM structur WHERE Emailstructur = ?',
            [companyEmail]
        );

        if (existingCompany.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Company email already registered' });
        }

        const [existingUser] = await connection.query(
            'SELECT IDAgents FROM Agents WHERE Login = ? OR Email = ?',
            [adminLogin, adminEmail]
        );

        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Login or email already exists' });
        }

        // Create company (structur)
        const [companyResult] = await connection.query(
            `INSERT INTO structur (
        NomSociete, 
        Emailstructur, 
        adrSociete, 
        telSociete,
        IDPays,
        credit_balance,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 50, 1, NOW())`,
            [companyName, companyEmail, companyAddress || '', companyPhone || '', countryId || null]
        );

        const structurId = companyResult.insertId;

        // Hash password
        const passwordHash = await hashPassword(adminPassword);

        // Create admin user
        const [userResult] = await connection.query(
            `INSERT INTO Agents (
        structur_id,
        NomAgent,
        Email,
        Login,
        password_hash,
        role,
        is_active
      ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 1)`,
            [structurId, adminName, adminEmail, adminLogin, passwordHash]
        );

        await connection.commit();

        // Generate token
        const token = generateToken(userResult.insertId, structurId, 'ADMIN');

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: userResult.insertId,
                name: adminName,
                email: adminEmail,
                login: adminLogin,
                role: 'ADMIN',
                structur_id: structurId
            },
            company: {
                id: structurId,
                name: companyName,
                email: companyEmail
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    } finally {
        connection.release();
    }
});

/**
 * POST /api/auth/login
 * Login with email/login and password
 */
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password are required' });
        }

        // Find user by login or email
        const [users] = await pool.query(
            `SELECT 
        a.IDAgents as id,
        a.structur_id,
        a.NomAgent as name,
        a.Email as email,
        a.Login as login,
        a.password_hash,
        a.role,
        a.is_active,
        a.two_factor_enabled,
        s.NomSociete as company_name,
        s.is_active as company_active
      FROM Agents a
      JOIN structur s ON a.structur_id = s.IDSociete
      WHERE (a.Login = ? OR a.Email = ?)`,
            [login, login]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if user and company are active
        if (!user.is_active) {
            return res.status(403).json({ error: 'User account is inactive' });
        }

        if (!user.company_active) {
            return res.status(403).json({ error: 'Company account is inactive' });
        }

        // Verify password
        const passwordMatch = await comparePassword(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE Agents SET last_login = NOW() WHERE IDAgents = ?',
            [user.id]
        );

        // Generate token
        const token = generateToken(user.id, user.structur_id, user.role);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                login: user.login,
                role: user.role,
                structur_id: user.structur_id,
                company_name: user.company_name,
                two_factor_enabled: user.two_factor_enabled
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT 
        a.IDAgents as id,
        a.structur_id,
        a.NomAgent as name,
        a.Email as email,
        a.Login as login,
        a.role,
        a.FonctionAgent as "function",
        a.Tel as phone,
        a.two_factor_enabled,
        s.NomSociete as company_name,
        s.credit_balance,
        s.Emailstructur as company_email
      FROM Agents a
      JOIN structur s ON a.structur_id = s.IDSociete
      WHERE a.IDAgents = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error('Get user error:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to get user info', details: error.message });
    }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const [users] = await pool.query(
            'SELECT IDAgents, NomAgent, Email FROM Agents WHERE Email = ? AND is_active = 1',
            [email]
        );

        // Always return success to prevent email enumeration
        if (users.length === 0) {
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }

        const user = users[0];
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save reset token
        await pool.query(
            'UPDATE Agents SET reset_token = ?, reset_token_expires = ? WHERE IDAgents = ?',
            [resetToken, expiresAt, user.IDAgents]
        );

        // TODO: Send email with reset link
        // For now, we'll just log it (in production, use nodemailer)
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log(`Password reset link for ${user.Email}: ${resetLink}`);

        res.json({
            message: 'If the email exists, a reset link has been sent',
            // Remove this in production:
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        // Find user with valid token
        const [users] = await pool.query(
            `SELECT IDAgents, Email 
       FROM Agents 
       WHERE reset_token = ? 
       AND reset_token_expires > NOW() 
       AND is_active = 1`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = users[0];

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password and clear reset token
        await pool.query(
            `UPDATE Agents 
       SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE IDAgents = ?`,
            [passwordHash, user.IDAgents]
        );

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
