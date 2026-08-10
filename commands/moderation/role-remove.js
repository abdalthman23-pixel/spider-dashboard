const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-remove')
        .setDescription('سحب رتبة من عضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('الرتبة').setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({ content: '⚠️ العضو لا يمتلك هذه الرتبة!', flags: 64 });
        }

        await member.roles.remove(role).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('🗑️ تم إزالة الرتبة')
            .setDescription(`تم سحب رتبة ${role} من العضو ${member} بواسطة ${interaction.user}.`)
            .setColor('#ED4245').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};