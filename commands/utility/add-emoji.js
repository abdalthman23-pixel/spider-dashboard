const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-emoji')
        .setDescription('إضافة إيموجي جديد للسيرفر عبر رابط صورة مباشر')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addStringOption(opt => opt.setName('url').setDescription('رابط الصورة المباشرة').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('اسم الإيموجي').setRequired(true)),

    async execute(interaction) {
        const url = interaction.options.getString('url');
        const name = interaction.options.getString('name');

        const emoji = await interaction.guild.emojis.create({ attachment: url, name }).catch(() => null);
        if (!emoji) return interaction.reply({ content: '❌ فشل إضافة الإيموجي، تأكد من صحة الرابط والمساحة المتاحة للإيموجيات.', flags: 64 });

        const embed = new EmbedBuilder()
            .setTitle('✅ تم إضافة الإيموجي')
            .setDescription(`تمت إضافة الإيموجي الجديد: ${emoji} باسم \`${name}\``)
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};