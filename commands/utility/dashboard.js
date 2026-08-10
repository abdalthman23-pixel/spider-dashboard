const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('رابط لوحة تحكم البوت'),
    async execute(interaction) {
        // نأخذ الرابط من client.dashboardUrl (مضبوط مركزياً في index.js من config.json)
        // بدل ما يكون مكتوب يدوياً هنا، حتى ما نحتاج نعدل كل أمر عند تغيير الاستضافة
        const dashboardUrl = interaction.client.dashboardUrl;

        if (!dashboardUrl || dashboardUrl.includes('اكتب_')) {
            return interaction.reply({
                content: '⚠️ رابط لوحة التحكم غير مضبوط بشكل صحيح في إعدادات البوت (dashboardUrl). تواصل مع مطور البوت.',
                ephemeral: true
            });
        }

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
