const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ecoPath = path.join(__dirname, '../../database/economy.json');

function getDb() {
    if (!fs.existsSync(ecoPath)) fs.writeFileSync(ecoPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(ecoPath, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('عرض الرصيد المالي الحالي لعملة Spider Pounds')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد استعراض رصيده').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const db = getDb();

        const userBalance = db[guildId]?.[target.id] || 0;

        const embed = new EmbedBuilder()
            .setTitle('💳 المحفظة المالية')
            .setDescription(`رصيد ${target} الحالي هو:\n\n💰 **${userBalance.toLocaleString('en-US')}** Spider Pounds`)
            .setColor('#57F287')
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};