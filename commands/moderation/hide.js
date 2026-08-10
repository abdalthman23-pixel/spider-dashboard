const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hide')
        .setDescription('إخفاء الروم الحالي عن باقي الأعضاء')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
        const embed = new EmbedBuilder()
            .setTitle('👁️‍🗨️ تم إخفاء الروم')
            .setDescription(`تم إخفاء الروم بنجاح بواسطة ${interaction.user}.`)
            .setColor('#2F3136').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};