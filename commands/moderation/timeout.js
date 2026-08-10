const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('إعطاء تايم أوت (إسكات مؤقت) لعضو في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد إسكاته').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('المدة بالدقائق').setRequired(true).setMinValue(1).setMaxValue(40320)) // حتى 28 يوم
        .addStringOption(opt => opt.setName('reason').setDescription('سبب الإسكات').setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const minutes = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ هذا العضو غير موجود في السيرفر!', flags: 64 });
        if (!member.moderatable) return interaction.reply({ content: '❌ لا يمكنني إسكات هذا العضو (رتبته أعلى مني أو يمتلك صلاحيات أعلى).', flags: 64 });

        const durationMs = minutes * 60 * 1000;
        await member.timeout(durationMs, reason);

        const embed = new EmbedBuilder()
            .setTitle('🤫 تم تطبيق الإسكات (Timeout)')
            .addFields(
                { name: '👤 العضو:', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                { name: '⏱️ المدة:', value: `**${minutes} دقيقة**`, inline: true },
                { name: '🛡️ بواسطة:', value: `${interaction.user}`, inline: true },
                { name: '📝 السبب:', value: reason, inline: false }
            )
            .setColor('#FEE75C')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};