const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../database/settings.json');

function getDb(p) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-setup')
        .setDescription('⚙️ الداشبورد المصغر لتهيئة وإدارة نظام الترحيب بالسيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const settings = getDb(settingsPath)[guildId] || {};

        const welcomeChan = settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : 'غير محدد ❌';
        const customMsg = settings.welcomeMessage || 'مرحباً بك {user} 👋 في سيرفر **{guild}**! أنت العضو رقم **#{memberCount}**.';

        // 1️⃣ إمبد الداشبورد المصغر
        const miniDashEmbed = new EmbedBuilder()
            .setTitle('🎛️ الداشبورد المصغر - إعدادات الترحيب')
            .setDescription('يمكنك التحكم السريع في رسالة وقناة الترحيب مباشرة من الأزرار أدناه:')
            .addFields(
                { name: '📥 روم الترحيب الحالية:', value: welcomeChan, inline: false },
                { name: '📝 نص الرسالة الحالي:', value: `\`\`\`${customMsg}\`\`\``, inline: false },
                { name: '📌 الرموز المتاحة (Variables):', value: '`{user}` (منشن) | `{username}` (اسم) | `{guild}` (السيرفر) | `{memberCount}` (العدد)', inline: false }
            )
            .setColor('#5865F2');

        // 2️⃣ إمبد الداشبورد الكامل (Web Dashboard)
        const webDashEmbed = new EmbedBuilder()
            .setTitle('🚀 هل تريد ترحيباً أكثر احترافية وجمالاً؟')
            .setDescription('✨ **في موقع الداشبورد الرسمي يمكنك:**\n• تصميم صور ترحيب مخصصة وتحديد خلفيات.\n• التحكم الكامل بالإمبدات والألوان والروابط.\n• تفعيل الرسائل التفاعلية والأزرار الاحترافية!')
            .setColor('#00FFB3');

        // 3️⃣ الأزرار (اختيار الروم + تعديل الرسالة + رابط موقع الداشبورد)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_open_welcome_channel')
                .setLabel('اختيار روم الترحيب 📥')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_open_msg_modal')
                .setLabel('تعديل رسالة الترحيب ✏️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setLabel('موقع الداشبورد الاحترافي 🌐')
                .setURL('https://spider-pro-dashboard.com')
                .setStyle(ButtonStyle.Link)
        );

        return interaction.reply({ embeds: [miniDashEmbed, webDashEmbed], components: [row] });
    }
};