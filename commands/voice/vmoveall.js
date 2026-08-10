const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vmoveall')
        .setDescription('سحب/تحريك جميع المتواجدين في الرومات الصوتية لرومك الصوتي الحالي')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const myChannel = interaction.member.voice.channel;
        if (!myChannel) {
            return interaction.reply({ content: '❌ يجب أن تكون داخل روم صوتي أولاً لاستخدام هذا الأمر!', flags: 64 });
        }

        let movedCount = 0;
        interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== myChannel.id).forEach(chan => {
            chan.members.forEach(m => {
                m.voice.setChannel(myChannel).catch(() => {});
                movedCount++;
            });
        });

        const embed = new EmbedBuilder()
            .setTitle('🔊 نقل جماعي')
            .setDescription(`تم سحب **${movedCount}** عضو إلى رومك الصوتي: ${myChannel}`)
            .setColor('#00FFB3').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};