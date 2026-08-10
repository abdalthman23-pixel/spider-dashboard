const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../database/settings.json');

function getDb() {
    if (!fs.existsSync(settingsPath)) return {};
    try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { return {}; }
}

async function sendLog(guild, { title, description, color, fields, user }) {
    if (!guild) return;
    const settings = getDb()[guild.id] || {};
    if (!settings.logChannel) return;

    const logChan = guild.channels.cache.get(settings.logChannel);
    if (!logChan) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || null)
        .setColor(color || '#5865F2')
        .setTimestamp();

    if (fields && fields.length > 0) embed.addFields(fields);
    if (user) embed.setFooter({ text: `المُتسبب / العضو: ${user.tag}`, iconURL: user.displayAvatarURL() });

    await logChan.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendLog };