const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔴 البيانات الأساسية
const BOT_API_SECRET = process.env.BOT_API_SECRET || 'SpiderSecretAPIKey12345';
const DATABASE_URL = process.env.DATABASE_URL;

// 🔴 إعداد اتصال قاعدة البيانات PostgreSQL
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL ? { rejectUnauthorized: false } : false
});

// إنشاء الجداول تلقائياً عند التشغيل
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(32) PRIMARY KEY,
                prefix VARCHAR(10) DEFAULT '!',
                settings JSONB DEFAULT '{}'::jsonb,
                aliases JSONB DEFAULT '{}'::jsonb,
                autoresponses JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ قاعدة البيانات PostgreSQL جاهزة والمتطلبات مكتملة.");
    } catch (err) {
        console.error("❌ خطأ في إعداد قاعدة البيانات:", err.message);
    }
}
initDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'SpiderSuperSecretSessionKey123',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Config
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    passport.use(new Strategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL || 'https://spider-dashboard.onrender.com/auth/discord/callback',
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => done(null, profile));
    }));
}

// حماية مسارات البوت
function verifyBotSecret(req, res, next) {
    const secret = req.headers['x-bot-secret'];
    if (secret !== BOT_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Bot Secret' });
    }
    next();
}

// ==========================================
// 📌 مسارات البوت (API Endpoints)
// ==========================================

// 1. مزامنة جميع السيرفرات (POST)
app.post('/api/bot/guilds/sync', verifyBotSecret, async (req, res) => {
    const { guildIds } = req.body;
    if (!Array.isArray(guildIds)) {
        return res.status(400).json({ error: 'Invalid guildIds array' });
    }

    try {
        for (const guildId of guildIds) {
            await pool.query(
                `INSERT INTO guilds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
                [guildId]
            );
        }
        console.log(`[DB SYNC] تم مزامنة ${guildIds.length} سيرفر بنجاح.`);
        return res.json({ success: true, count: guildIds.length });
    } catch (err) {
        console.error("❌ خطأ في مزامنة السيرفرات:", err.message);
        return res.status(500).json({ error: 'Database sync error' });
    }
});

// دعم للمسار القديم في حال الطلب برابط مختلف
app.post('/api/bot/sync-guilds', verifyBotSecret, async (req, res) => {
    const { guildIds } = req.body;
    if (!Array.isArray(guildIds)) {
        return res.status(400).json({ error: 'Invalid guildIds array' });
    }
    try {
        for (const guildId of guildIds) {
            await pool.query(
                `INSERT INTO guilds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
                [guildId]
            );
        }
        return res.json({ success: true, count: guildIds.length });
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    }
});

// 2. إدخال سيرفر واحد عند الدخول
app.post('/api/bot/guild', verifyBotSecret, async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'Guild ID required' });

    try {
        await pool.query(
            `INSERT INTO guilds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
            [guildId]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 3. حذف سيرفر عند الخروج
app.delete('/api/bot/guild/:guildId', verifyBotSecret, async (req, res) => {
    const { guildId } = req.params;
    try {
        await pool.query(`DELETE FROM guilds WHERE id = $1`, [guildId]);
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 4. جلب إعدادات سيرفر معين للبوت
app.get('/api/bot/settings/:guildId', verifyBotSecret, async (req, res) => {
    const { guildId } = req.params;
    try {
        const result = await pool.query(`SELECT * FROM guilds WHERE id = $1`, [guildId]);
        if (result.rows.length === 0) {
            return res.json({ settings: {}, aliases: {}, autoresponses: {} });
        }
        const row = result.rows[0];
        return res.json({
            prefix: row.prefix,
            settings: row.settings || {},
            aliases: row.aliases || {},
            autoresponses: row.autoresponses || {}
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🌐 مسارات الموقع والـ OAuth2
// ==========================================

app.get('/', (req, res) => {
    res.send('Spider Dashboard Server is Running!');
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    res.json({ message: "مرحباً بك في لوحة التحكم", user: req.user });
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ: ${PORT}`);
});
