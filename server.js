const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// 🔴 المفاتيح الأساسية
const CLIENT_ID = process.env.CLIENT_ID || '1534954572743704717';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'G3NTaJvG35Dwa6_IqMtSs0IkS9Nt-D1E';
const BOT_TOKEN = process.env.BOT_TOKEN || 'MTUzNDk1NDU3Mjc0MzcwNDcxNw.GzvmkW.E1aj7gnwRQrft-bI7-H3JDmb-GVO2jdRBGiFBY'; 
const CALLBACK_URL = 'https://dashbord-46or.onrender.com/auth/discord/callback';
const BOT_API_SECRET = 'SpiderSecretAPIKey12345';

// إعداد المصادقة عبر ديسكورد
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

// إعدادات Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'SpiderProDashboardSecretKey9988',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// إنشاء مجلد قاعدة البيانات المحلية
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ==========================================
// 🔑 مسارات الدخول والتسجيل
// ==========================================

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
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
                <a href="/auth/discord" style="padding:12px 28px;background:#5865F2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">تسجيل الدخول بواسطة ديسكورد</a>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// 📊 مسارات لوحة التحكم (Dashboard)
// ==========================================

app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    // 1. فلترة سيرفرات المستخدم
    const userGuilds = (req.user.guilds || []).filter(g => (g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8);

    // 2. جلب قائمة السيرفرات التي ينتمي إليها البوت عبر Discord API
    let botGuildIds = [];
    try {
        const tokenToUse = BOT_TOKEN || process.env.BOT_TOKEN;
        if (tokenToUse) {
            const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                headers: { Authorization: `Bot ${tokenToUse.trim()}` }
            });
            if (response.ok) {
                const botGuilds = await response.json();
                botGuildIds = botGuilds.map(g => g.id);
            }
        }
    } catch (err) {
        console.error("خطأ في جلب سيرفرات البوت:", err);
    }

    // 3. مطابقة السيرفرات
    const processedGuilds = userGuilds.map(guild => {
        return {
            ...guild,
            hasBot: botGuildIds.includes(guild.id)
        };
    });

    const activeGuildsCount = botGuildIds.length;

    // 4. جلب بيانات الاقتصاد والترتيب
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
        guilds: processedGuilds, 
        activeGuildsCount,
        userBalance, 
        userRank 
    });
});

// صفحة إدارة سيرفر معين
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    const guildId = req.params.guildId;

    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);
    const autoRespPath = path.join(dbDir, `${guildId}_autoresponses.json`);

    let settings = {};
    let aliases = {};
    let autoresponses = {};

    if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (fs.existsSync(aliasesPath)) aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
    if (fs.existsSync(autoRespPath)) autoresponses = JSON.parse(fs.readFileSync(autoRespPath, 'utf8'));

    res.render('guild', { user: req.user, guildId, settings, aliases, autoresponses });
});

// حفظ الإعدادات
app.post('/api/save-all/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const guildId = req.params.guildId;
    const { settings, aliases, autoresponses } = req.body;

    try {
        if (settings) fs.writeFileSync(path.join(dbDir, `${guildId}_settings.json`), JSON.stringify(settings, null, 4));
        if (aliases) fs.writeFileSync(path.join(dbDir, `${guildId}_aliases.json`), JSON.stringify(aliases, null, 4));
        if (autoresponses) fs.writeFileSync(path.join(dbDir, `${guildId}_autoresponses.json`), JSON.stringify(autoresponses, null, 4));

        res.json({ success: true, message: 'تم حفظ جميع الإعدادات بنجاح!' });
    } catch (err) {
        console.error("خطأ أثناء حفظ البيانات:", err);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الحفظ' });
    }
});

// ==========================================
// 🤖 API الخاص بالبوت
// ==========================================

app.get('/api/bot/settings/:guildId', (req, res) => {
    const authHeader = req.headers['x-api-secret'];
    if (authHeader !== BOT_API_SECRET && req.query.secret !== BOT_API_SECRET) {
        return res.status(403).json({ error: 'غير مصرح' });
    }

    const guildId = req.params.guildId;
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);
    const autoRespPath = path.join(dbDir, `${guildId}_autoresponses.json`);

    const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
    const aliases = fs.existsSync(aliasesPath) ? JSON.parse(fs.readFileSync(aliasesPath, 'utf8')) : {};
    const autoresponses = fs.existsSync(autoRespPath) ? JSON.parse(fs.readFileSync(autoRespPath, 'utf8')) : {};

    res.json({ guildId, settings, aliases, autoresponses });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 سيرفر الداشبورد يعمل بنجاح على المنفذ ${PORT}`);
});
