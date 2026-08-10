const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const config = require('./config.json');

// ==========================================================
// قراءة موحّدة للتوكن: يقبل أي اسم شائع لمتغير البيئة
// (token / BOT_TOKEN / TOKEN)، وإن لم يوجد أي منها يرجع لـ config.json
// ==========================================================
const TOKEN = process.env.token || process.env.BOT_TOKEN || process.env.TOKEN || config.token;

// نفس الفكرة لرابط الداشبورد ورابط الـ OAuth callback - كلها موحّدة بمكان واحد
const DASHBOARD_URL = process.env.dashboardUrl || process.env.DASHBOARD_URL || config.dashboardUrl;
const CALLBACK_URL = process.env.callbackURL || process.env.CALLBACK_URL || config.callbackURL;

// تحقق مبكر وواضح بدل ما يفشل الكود بصمت لاحقاً
if (!TOKEN || TOKEN === '1' || TOKEN.includes('ضع_')) {
    console.error('❌ خطأ فادح: التوكن غير موجود أو لا يزال قيمة افتراضية. تحقق من config.json أو متغيرات البيئة.');
}
if (!DASHBOARD_URL || DASHBOARD_URL.includes('اكتب_')) {
    console.warn('⚠️ تحذير: dashboardUrl غير مضبوط بشكل صحيح في config.json.');
}
if (!CALLBACK_URL || CALLBACK_URL.includes('اكتب_')) {
    console.warn('⚠️ تحذير: callbackURL غير مضبوط بشكل صحيح في config.json.');
}

// إعداد البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
// نمرر رابط الداشبورد لأي أمر يحتاجه (مثل أمر /dashboard) عبر الـ client مباشرة
client.dashboardUrl = DASHBOARD_URL;

// تحميل الأوامر
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);
    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                }
            }
        }
    }
}

