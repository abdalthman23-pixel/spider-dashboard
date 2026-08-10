const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// 🔴 البيانات الأساسية
const CLIENT_ID = process.env.CLIENT_ID || '1534954572743704717';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://dashbord-46or.onrender.com/auth/discord/callback';
const BOT_API_SECRET = process.env.BOT_API_SECRET || 'SpiderSecretAPIKey12345';

// تحديد مسار مجلد الـ database
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// إعداد Passport
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

app.use(cors());
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
// 🔑 مسارات الدخول
// ==========================================

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

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
            <div style="text-align:center;background:#181824;padding:40px;border-radius:12px;">
                <h1>🕷️ لوحة تحكم Spider Pro</h1>
                <p style="color:#aaa;margin-bottom:30px;">سجل الدخول للتحكم في إعدادات سيرفراتك</p>
                <a href="/auth/discord" style="padding:12px 28px;background:#5865F2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">تسجيل الدخول بواسطة ديسكورد</a>
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
    
    // فلترة السيرفرات التي يملك فيها المستخدم صلاحية أدمن أو إدارة
    const userGuilds = (req.user.guilds || []).filter(g => (g.permissions & 0x8) === 0x8 || (g.permissions & 0x20) === 0x20);

    // قراءة ملف bot_guilds.json من مجلد database
    const botGuildsPath = path.join(dbDir, 'bot_guilds.json');
    let botGuildIds = [];

    if (fs.existsSync(botGuildsPath)) {
        try {
            botGuildIds = JSON.parse(fs.readFileSync(botGuildsPath, 'utf8'));
        } catch (e) {
            console.error("خطأ أثناء قراءة bot_guilds.json:", e);
        }
    }

    const processedGuilds = userGuilds.map(guild => ({
        ...guild,
        hasBot: botGuildIds.includes(guild.id)
    }));

    res.render('dashboard', { 
        user: req.user, 
        guilds: processedGuilds, 
        activeGuildsCount: botGuildIds.length,
        clientId: CLIENT_ID
    });
});

// ==========================================
// 🤖 APIs لربط بيانات البوت والسيرفرات
// ==========================================

// البوت يستدعي هذا API لمزامنة السيرفرات المتواجد بها وحفظها في database/bot_guilds.json
app.post('/api/bot/sync-guilds', (req, res) => {
    if (req.headers['x-api-secret'] !== BOT_API_SECRET) {
        return res.status(403).json({ error: 'غير مصرح' });
    }

    const { guildIds } = req.body;
    if (Array.isArray(guildIds)) {
        fs.writeFileSync(path.join(dbDir, 'bot_guilds.json'), JSON.stringify(guildIds, null, 4));
        console.log(`[داتا] تم تحديث سيرفرات البوت في bot_guilds.json! العدد: ${guildIds.length}`);
        return res.json({ success: true, count: guildIds.length });
    }

    res.status(400).json({ error: 'بيانات غير صحيحة' });
});

// صفحة التحكم لسيرفر محدد
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    const guildId = req.params.guildId;
    
    const userGuild = (req.user.guilds || []).find(g => g.id === guildId);
    if (!userGuild || ((userGuild.permissions & 0x8) !== 0x8 && (userGuild.permissions & 0x20) !== 0x20)) {
        return res.redirect('/dashboard');
    }

    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    let settings = { prefix: '!', autoResponses: [], aliases: {} };

    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            console.error("خطأ قراءة إعدادات السيرفر:", e);
        }
    }
    
    res.render('guild', { user: req.user, guild: userGuild, data: settings });
});

// حفظ إعدادات السيرفر بملف JSON منفصل باسم أيدي السيرفر
app.post('/api/save-settings/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false });
    const guildId = req.params.guildId;
    
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 4));
        console.log(`[داتا] تم حفظ إعدادات السيرفر ${guildId} بنجاح!`);
        res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// البوت يجلب إعدادات أي سيرفر فوراً
app.get('/api/bot/get-settings/:guildId', (req, res) => {
    if (req.headers['x-api-secret'] !== BOT_API_SECRET) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    
    const guildId = req.params.guildId;
    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);

    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return res.json(settings);
        } catch (e) {
            console.error("خطأ قراءة إعدادات السيرفر للبوت:", e);
        }
    }
    
    res.json({ prefix: '!', autoResponses: [], aliases: {} });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 سيرفر الداشبورد يعمل بنجاح على المنفذ ${PORT}`);
});
