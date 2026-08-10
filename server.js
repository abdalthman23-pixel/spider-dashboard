const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// 🔴 البيانات الأساسية
const CLIENT_ID = process.env.CLIENT_ID || '1534954572743704717';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://dashbord-46or.onrender.com/auth/discord/callback';
const BOT_API_SECRET = 'SpiderSecretAPIKey12345';

// تحديد مسار مجلد الداتا الخارجي (database)
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// إعداد المصادقة بـ Discord OAuth2
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

// إعدادات Middleware
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

// ==========================================
// 🔑 مسارات الدخول والخروج
// ==========================================

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
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
// 📊 الداشبورد الرئيسي
// ==========================================

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    // 1. فلترة سيرفرات المستخدم (صلاحيات أدمن/إدارة)
    const userGuilds = (req.user.guilds || []).filter(g => (g.permissions & 0x8) === 0x8 || (g.permissions & 0x20) === 0x20);

    // 2. قراءة ملف bot_guilds.json من مجلد database
    const botGuildsPath = path.join(dbDir, 'bot_guilds.json');
    let botGuildIds = [];

    if (fs.existsSync(botGuildsPath)) {
        try {
            botGuildIds = JSON.parse(fs.readFileSync(botGuildsPath, 'utf8'));
        } catch (e) {
            console.error("خطأ أثناء قراءة ملف bot_guilds.json:", e);
        }
    }

    // 3. تحديد وجود البوت في سيرفرات المستخدم
    const processedGuilds = userGuilds.map(guild => ({
        ...guild,
        hasBot: botGuildIds.includes(guild.id)
    }));

    res.render('dashboard', { 
        user: req.user, 
        guilds: processedGuilds, 
        activeGuildsCount: botGuildIds.length,
        userBalance: 0, 
        userRank: 'غير مصنف' 
    });
});

// ==========================================
// 🤖 API لمزامنة البوت والداتا
// ==========================================

// البوت يستدعي هذا المسار ليرسل قائمة السيرفرات المتواجد فيها
app.post('/api/bot/sync-guilds', (req, res) => {
    if (req.headers['x-api-secret'] !== BOT_API_SECRET) {
        return res.status(403).json({ error: 'غير مصرح' });
    }

    const { guildIds } = req.body;
    if (Array.isArray(guildIds)) {
        fs.writeFileSync(path.join(dbDir, 'bot_guilds.json'), JSON.stringify(guildIds, null, 4));
        console.log(`[داتا] تم تحديث قائمة سيرفرات البوت بنجاح! العدد الحالي: ${guildIds.length}`);
        return res.json({ success: true, count: guildIds.length });
    }

    res.status(400).json({ error: 'بيانات غير صحيحة' });
});

// صفحة التحكم لسيرفر محدد
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    const guildId = req.params.guildId;
    
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    let settings = { prefix: '!', autoResponses: [], aliases: {} };

    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            console.error(`خطأ في قراءة داتا السيرفر ${guildId}:`, e);
        }
    }
    
    res.render('guild', { user: req.user, guildId, data: settings });
});

// حفظ إعدادات سيرفر محدد في داتا منفصلة (JSON)
app.post('/api/save-settings/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false });
    const guildId = req.params.guildId;
    
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 4));
    
    console.log(`[داتا] تم حفظ إعدادات السيرفر ${guildId} بملف مستقل!`);
    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح!' });
});

// البوت يقرأ منه إعدادات السيرفر فوراً
app.get('/api/bot/get-settings/:guildId', (req, res) => {
    if (req.headers['x-api-secret'] !== BOT_API_SECRET) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    
    const guildId = req.params.guildId;
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);

    if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return res.json(settings);
    }
    
    res.json({ prefix: '!', autoResponses: [], aliases: {} });
});

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 سيرفر الداشبورد يعمل بنجاح على المنفذ ${PORT}`);
});
