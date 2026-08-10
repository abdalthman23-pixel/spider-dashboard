const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');

const gwPath = path.join(__dirname, '../../database/giveaways.json');

function getDb() {
    if (!fs.existsSync(gwPath)) fs.writeFileSync(gwPath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(gwPath, 'utf8')); } catch { return {}; }
}
function saveDb(data) { fs.writeFileSync(gwPath, JSON.stringify(data, null, 4)); }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gstart')
        .setDescription('🎉 بدء مسابقة وجيف أواي جديد')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('duration').setDescription('المدة (مثال: 1m, 1h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('الجائزة').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('عدد الفائزين (الافتراضي: 1)').setRequired(false)),

    async execute(interaction) {
        const durationInput = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const winnersCount = interaction.options.getInteger('winners') || 1;

        const durationMs = ms(durationInput);
        if (!durationMs) {
            return interaction.reply({ content: '❌ صيغة الوقت غير صحيحة! استخدم مثلاً: `10m` لدقائق أو `2h` لساعات.', flags: 64 });
        }

        const endTime = Date.now() + durationMs;

        const embed = new EmbedBuilder()
            .setTitle(`🎉 **مسابقة: ${prize}**`)
            .setDescription(`اضغط على الزر أدناه للدخول في المسابقة!\n\n👑 **عدد الفائزين:** \`${winnersCount}\`\n👥 **المشاركون حالياً:** \`0\`\n⏰ **تنتهي في:** <t:${Math.floor(endTime / 1000)}:R>`)
            .setColor('#5865F2')
            .setFooter({ text: `منظم المسابقة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(endTime);

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('gw_join_btn')
                .setLabel('دخول المسابقة (0)')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Primary)
        );

        // تم استبدال fetchReply بـ withResponse لمنع تحذيرات الترمينال
        const response = await interaction.reply({ embeds: [embed], components: [btn], withResponse: true });
        const replyMsg = response.resource ? response.resource.message : await interaction.fetchReply();

        const db = getDb();
        db[replyMsg.id] = {
            messageId: replyMsg.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id,
            prize: prize,
            winnersCount: winnersCount,
            endTime: endTime,
            hostedBy: interaction.user.id,
            participants: [],
            ended: false
        };
        saveDb(db);
    }
};