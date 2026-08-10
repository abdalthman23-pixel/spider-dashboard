const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-add')
        .setDescription('إعطاء رتبة معينة لعضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('الرتبة').setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (member.roles.cache.has(role.id)) {
            return interaction.reply({ content: '⚠️ العضو يمتلك هذه الرتبة بالفعل!', flags: 64 });
        }

        await member.roles.add(role).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('✅ تم إعطاء الرتبة')
            .setDescription(`تم منح رتبة ${role} للعضو ${member} بواسطة ${interaction.user}.`)
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
};