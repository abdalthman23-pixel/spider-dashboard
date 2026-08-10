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
        .setName('clear-warns')
        .setDescription('تصفير وحذف جميع تحذيرات عضو معين دفعة واحدة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد تصفير تحذيراته').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const guildId = interaction.guild.id;
        const db = getDb();

        if (!db[guildId] || !db[guildId][target.id] || db[guildId][target.id].length === 0) {
            return interaction.reply({ content: `❌ العضو ${target.tag} لا يمتلك أي تحذيرات لحذفها.`, flags: 64 });
        }

        delete db[guildId][target.id];
        saveDb(db);

        const embed = new EmbedBuilder()
            .setTitle('🧹 تصفير السجل')
            .setDescription(`تم مسح وتصفير كافة تحذيرات العضو ${target} بالكامل بواسطة ${interaction.user}.`)
            .setColor('#57F287')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};