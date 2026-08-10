const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل الروم الحالي لمنع الأعضاء من الكتابة')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        const embed = new EmbedBuilder()
            .setTitle('🔒 تم قفل الروم')
            .setDescription(`تم قفل الروم ${interaction.channel} بواسطة ${interaction.user}.`)
            .setColor('#ED4245').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};