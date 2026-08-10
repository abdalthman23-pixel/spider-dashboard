const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ecoPath = path.join(__dirname, '../../database/economy.json');

function getDb(p) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('عرض قائمة أكثر 10 أعضاء يمتلكون Spider Pounds عالمياً'),

    async execute(interaction) {
        const ecoDb = getDb(ecoPath);
        const sorted = Object.entries(ecoDb)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        if (sorted.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد أعضاء في قاعدة البيانات الاقتصادية بعد.', flags: 64 });
        }

        let description = '';
        for (let i = 0; i < sorted.length; i++) {
            const [uId, bal] = sorted[i];
            const user = await interaction.client.users.fetch(uId).catch(() => null);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i + 1}**`;
            description += `${medal} ${user ? user.username : `\`${uId}\``} — **${bal.toLocaleString()} $SP**\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 قائمة أغنى 10 أعضاء (Spider Leaderboard)')
            .setDescription(description)
            .setColor('#FFD700')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};