// تحميل الأحداث (Events)
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// تسجيل الأوامر الـ Slash Commands عند الجاهزية
// ملاحظة: التسجيل عالمي فقط (بدون تكرار لكل سيرفر) لتفادي ظهور أوامر مكررة.
// إن أردت ظهور فوري أثناء التطوير، ضع GUILD_ID في متغيرات البيئة.
client.once('ready', async () => {
    console.log(`==========================================`);
    console.log(`✅ تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
    try {
        const commandsData = Array.from(client.commands.values()).map(c => c.data.toJSON());

        if (process.env.GUILD_ID) {
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (guild) {
                await guild.commands.set(commandsData);
                console.log(`⚡ تم تسجيل الأوامر فوراً على سيرفر التطوير (${process.env.GUILD_ID})`);
            } else {
                console.warn('⚠️ لم يتم العثور على GUILD_ID المحدد ضمن سيرفرات البوت.');
            }
        } else {
            await client.application.commands.set(commandsData);
            console.log('⚡ تم تحديث وتسجيل كافة أوامر السلاش (/ commands) عالمياً بنجاح! (قد تستغرق دقائق للظهور)');
        }
    } catch (e) {
        console.error('❌ خطأ في تسجيل الأوامر:', e);
    }
    console.log(`==========================================`);
});

client.on('error', (e) => console.error('❌ خطأ في اتصال البوت (Client Error):', e));
client.on('shardError', (e) => console.error('❌ خطأ في الـ Shard:', e));

// إعداد خادم الويب (Express Dashboard)
const app = express();

// ضروري خلف أي بروكسي عكسي (wispbyte / render وغيرها) حتى تعمل الجلسات وOAuth بشكل صحيح
app.set('trust proxy', 1);

app.set('view engine', 'ejs');

if (fs.existsSync(path.join(__dirname, 'views'))) {
    app.set('views', path.join(__dirname, 'views'));
} else {
    app.set('views', path.join(__dirname, 'dashboard/views'));
}

if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public')));
}
if (fs.existsSync(path.join(__dirname, 'dashboard/public'))) {
    app.use(express.static(path.join(__dirname, 'dashboard/public')));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.sessionSecret || config.sessionSecret || 'spider_secret_session_key_123',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ⚠️ هذا الرابط (CALLBACK_URL) يجب أن يطابق حرفياً (100%) رابط الـ Redirect
// المسجل في Discord Developer Portal > OAuth2 > Redirects
passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// مسارات تسجيل الدخول والخروج
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// حماية المسارات
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

// صفحة اللوحة الرئيسية (Dashboard)
app.get('/dashboard', checkAuth, (req, res) => {
    const userGuilds = req.user.guilds || [];
    const botGuilds = client.guilds.cache;

    const guilds = userGuilds.filter(g => (g.permissions & 0x20) === 0x20).map(g => {
        return {
            ...g,
            botIn: botGuilds.has(g.id)
        };
    });

    let userBalance = 0;
    try {
        const ecoPath = path.join(__dirname, 'database/economy.json');
        if (fs.existsSync(ecoPath)) {
            const ecoDb = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
            userBalance = ecoDb[req.user.id]?.balance || 0;
        }
    } catch (e) {
        userBalance = 0;
    }

    res.render('dashboard', {
        user: req.user,
        guilds: guilds,
        userBalance: userBalance,
        userRank: '#1'
    });
});

// صفحة التحكم الخاصة بسيرفر معين
app.get('/dashboard/:guildId', checkAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.redirect('/dashboard');

    const dbDir = path.join(__dirname, 'database');
    const loadConfig = (fileName) => {
        const p = path.join(dbDir, `${guild.id}_${fileName}.json`);
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    };

    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
    const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
    const commandsList = Array.from(client.commands.values()).map(c => ({ name: c.data.name, description: c.data.description }));

    res.render('guild', {
        user: req.user,
        guild,
        guilds: req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20).map(g => ({ ...g, botIn: client.guilds.cache.has(g.id) })),
        roles,
        channels,
        commandsList,
        settings: loadConfig('settings'),
        commandsConfig: loadConfig('commands'),
        protectionConfig: loadConfig('protection'),
        logsConfig: loadConfig('logs'),
        repliesConfig: loadConfig('replies')
    });
});

// حفظ البيانات عبر API
app.post('/api/save-all/:guildId', checkAuth, (req, res) => {
    const { guildId } = req.params;
    const { settings, commandsConfig, protectionConfig, logsConfig, repliesConfig } = req.body;
    const dbDir = path.join(__dirname, 'database');

    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const saveFile = (fileName, data) => {
        if (data) fs.writeFileSync(path.join(dbDir, `${guildId}_${fileName}.json`), JSON.stringify(data, null, 2));
    };

    saveFile('settings', settings);
    saveFile('commands', commandsConfig);
    saveFile('protection', protectionConfig);
    saveFile('logs', logsConfig);
    saveFile('replies', repliesConfig);

    res.json({ success: true });
});

// إرسال إمبد من اللوحة
app.post('/api/send-embed/:guildId', checkAuth, async (req, res) => {
    const { guildId } = req.params;
    const { channelId, title, description, color, reaction } = req.body;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, message: 'السيرفر غير موجود!' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, message: 'الروم غير موجود!' });

    try {
        const embed = {
            title: title || 'بدون عنوان',
            description: description || '',
            color: parseInt(color.replace('#', ''), 16) || 0x0088ff,
            timestamp: new Date()
        };

        const msg = await channel.send({ embeds: [embed] });
        if (reaction) await msg.react(reaction).catch(() => {});

        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// تشغيل السيرفر على بورت wispbyte
const PORT = process.env.SERVER_PORT || process.env.PORT || 14885;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 لوحة التحكم تعمل الآن بنجاح على البورت: ${PORT}`);
    console.log(`🔗 رابط الداشبورد المستخدم: ${DASHBOARD_URL}`);
    console.log(`🔗 رابط الـ OAuth callback المستخدم: ${CALLBACK_URL}`);
});

// تسجيل دخول البوت مع معالجة واضحة للأخطاء
client.login(TOKEN).catch((e) => {
    console.error('❌ فشل تسجيل دخول البوت! تأكد من صحة التوكن ومن تفعيل الـ Privileged Intents (Message Content / Server Members) في Discord Developer Portal:', e.message);
});
