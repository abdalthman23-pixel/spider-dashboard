const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المرادطرده').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب الطرد').setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ هذا العضو غير موجود في السيرفر!', flags: 64 });
        if (!member.kickable) return interaction.reply({ content: '❌ لا يمكنني طرد هذا العضو.', flags: 64 });

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle('👋 تم تطبيق الطرد')
            .addFields(
                { name: '👤 العضو المطرود:', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                { name: '🛡️ بواسطة:', value: `${interaction.user}`, inline: true },
                { name: '📝 السبب:', value: reason, inline: false }
            )
            .setColor('#ED4245')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};