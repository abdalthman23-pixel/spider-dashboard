const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../database/settings.json');

function getDb(p) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-protection')
        .setDescription('🛡️ الداشبورد المصغر للتحكم الشامل في أنظمة الحماية واللوج والرتب الموثوقة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const settings = getDb(settingsPath)[guildId] || {};

        const status = (val) => val ? 'مُفعل ✅' : 'معطل ❌';
        const logChan = settings.logChannel ? `<#${settings.logChannel}>` : 'غير محدد ❌';

        const embed = new EmbedBuilder()
            .setTitle('🛡️ لوحة تحكم حماية وقنوات Spider Shield')
            .setDescription('اختر النظام الذي تريد تفعيله أو حدد روم اللوج والرتب الموثوقة بالأسفل:')
            .addFields(
                { name: '📜 روم اللوج الحالية:', value: logChan, inline: false },
                { name: '🔗 حماية الروابط:', value: status(settings.antiLink), inline: true },
                { name: '🤖 حظر البوتات:', value: status(settings.antiBot), inline: true },
                { name: '⚡ حماية السبام:', value: status(settings.antiSpam), inline: true },
                { name: '🚨 حماية النيوك (Anti-Nuke):', value: status(settings.antiNuke), inline: true },
                { name: '🛡️ الرتب الموثوقة (Whitelisted):', value: settings.trustedRoles?.length ? settings.trustedRoles.map(r => `<@&${r}>`).join(', ') : 'لا يوجد رتب موثوقة محددة ⚠️', inline: false }
            )
            .setColor('#ED4245')
            .setFooter({ text: 'Spider Pro Shield System' });

        // السطر الأول: أزرار الحماية الفردية والجامعة
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prot_toggle_all').setLabel('تفعيل الكل 🔥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('prot_toggle_links').setLabel('حماية الروابط 🔗').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('prot_toggle_bots').setLabel('حظر البوتات 🤖').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('prot_toggle_spam').setLabel('حماية السبام ⚡').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('prot_toggle_nuke').setLabel('حماية النيوك 🚨').setStyle(ButtonStyle.Danger)
        );

        // السطر الثاني: زِر تحديد روم اللوج + تحديد الرتب الموثوقة + رابط الداشبورد
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prot_set_log_channel').setLabel('تحديد روم اللوج 📜').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('prot_set_trusted').setLabel('اختيار الرتب الموثوقة 👑').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('موقع الداشبورد 🌐').setURL('https://spider-pro-dashboard.com').setStyle(ButtonStyle.Link)
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};