const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const {
    initDatabase,
    syncGuilds,
    addGuild,
    removeGuild,
    getGuilds
} = require('./database/db');

const app = express();
const PORT = process.env.PORT || 10000;

// 🔑 المتغيرات السرية من Environment Variables
const CLIENT_ID = process.env.CLIENT_ID || '1534954572743704717';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://spider-dashboard.onrender.com/auth/discord/callback';
const BOT_API_SECRET = process.env.BOT_API_SECRET || 'SpiderSecretAPIKey12345';

// Discord OAuth2
passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Express Configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'SpiderProDashboardSecretKey9988',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// التأكد من وجود مجلد الداتا المحلي للملفات الإضافية
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Middleware لحماية الـ APIs الخاصة بالبوت
const verifyBotSecret = (req, res, next) => {
    const secret = req.headers['x-bot-secret'] || req.headers['x-api-secret'] || req.query.secret;
    if (secret !== BOT_API_SECRET) {
        return res.status(403).json({ success: false, error: 'غير مصرح للبوت بالوصول' });
    }
    next();
};

// ==========================================
// 🔑 مسارات المصادقة (Authentication)
// ==========================================

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>Spider Pro - Dashboard</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0f0f15;color:#fff;font-family:sans-serif;">
            <div style="text-align:center;background:#181824;padding:40px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                <h1>🕷️ لوحة تحكم Spider Pro</h1>
                <p style="color:#aaa;margin-bottom:30px;">قم بتسجيل الدخول للتحكم في إعدادات السيرفر والردود والاختصارات</p>
                <a href="/auth/discord" style="padding:12px 28px;background:#5865F2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                    تسجيل الدخول بواسطة ديسكورد
                </a>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// 📊 صفحة الداشبورد (Dashboard Route)
// ==========================================

app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    // فلترة السيرفرات التي يملك فيها المستخدم صلاحية أدمن أو إدارة
    const userGuildsRaw = (req.user.guilds || []).filter(g =>
        (g.permissions & 0x20) === 0x20 ||
        (g.permissions & 0x8) === 0x8
    );

    // جلب السيرفرات المتواجد بها البوت من قاعدة بيانات PostgreSQL (Neon)
    let botGuildIds = [];
    try {
        botGuildIds = await getGuilds();
    } catch (err) {
        console.error("❌ خطأ أثناء جلب سيرفرات البوت من PostgreSQL:", err);
    }

    // تعيين المتغير botInstalled ليعرف ملف الـ EJS حالة السيرفر
    const userGuilds = userGuildsRaw.map(guild => ({
        ...guild,
        botInstalled: botGuildIds.includes(guild.id)
    }));

    // قراءة نظام الاقتصاد بدون أي تعديل أو تخريب
    const ecoPath = path.join(dbDir, 'economy.json');
    let userBalance = 0;
    let userRank = 'غير مصنف';

    if (fs.existsSync(ecoPath)) {
        try {
            const ecoDb = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
            let allUsers = [];

            for (const [gId, members] of Object.entries(ecoDb)) {
                for (const [mId, bal] of Object.entries(members)) {
                    allUsers.push({ userId: mId, balance: bal });
                }
            }

            allUsers.sort((a, b) => b.balance - a.balance);
            const foundIndex = allUsers.findIndex(u => u.userId === req.user.id);

            if (foundIndex !== -1) {
                userRank = foundIndex + 1;
                userBalance = allUsers[foundIndex].balance;
            }
        } catch (e) {
            console.error("خطأ في قراءة ملف الاقتصاد:", e);
        }
    }

    res.render('dashboard', {
        user: req.user,
        guilds: userGuilds,
        userBalance,
        userRank,
        clientId: CLIENT_ID
    });
});

// صفحة التحكم لسيرفر محدد
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    const guildId = req.params.guildId;
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);
    const autoRespPath = path.join(dbDir, `${guildId}_autoresponses.json`);

    let settings = {};
    let aliases = {};
    let autoresponses = {};

    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    if (fs.existsSync(aliasesPath)) {
        aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
    }
    if (fs.existsSync(autoRespPath)) {
        autoresponses = JSON.parse(fs.readFileSync(autoRespPath, 'utf8'));
    }

    res.render('guild', {
        user: req.user,
        guildId,
        settings,
        aliases,
        autoresponses
    });
});

