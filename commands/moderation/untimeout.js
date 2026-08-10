const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('إزالة الإسكات (Timeout) عن عضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد فك الإسكات عنه').setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ هذا العضو غير موجود!', flags: 64 });
        if (!member.isCommunicationDisabled()) return interaction.reply({ content: '⚠️ هذا العضو ليس في حالة إسكات حالياً.', flags: 64 });

        await member.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle('🔊 تم فك الإسكات')
            .setDescription(`تم إزالة الإسكات عن ${targetUser} بواسطة ${interaction.user}.`)
            .setColor('#57F287')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};