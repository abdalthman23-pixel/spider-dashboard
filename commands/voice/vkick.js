const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vkick')
        .setDescription('طرد عضو من الروم الصوتي قطع الاتصال عنه')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('user');
        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ العضو ليس متواجد في أي روم صوتي!', flags: 64 });
        }

        await member.voice.disconnect();
        return interaction.reply({ content: `👞 **تم فصل اتصال ${member} من الروم الصوتي.**`, flags: 64 });
    }
};