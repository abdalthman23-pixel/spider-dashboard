const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const ecoPath = path.join(__dirname, '../../database/economy.json');

function getDb(p) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function saveDb(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 4)); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-pounds')
        .setDescription('👑 [خاص بالمطور] إضافة أو خصم Spider Pounds لأي عضو')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المستهدف').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('المبلغ (يمكن كتابة رقم بالسالب للخصم)').setRequired(true)),

    async execute(interaction) {
        // 🔒 التحقق من أن منفذ الأمر هو أونر البوت المباشر
        if (interaction.user.id !== config.ownerId) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص فقط لمالك البوت (Bot Owner)!', flags: 64 });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const ecoDb = getDb(ecoPath);
        const currentBal = ecoDb[target.id] || 0;
        const newBal = currentBal + amount;

        ecoDb[target.id] = newBal;
        saveDb(ecoPath, ecoDb);

        const isAdd = amount >= 0;
        const embed = new EmbedBuilder()
            .setTitle(isAdd ? '👑 تم إضافة أرباح / رصيد' : '👑 تم خصم رصيد')
            .addFields(
                { name: '👤 العضو:', value: `${target} (\`${target.id}\`)`, inline: true },
                { name: isAdd ? '➕ المبلغ المضاف:' : '➖ المبلغ المخصوم:', value: `**${Math.abs(amount).toLocaleString()} $SP**`, inline: true },
                { name: '💰 الرصيد الجديد:', value: `**${newBal.toLocaleString()} Spider Pounds**`, inline: false }
            )
            .setColor(isAdd ? '#00FFB3' : '#ED4245')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};