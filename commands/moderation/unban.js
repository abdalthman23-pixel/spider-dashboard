const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('فك الحظر عن عضو بإستخدام الـ ID')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(opt => opt.setName('user_id').setDescription('ID العضو المحظور').setRequired(true)),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id');
        try {
            await interaction.guild.members.unban(userId);
            const embed = new EmbedBuilder()
                .setTitle('🔓 تم فك الحظر بنجاح')
                .setDescription(`تم فك الحظر عن العضو (\`${userId}\`) بواسطة ${interaction.user}.`)
                .setColor('#57F287').setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch {
            return interaction.reply({ content: '❌ لم يتم العثور على هذا الـ ID في قائمة المحظورين.', flags: 64 });
        }
    }
};