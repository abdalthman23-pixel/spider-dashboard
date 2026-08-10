const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vmove')
        .setDescription('نقل عضو متواجد في روم صوتي لروم آخر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('الروم الصوتي').addChannelTypes(ChannelType.GuildVoice).setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('user');
        const targetChannel = interaction.options.getChannel('channel');

        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ هذا العضو ليس في روم صوتي حالياً!', flags: 64 });
        }

        await member.voice.setChannel(targetChannel);
        return interaction.reply({ content: `✅ **تم نقل ${member} إلى الرومالصوتي:** ${targetChannel}`, flags: 64 });
    }
};