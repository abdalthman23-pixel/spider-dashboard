const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('عرض تفاصيل معقدة وشاملة عن السيرفر الحالي'),

    async execute(interaction) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(`🏰 معلومات سيرفر: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 المالك:', value: `${owner} (\`${owner.id}\`)`, inline: true },
                { name: '⏰ تاريخ الإنشاء:', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 عدد الأعضاء:', value: `**${guild.memberCount}** عضو`, inline: true },
                { name: '💬 عدد الرومات:', value: `**${guild.channels.cache.size}** روم`, inline: true },
                { name: '🏷️ عدد الرتب:', value: `**${guild.roles.cache.size}** رتبة`, inline: true },
                { name: '🚀 مستوى البوستات:', value: `Level **${guild.premiumTier}** (${guild.premiumSubscriptionCount || 0} Boosts)`, inline: true }
            )
            .setColor('#5865F2')
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};