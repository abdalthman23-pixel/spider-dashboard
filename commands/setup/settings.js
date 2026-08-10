const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../database/settings.json');

function getDb(p) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function saveDb(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 4)); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('⚙️ لوحة التحكم في إعدادات السيرفر (خاصة بالسيرفر الحالي)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('welcome')
                .setDescription('تحديد قناة الترحيب بالأعضاء الجدد')
                .addChannelOption(opt => opt.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autoline')
                .setDescription('تحديد رابط صورة الخط التلقائي وقناة تفعيله')
                .addChannelOption(opt => opt.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addStringOption(opt => opt.setName('image_url').setDescription('رابط صورة الخط المباشر').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('protection')
                .setDescription('تفعيل أو تعطيل أنظمة الحماية')
                .addBooleanOption(opt => opt.setName('anti_link').setDescription('منع الروابط').setRequired(true))
                .addBooleanOption(opt => opt.setName('anti_spam').setDescription('منع التكرار/السبام').setRequired(true))
                .addBooleanOption(opt => opt.setName('anti_bot').setDescription('طرد البوتات الجديدة تلقائياً').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('logs')
                .setDescription('تحديد قناة سجل الإجراءات واللوج')
                .addChannelOption(opt => opt.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText).setRequired(true))
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const allSettings = getDb(settingsPath);
        if (!allSettings[guildId]) allSettings[guildId] = {};

        const sub = interaction.options.getSubcommand();

        if (sub === 'welcome') {
            const chan = interaction.options.getChannel('channel');
            allSettings[guildId].welcomeChannel = chan.id;
            saveDb(settingsPath, allSettings);
            return interaction.reply({ content: `✅ **تم ضبط قناة الترحيب بنجاح في:** ${chan}`, flags: 64 });
        }

        if (sub === 'autoline') {
            const chan = interaction.options.getChannel('channel');
            const url = interaction.options.getString('image_url');
            if (!allSettings[guildId].lineChannels) allSettings[guildId].lineChannels = [];
            if (!allSettings[guildId].lineChannels.includes(chan.id)) {
                allSettings[guildId].lineChannels.push(chan.id);
            }
            allSettings[guildId].lineUrl = url;
            saveDb(settingsPath, allSettings);
            return interaction.reply({ content: `✅ **تم تفعيل الخط التلقائي للقناة:** ${chan}`, flags: 64 });
        }

        if (sub === 'protection') {
            const link = interaction.options.getBoolean('anti_link');
            const spam = interaction.options.getBoolean('anti_spam');
            const bot = interaction.options.getBoolean('anti_bot');

            allSettings[guildId].antiLink = link;
            allSettings[guildId].antiSpam = spam;
            allSettings[guildId].antiBot = bot;
            saveDb(settingsPath, allSettings);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ تم تحديث إعدادات الحماية (Spider Shield)')
                .addFields(
                    { name: '🔗 منع الروابط:', value: link ? 'مُفعل ✅' : 'معطل ❌', inline: true },
                    { name: '⚡ منع السبام:', value: spam ? 'مُفعل ✅' : 'معطل ❌', inline: true },
                    { name: '🤖 حظر البوتات:', value: bot ? 'مُفعل ✅' : 'معطل ❌', inline: true }
                )
                .setColor('#5865F2');

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'logs') {
            const chan = interaction.options.getChannel('channel');
            allSettings[guildId].logChannel = chan.id;
            saveDb(settingsPath, allSettings);
            return interaction.reply({ content: `✅ **تم تحديد قناة اللوج والسجلات بنجاح في:** ${chan}`, flags: 64 });
        }
    }
};