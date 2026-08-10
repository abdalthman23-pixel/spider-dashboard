const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('show')
        .setDescription('إظهار الروم المخفي للأعضاء')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
        const embed = new EmbedBuilder()
            .setTitle('👁️ تم إظهار الروم')
            .setDescription(`تم إظهار الروم للجميع بواسطة ${interaction.user}.`)
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};