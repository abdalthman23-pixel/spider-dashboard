const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const warnPath = path.join(__dirname, '../../database/warnings.json');

function getDb() {
    if (!fs.existsSync(warnPath)) fs.writeFileSync(warnPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(warnPath, 'utf8')); } catch { return {}; }
}
function saveDb(data) { fs.writeFileSync(warnPath, JSON.stringify(data, null, 4)); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('توجيه تحذير لعضو وإرسال إشعار في الخاص')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد تحذيره').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب التحذير').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const db = getDb();
        const guildId = interaction.guild.id;

        if (target.bot) {
            return interaction.reply({ content: '❌ لا يمكنك تحذير البوتات!', flags: 64 });
        }

        if (!db[guildId]) db[guildId] = {};
        if (!db[guildId][target.id]) db[guildId][target.id] = [];

        const warnId = `W-${Date.now().toString().slice(-4)}`;
        db[guildId][target.id].push({
            id: warnId,
            reason,
            by: interaction.user.tag,
            date: Date.now()
        });
        saveDb(db);

        // 📩 1. إرسال إمبد التنبيه في الخاص (DM) للمستهدف
        const dmEmbed = new EmbedBuilder()
            .setTitle(`⚠️ لقد تلقيت تحذيراً جديداً!`)
            .setDescription(`تم توجيه تحذير لك في سيرفر **${interaction.guild.name}**`)
            .addFields(
                { name: '📝 السبب:', value: `> ${reason}`, inline: false },
                { name: '🛡️ بواسطة:', value: `${interaction.user.tag}`, inline: true },
                { name: '🆔 كود التحذير:', value: `\`${warnId}\``, inline: true }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setColor('#ED4245')
            .setTimestamp();

        let dmSent = true;
        await target.send({ embeds: [dmEmbed] }).catch(() => {
            dmSent = false; // إذا كان الخاص مغلقاً
        });

        // 📢 2. الرد في الروم لتأكيد العملية
        const roomEmbed = new EmbedBuilder()
            .setTitle('⚠️ تم توجيه التحذير بنجاح')
            .addFields(
                { name: '👤 العضو:', value: `${target} (\`${target.id}\`)`, inline: true },
                { name: '🆔 كود التحذير:', value: `\`${warnId}\``, inline: true },
                { name: '🛡️ بواسطة:', value: `${interaction.user}`, inline: true },
                { name: '📝 السبب:', value: reason, inline: false },
                { name: '📩 حالة الخاص:', value: dmSent ? 'تم إرسال إشعار في الخاص ✅' : 'الخاص مغلق لدى العضو ❌', inline: false }
            )
            .setColor('#FEE75C')
            .setTimestamp();

        return interaction.reply({ embeds: [roomEmbed] });
    }
};