const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

passport.use(new DiscordStrategy({
    clientID: '1534954572743704717',
    clientSecret: 'UKAVii7x1GX-GROxgcHfP6hlsa3PzGuO',
    callbackURL: 'http://localhost:3000/auth/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

router.get('/auth/discord', passport.authenticate('discord'));
router.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
router.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

// صفحة تسجيل الدخول
router.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>Spider Pro - تسجيل الدخول</title><link rel="stylesheet" href="/style.css"></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
        <div class="pb-card" style="text-align:center; max-width:450px; width:100%;">
            <h1 style="margin-bottom:15px; color:#fff;">🕷️ Spider Pro</h1>
            <p style="color:var(--text-secondary); margin-bottom:25px;">قم بربط حسابك والتحكم بسيرفراتك وأوامر البوت باحترافية كاملة</p>
            <a href="/auth/discord" class="btn-primary" style="width:100%; justify-content:center;">تسجيل الدخول بواسطة Discord</a>
        </div></body></html>
    `);
});

// الصفحة الرئيسية الداشبورد (عرض الرصيد والترتيب العالمي Top 100)
router.get('/dashboard', isAuthenticated, (req, res) => {
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const client = req.app.get('client');
    const botGuilds = userGuilds.map(g => ({ ...g, botIn: client.guilds.cache.has(g.id) }));

    const ecoPath = path.join(__dirname, 'database/economy.json');
    let userBalance = 0, userRank = 'خارج القائمة';

    if (fs.existsSync(ecoPath)) {
        try {
            const ecoDb = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
            let allUsers = [];
            for (const [gId, members] of Object.entries(ecoDb)) {
                for (const [mId, bal] of Object.entries(members)) allUsers.push({ userId: mId, balance: bal });
            }
            allUsers.sort((a, b) => b.balance - a.balance);
            
            const foundIndex = allUsers.findIndex(u => u.userId === req.user.id);
            if (foundIndex !== -1 && foundIndex < 100) {
                userRank = foundIndex + 1;
                userBalance = allUsers[foundIndex].balance;
            } else if (foundIndex !== -1) {
                userBalance = allUsers[foundIndex].balance;
            }
        } catch (e) {}
    }

    res.render('dashboard', { user: req.user, guilds: botGuilds, userBalance, userRank });
});

// صفحة إدارة السيرفر المحددة
router.get('/dashboard/:guildId', isAuthenticated, (req, res) => {
    const guildId = req.params.guildId;
    const client = req.app.get('client');
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) return res.send('السيرفر غير موجود أو أن البوت ليس بداخله!');

    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    const botGuilds = userGuilds.map(g => ({ ...g, botIn: client.guilds.cache.has(g.id) }));

    const commandsList = client.commands ? Array.from(client.commands.values()).map(c => ({
        name: c.data.name,
        description: c.data.description || 'بدون وصف'
    })) : [
        { name: 'balance', description: 'عرض الرصيد المالي' },
        { name: 'top', description: 'عرض أغنى 10 أعضاء' },
        { name: 'kick', description: 'طرد عضو من السيرفر' },
        { name: 'ban', description: 'حظر عضو من السيرفر' }
    ];

    // جلب رتب ورومات هذا السيرفر المخصص
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name }));
    const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));

    const dbDir = path.join(__dirname, 'database');
    const loadConfig = (fileName) => {
        const filePath = path.join(dbDir, `${guildId}_${fileName}.json`);
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
    };

    const settings = loadConfig('settings');
    const commandsConfig = loadConfig('commands');
    const protectionConfig = loadConfig('protection');
    const logsConfig = loadConfig('logs');
    const repliesConfig = loadConfig('replies');

    res.render('guild', { 
        user: req.user, guild, guilds: botGuilds, 
        settings, commandsConfig, protectionConfig, logsConfig, repliesConfig, 
        commandsList, roles, channels 
    });
});

// API إرسال الـ Embed المباشر مع الـ Reaction
router.post('/api/send-embed/:guildId', isAuthenticated, async (req, res) => {
    const guildId = req.params.guildId;
    const { channelId, title, description, color, reaction } = req.body;
    const client = req.app.get('client');

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ success: false, message: 'السيرفر غير موجود' });

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(400).json({ success: false, message: 'الروم غير موجود' });

        const embed = new (require('discord.js').EmbedBuilder)()
            .setTitle(title || 'عنوان إمبد')
            .setDescription(description || 'وصف إمبد')
            .setColor(color || '#0088ff')
            .setFooter({ text: `تم الإرسال بواسطة: ${req.user.username}` });

        const sentMsg = await channel.send({ embeds: [embed] });

        if (reaction && reaction.trim() !== '') {
            await sentMsg.react(reaction.trim()).catch(() => {});
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// API حفظ كل الإعدادات
router.post('/api/save-all/:guildId', isAuthenticated, (req, res) => {
    const guildId = req.params.guildId;
    const { settings, commandsConfig, protectionConfig, logsConfig, repliesConfig } = req.body;

    const dbDir = path.join(__dirname, 'database');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

    const saveFile = (fileName, data) => {
        fs.writeFileSync(path.join(dbDir, `${guildId}_${fileName}.json`), JSON.stringify(data || {}, null, 4));
    };

    saveFile('settings', settings);
    saveFile('commands', commandsConfig);
    saveFile('protection', protectionConfig);
    saveFile('logs', logsConfig);
    saveFile('replies', repliesConfig);

    res.json({ success: true });
});

module.exports = router;