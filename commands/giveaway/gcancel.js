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
        .setName('gcancel')
        .setDescription('إلغاء مسابقة قائمة بدون تحديد فائزين')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(opt => opt.setName('message_id').setDescription('ID رسالة المسابقة').setRequired(true)),

    async execute(interaction) {
        const msgId = interaction.options.getString('message_id').trim();
        const db = getDb();
        const gw = db[msgId];

        if (!gw || gw.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ لم يتم العثور على المسابقة!', flags: 64 });
        }

        gw.ended = true;
        saveDb(db);

        const channel = interaction.guild.channels.cache.get(gw.channelId);
        if (channel) {
            const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
            if (msg) {
                const cancelEmbed = EmbedBuilder.from(msg.embeds[0])
                    .setTitle(`❌ تم إلغاء المسابقة: ${gw.prize}`)
                    .setDescription('تم إلغاء هذه المسابقة بواسطة الإدارة.')
                    .setColor('#ED4245');
                await msg.edit({ embeds: [cancelEmbed], components: [] }).catch(() => {});
            }
        }

        return interaction.reply({ content: '🚫 **تم إلغاء المسابقة بنجاح.**' });
    }
};