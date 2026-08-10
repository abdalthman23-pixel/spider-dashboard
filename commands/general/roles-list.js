const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles-list')
        .setDescription('عرض كل رتب السيرفر بالترتيب'),

    async execute(interaction) {
        const roles = interaction.guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} (\`${r.id}\`)`)
            .slice(0, 30)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🏷️ رتب سيرفر: ${interaction.guild.name}`)
            .setDescription(roles || 'لا يوجد رتب.')
            .setColor('#5865F2').setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};