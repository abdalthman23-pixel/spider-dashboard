const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const warnPath = path.join(__dirname, '../../database/warnings.json');

function getDb() {
    if (!fs.existsSync(warnPath)) fs.writeFileSync(warnPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(warnPath, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض قائمة التحذيرات الخاصة بعضو معين')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد فحص تحذيراته').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const guildId = interaction.guild.id;
        const db = getDb();

        const userWarns = db[guildId]?.[target.id] || [];

        if (userWarns.length === 0) {
            return interaction.reply({ content: `✅ **العضو ${target.tag} ليس لديه أي تحذيرات مسجلة في هذا السيرفر.**`, flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ سجل تحذيرات العضو: ${target.username}`)
            .setDescription(`إجمالي عدد التحذيرات: **${userWarns.length}**`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setColor('#FEE75C')
            .setTimestamp();

        userWarns.forEach((w, index) => {
            const dateStr = `<t:${Math.floor(w.date / 1000)}:R>`;
            embed.addFields({
                name: `📌 تحذير #${index + 1} | كود: \`${w.id}\``,
                value: `> **السبب:** ${w.reason}\n> **بواسطة:** ${w.by}\n> **التاريخ:** ${dateStr}`
            });
        });

        return interaction.reply({ embeds: [embed] });
    }
};