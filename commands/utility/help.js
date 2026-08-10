const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض دلايل وأوامر البوت المقسمة حسب الفئات'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🕷️ قائمة مساعدة Spider Pro')
            .setDescription('اختر القسم المطلوب من القائمة المنسدلة بالأسفل لعرض أوامره بالكامل:')
            .setColor('#5865F2')
            .setThumbnail(interaction.client.user.displayAvatarURL());

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('اختر فئة الأوامر...')
            .addOptions([
                new StringSelectMenuOptionBuilder().setLabel('أوامر الإدارة والرقابة').setValue('help_mod').setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder().setLabel('أوامر الاقتصاد والـ Pounds').setValue('help_eco').setEmoji('💰'),
                new StringSelectMenuOptionBuilder().setLabel('أوامر الرومات الصوتية').setValue('help_voice').setEmoji('🔊'),
                new StringSelectMenuOptionBuilder().setLabel('الأوامر العامة والخدمات').setValue('help_gen').setEmoji('⚙️')
            ]);

        return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    }
};