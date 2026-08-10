const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// المفاتيح
const CLIENT_ID = process.env.CLIENT_ID || '1534954572743704717';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'G3NTaJvG35Dwa6_IqMtSs0IkS9Nt-D1E';
const BOT_TOKEN = process.env.BOT_TOKEN || 'MTUzNDk1NDU3Mjc0MzcwNDcxNw.GzvmkW.E1aj7gnwRQrft-bI7-H3JDmb-GVO2jdRBGiFBY'; 
const CALLBACK_URL = 'https://dashbord-46or.onrender.com/auth/discord/callback';

// ذاكرة مؤقتة للإعدادات لتفادي مسح البيانات عند إعادة التشغيل
const memoryDb = {};

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

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
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

app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    // فلترة السيرفرات التي يمتلك فيها المستخدم صلاحيات أدمن (ADMINISTRATOR أو MANAGE_GUILD)
    const userGuilds = (req.user.guilds || []).filter(g => (g.permissions & 0x8) === 0x8 || (g.permissions & 0x20) === 0x20);

    let botGuildIds = [];
    const token = BOT_TOKEN || process.env.BOT_TOKEN;

    if (token) {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                headers: { Authorization: `Bot ${token.trim()}` }
            });
            if (response.ok) {
                const botGuilds = await response.json();
                botGuildIds = botGuilds.map(g => g.id);
            }
        } catch (err) {
            console.error("خطأ في الاتصال بديسكورد:", err);
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
        userBalance: 0, 
        userRank: 'غير مصنف' 
    });
});

// صفحة التحكم في سيرفر معين
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    const guildId = req.params.guildId;
    
    const guildData = memoryDb[guildId] || { prefix: '!', autoResponses: [], aliases: {} };
    res.render('guild', { user: req.user, guildId, data: guildData });
});

// API لحفظ الإعدادات من قبل المستخدم في الداشبورد
app.post('/api/save-settings/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false });
    const guildId = req.params.guildId;
    
    memoryDb[guildId] = req.body;
    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح!' });
});

// API للبوت يجلب منه التحديثات فوراً
app.get('/api/bot/get-settings/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    res.json(memoryDb[guildId] || {});
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 سيرفر الداشبورد شغال رسمياً على المنفذ ${PORT}`);
});
