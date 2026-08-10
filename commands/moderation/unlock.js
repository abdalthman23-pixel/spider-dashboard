const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح الروم الحالي للسماح للأعضاء بالكتابة')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        const embed = new EmbedBuilder()
            .setTitle('🔓 تم فتح الروم')
            .setDescription(`تم فتح الروم ${interaction.channel} بواسطة ${interaction.user}.`)
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};