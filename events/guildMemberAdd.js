const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const settingsPath = path.join(__dirname, '../database/settings.json');

function getSettings() {
    if (!fs.existsSync(settingsPath)) return {};
    try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { return {}; }
}

module.exports = async (client, member) => {
    const guild = member.guild;
    const settings = getSettings()[guild.id] || {};

    // 1️⃣ حماية البوتات (Anti-Bot System)
    if (member.user.bot) {
        if (settings.antiBot) {
            await member.kick('🛡️ Spider Shield: Anti-Bot System Enabled').catch(() => {});
            return;
        }
        if (settings.botRole) {
            await member.roles.add(settings.botRole).catch(() => {});
        }
        return;
    }

    // 2️⃣ إعطاء رتبة الأعضاء التلقائية (Auto Role)
    if (settings.userRole) {
        await member.roles.add(settings.userRole).catch(() => {});
    }

    // 3️⃣ إرسال إمبد الترحيب الخارجي في الشات (الخاص بالسيرفر)
    if (settings.welcomeChannel) {
        const welcomeChan = guild.channels.cache.get(settings.welcomeChannel);
        if (welcomeChan) {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`✨ أهلاً بك في ${guild.name}!`)
                .setDescription(`مرحباً بك ${member} 👋\nنورت السيرفر! أنت العضو رقم **#${guild.memberCount}**.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setColor('#00FFB3')
                .setFooter({ text: 'Spider Pro Welcome System' })
                .setTimestamp();

            await welcomeChan.send({ embeds: [welcomeEmbed] }).catch(() => {});
        }
    }

    // 💌 4️⃣ إرسال الرسالة الخاصة (DM) المخصصة للعضو الجديد
    const dmEmbed = new EmbedBuilder()
        .setTitle(`✨ أهلاً بك في ${guild.name}!`)
        .setDescription(
            `أهلاً بك يا ${member}، نورت السيرفر! 👋\n\n` +
            `🛠️ **تم تطوير هذا البوت من قبل Spider Team.**\n\n` +
            `💬 **رابط سيرفر الدعم الفني:**\nhttps://discord.gg/5fSzdkxQPc`
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .setColor('#5865F2')
        .setFooter({ text: 'Spider Pro • Powered by Spider Team' })
        .setTimestamp();

    // رابط دعوة البوت التلقائي
    const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`;

    const inviteRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('إضافة البوت لسيرفرك')
            .setURL(botInviteUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('🤖')
    );

    // إرسال للخاص مع تجنب إظهار خطأ إذا الخاص مقفل
    await member.send({ embeds: [dmEmbed], components: [inviteRow] }).catch(() => {});
};