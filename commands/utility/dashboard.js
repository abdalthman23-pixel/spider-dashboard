const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('رابط لوحة تحكم البوت'),
    async execute(interaction) {
        const dashboardUrl = 'http://78.154.103.26:14885';

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🌐 لوحة تحكم البوت | Spider Pro')
            .setDescription('يمكنك إدارة جميع إعدادات البوت، الردود التلقائية، والحماية بسهولة عبر لوحة التحكم الخاصة بنا.')
            .setFooter({ text: 'Spider Pro Engine' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('الدخول للوحة التحكم')
                    .setStyle(ButtonStyle.Link)
                    .setURL(dashboardUrl)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};