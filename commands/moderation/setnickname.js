const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setnickname')
        .setDescription('تغيير الاسم المستعار لعضو في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد تغيير اسمه').setRequired(true))
        .addStringOption(opt => opt.setName('nickname').setDescription('الاسم الجديد (اتركه فارغاً لإعادة الاسم الأصلي)').setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getMember('user');
        const nick = interaction.options.getString('nickname') || null;

        if (!member) {
            return interaction.reply({ content: '❌ لم يتم العثور على هذا العضو في السيرفر.', flags: 64 });
        }

        if (!member.manageable) {
            return interaction.reply({ content: '❌ لا يمكنني تغيير اسم هذا العضو (رتبته أعلى مني أو يمتلك صلاحيات أونر).', flags: 64 });
        }

        await member.setNickname(nick).catch(() => null);

        const embed = new EmbedBuilder()
            .setTitle('✏️ تم تغيير الاسم المستعار')
            .setDescription(`تم تغيير اسم ${member} إلى: **${nick || 'الاسم الأصلي'}** بواسطة ${interaction.user}.`)
            .setColor('#5865F2')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};