// حفظ إعدادات السيرفر
app.post('/api/save-all/:guildId', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح'
        });
    }

    const guildId = req.params.guildId;
    const { settings, aliases, autoresponses } = req.body;

    try {
        if (settings) {
            fs.writeFileSync(
                path.join(dbDir, `${guildId}_settings.json`),
                JSON.stringify(settings, null, 4)
            );
        }
        if (aliases) {
            fs.writeFileSync(
                path.join(dbDir, `${guildId}_aliases.json`),
                JSON.stringify(aliases, null, 4)
            );
        }
        if (autoresponses) {
            fs.writeFileSync(
                path.join(dbDir, `${guildId}_autoresponses.json`),
                JSON.stringify(autoresponses, null, 4)
            );
        }

        console.log(`[إعدادات] تم التحديث للسيرفر: ${guildId}`);
        res.json({
            success: true,
            message: 'تم حفظ جميع الإعدادات بنجاح!'
        });
    } catch (err) {
        console.error("خطأ أثناء حفظ البيانات:", err);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الحفظ'
        });
    }
});

// ==========================================
// 🤖 APIs البوت لإدارة السيرفرات في PostgreSQL
// ==========================================

// 1. مزامنة جميع السيرفرات
app.post('/api/bot/guilds/sync', verifyBotSecret, async (req, res) => {
    const { guildIds } = req.body;
    if (!Array.isArray(guildIds)) {
        return res.status(400).json({ success: false, message: 'مصفوفة guildIds مطلوبة' });
    }

    try {
        await syncGuilds(guildIds);
        res.json({ success: true, count: guildIds.length });
    } catch (err) {
        console.error("❌ خطأ أثناء مزامنة السيرفرات:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. إضافة سيرفر فردي عند الانضمام
app.post('/api/bot/guild', verifyBotSecret, async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) {
        return res.status(400).json({ success: false, message: 'guildId مطلوب' });
    }

    try {
        await addGuild(guildId);
        console.log(`[PostgreSQL] ➕ تم إضافة السيرفر: ${guildId}`);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ خطأ إضافة السيرفر:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. حذف سيرفر فردي عند المغادرة
app.delete('/api/bot/guild/:guildId', verifyBotSecret, async (req, res) => {
    const { guildId } = req.params;

    try {
        await removeGuild(guildId);
        console.log(`[PostgreSQL] ➖ تم حذف السيرفر: ${guildId}`);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ خطأ حذف السيرفر:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API قراءة الإعدادات القديم الخاص بالبوت
app.get('/api/bot/settings/:guildId', (req, res) => {
    const authHeader = req.headers['x-api-secret'] || req.headers['x-bot-secret'];

    if (authHeader !== BOT_API_SECRET && req.query.secret !== BOT_API_SECRET) {
        return res.status(403).json({
            error: 'غير مصرح للبوت بقراءة البيانات'
        });
    }

    const guildId = req.params.guildId;
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);
    const autoRespPath = path.join(dbDir, `${guildId}_autoresponses.json`);

    const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
    const aliases = fs.existsSync(aliasesPath) ? JSON.parse(fs.readFileSync(aliasesPath, 'utf8')) : {};
    const autoresponses = fs.existsSync(autoRespPath) ? JSON.parse(fs.readFileSync(autoRespPath, 'utf8')) : {};

    res.json({
        guildId,
        settings,
        aliases,
        autoresponses
    });
});

// تشغيل وقارئ قاعدة بيانات PostgreSQL
initDatabase()
    .then(() => {
        console.log('✅ PostgreSQL connected successfully');
    })
    .catch(error => {
        console.error('❌ PostgreSQL connection failed:', error);
    });

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🌐 سيرفر الداشبورد يعمل بنجاح على Render!');
    console.log(`📡 المنفذ الحالي: ${PORT}`);
    console.log('=================================');
});
