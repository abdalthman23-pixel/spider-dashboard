const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-role-icon')
        .setDescription('تحديد آيقونة/صورة مخصصة لرتبة (يتطلب سيرفر بوست ليفيل 2)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(opt => opt.setName('role').setDescription('الرتبة').setRequired(true))
        .addStringOption(opt => opt.setName('icon_url').setDescription('رابط آيقونة الصورة Direct Link').setRequired(true)),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const iconUrl = interaction.options.getString('icon_url');

        try {
            await role.setIcon(iconUrl);
            const embed = new EmbedBuilder()
                .setTitle('🖼️ تم وضع آيقونة للرتبة')
                .setDescription(`تم تعيين الآيقونة بنجاح لرتبة ${role}`)
                .setColor('#00FFB3').setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch {
            return interaction.reply({ content: '❌ متعذر تعيين آيقونة الرتبة. تأكد من أن السيرفر يمتلك شروط البوست الفعالة وأن الرتبة تحت رتبة البوت.', flags: 64 });
        }
    }
};