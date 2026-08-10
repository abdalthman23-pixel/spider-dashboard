const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const gwPath = path.join(__dirname, '../../database/giveaways.json');

function getDb() {
    if (!fs.existsSync(gwPath)) fs.writeFileSync(gwPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(gwPath, 'utf8')); } catch { return {}; }
}
function saveDb(data) { fs.writeFileSync(gwPath, JSON.stringify(data, null, 4)); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gend')
        .setDescription('إنهاء المسابقة فوراً واختيار الفائزين')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(opt => opt.setName('message_id').setDescription('ID رسالة المسابقة').setRequired(true)),

    async execute(interaction) {
        const msgId = interaction.options.getString('message_id').trim();
        const db = getDb();
        const gw = db[msgId];

        if (!gw || gw.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ لم يتم العثور على مسابقة بهذا الـ ID في هذا السيرفر.', flags: 64 });
        }

        if (gw.ended) {
            return interaction.reply({ content: '⚠️ هذه المسابقة منتهية بالفعل!', flags: 64 });
        }

        gw.ended = true;
        saveDb(db);

        const winners = [];
        const pool = [...gw.participants];

        for (let i = 0; i < Math.min(gw.winnerCount, pool.length); i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            winners.push(pool.splice(randomIndex, 1)[0]);
        }

        const channel = interaction.guild.channels.cache.get(gw.channelId);
        if (channel) {
            const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
            if (msg) {
                const endEmbed = EmbedBuilder.from(msg.embeds[0])
                    .setTitle(`🎉 انتهت المسابقة: ${gw.prize}`)
                    .setDescription(`**الفائزون:** ${winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : 'لا يوجد مشاركون'}`)
                    .setColor('#2F3136');
                await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
            }
        }

        if (winners.length > 0) {
            return interaction.reply({ content: `🎊 **مبارك للفائزين بالجائزة (${gw.prize}):** ${winners.map(w => `<@${w}>`).join(', ')}` });
        } else {
            return interaction.reply({ content: '❌ انتهت المسابقة ولكن لم يشارك أحد للأسف!' });
        }
    }
};