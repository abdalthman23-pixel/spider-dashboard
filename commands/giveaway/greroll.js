const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const gwPath = path.join(__dirname, '../../database/giveaways.json');

function getDb() {
    if (!fs.existsSync(gwPath)) fs.writeFileSync(gwPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(gwPath, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('إعادة اختيار فائز جديد لمسابقة انتهت')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(opt => opt.setName('message_id').setDescription('ID رسالة المسابقة').setRequired(true)),

    async execute(interaction) {
        const msgId = interaction.options.getString('message_id').trim();
        const db = getDb();
        const gw = db[msgId];

        if (!gw || gw.guildId !== interaction.guild.id) {
            return interaction.reply({ content: '❌ لم يتم العثور على المسابقة!', flags: 64 });
        }

        if (!gw.participants || gw.participants.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد مشاركين لإعادة الاختيار بينهم!', flags: 64 });
        }

        const newWinner = gw.participants[Math.floor(Math.random() * gw.participants.length)];
        return interaction.reply({ content: `🎉 **الفائز الجديد بالجائزة (${gw.prize}) هو:** <@${newWinner}>! مبروك!` });
    }
};