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
        .setName('remove-warn')
        .setDescription('إزالة تحذير معين عن عضو بواسطة كود التحذير')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addStringOption(opt => opt.setName('warn_id').setDescription('كود التحذير (مثل W-1234)').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const warnId = interaction.options.getString('warn_id').trim();
        const guildId = interaction.guild.id;
        const db = getDb();

        const userWarns = db[guildId]?.[target.id] || [];

        if (userWarns.length === 0) {
            return interaction.reply({ content: `❌ لا يوجد أي تحذيرات مسجلة للعضو ${target.tag}.`, flags: 64 });
        }

        const warnIndex = userWarns.findIndex(w => w.id === warnId);

        if (warnIndex === -1) {
            return interaction.reply({ content: `❌ لم يتم العثور على تحذير بالكود \`${warnId}\` لهذا العضو.`, flags: 64 });
        }

        userWarns.splice(warnIndex, 1);
        db[guildId][target.id] = userWarns;
        saveDb(db);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ تم إلغاء التحذير')
            .setDescription(`تم مسح التحذير ذو الكود \`${warnId}\` عن العضو ${target} بواسطة ${interaction.user}.`)
            .setColor('#57F287')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};