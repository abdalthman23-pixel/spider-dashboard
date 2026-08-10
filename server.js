const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

// جلب الإعدادات من config.json إذا كانت موجودة
let config = {};
try {
    config = require('./config.json');
} catch (e) {
    config = {};
}

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد بوت البوت (Discord.js Client)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// قراءة البيانات من البيئة (Render) أو من ملف config.json
const CLIENT_ID = process.env.CLIENT_ID || config.clientID || config.client_id || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.CLIENT_SECRET || config.clientSecret || config.client_secret || 'YOUR_CLIENT_SECRET';
const CALLBACK_URL = process.env.CALLBACK_URL || config.callbackURL || 'http://localhost:3000/auth/discord/callback';
const BOT_TOKEN = process.env.token || process.env.TOKEN || process.env.DISCORD_TOKEN || config.token;

// إعدادات الباسبورت (Passport Discord Strategy)
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

app.use(session({
    secret: 'SpiderProDashboardSecretKey9988',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// مجلد قاعدة البيانات الوهمية (JSON)
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

// مسارات المصادقة
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

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>Spider Pro</title><link rel="stylesheet" href="/style.css"></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;"><div style="text-align:center;"><h1>🕷️ مرحبا بك في لوحة تحكم Spider Pro</h1><br><a href="/auth/discord" class="btn-neon">تسجيل الدخول بواسطة ديسكورد</a></div></body></html>`);
});

// 📊 الصفحة الرئيسية (الرصيد + الترتيب + السيرفرات الجانبية)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const botGuilds = userGuilds.map(g => ({ ...g, botIn: client.guilds.cache.has(g.id) }));

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
        } catch (e) {}
    }

    res.render('dashboard', { user: req.user, guilds: botGuilds, userBalance, userRank });
});

// 🛠️ صفحة إدارة السيرفر المخصصة
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');
    
    const guildId = req.params.guildId;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.send('السيرفر غير موجود أو أن البوت ليس بداخله!');

    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);

    let settings = {};
    let aliases = {};

    if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (fs.existsSync(aliasesPath)) aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));

    res.render('guild', { user: req.user, guild, settings, aliases });
});

// 💾 حفظ البيانات من الداشبورد
app.post('/api/save-all/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false });

    const guildId = req.params.guildId;
    const { settings, aliases } = req.body;

    const settingsPath = path.join(dbDir, `${guildId}_settings.json`);
    const aliasesPath = path.join(dbDir, `${guildId}_aliases.json`);

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    fs.writeFileSync(aliasesPath, JSON.stringify(aliases, null, 4));

    res.json({ success: true });
});

// تسجيل دخول البوت والبدء
if (BOT_TOKEN) {
    client.login(BOT_TOKEN).catch(err => console.error("❌ فشل تسجيل دخول البوت:", err.message));
} else {
    console.error("⚠️ لم يتم العثور على Bot Token!");
}

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
