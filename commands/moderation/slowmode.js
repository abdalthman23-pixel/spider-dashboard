const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('تحديد وضع الإبطاء للكتابة في الروم (ضع 0 لإلغائه)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(opt => opt.setName('seconds').setDescription('المدة بالثواني').setRequired(true).setMinValue(0).setMaxValue(21600)),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        await interaction.channel.setRateLimitPerUser(seconds);

        const embed = new EmbedBuilder()
            .setTitle('⏱️ الوضع البطيء (Slowmode)')
            .setDescription(seconds === 0 ? 'تم إيقاف الوضع البطيء بنجاح.' : `تم تحديد الوضع البطيء بـ **${seconds} ثانية** لكل رسالة.`)
            .setColor('#5865F2').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};