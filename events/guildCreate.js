const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } = require('discord.js');

module.exports = async (client, guild) => {
    try {
        let inviter = null;

        // 1️⃣ إيجاد العضو الذي قام بإضافة البوت عبر الـ Audit Logs
        try {
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.BotAdd,
            });
            const botAddLog = fetchedLogs.entries.first();
            if (botAddLog) {
                inviter = botAddLog.executor;
            }
        } catch (e) {
            console.log('⚠️ لم أتمكن من قراءة Audit Logs، سأقوم بالإرسال لمالك السيرفر بدلاً من ذلك.');
        }

        // إذا لم نجد من أضاف البوت من اللوجات، نرسلها لمالك السيرفر مباشرة (Owner)
        if (!inviter) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) inviter = owner.user;
        }

        if (!inviter) return;

        // 2️⃣ تجهيز إمبد الترحيب واختيار اللغة
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(` شكراً لاستخدامك بوت سبايدر برو في سيرفر: ${guild.name}`)
            .setDescription(
                '👋 **أهلاً بك! شكراً لإضافة البوت إلى سيرفرك.**\n' +
                'يرجى اختيار اللغة التي تريد أن يكمل بها البوت الإعدادات والرسائل في سيرفرك:\n\n' +
                '👋 **Welcome! Thank you for adding Spider Pro to your server.**\n' +
                'Please select the preferred language for your server below:'
            )
            .setColor('#5865F2')
            .setFooter({ text: `Spider Pro Multi-Language | Guild ID: ${guild.id}`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const langButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_lang_ar')
                .setLabel('العربية 🇸🇦')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_lang_en')
                .setLabel('English 🇬🇧')
                .setStyle(ButtonStyle.Secondary)
        );

        // 3️⃣ إرسال الرسالة إلى خاص العضو (DM)
        await inviter.send({ embeds: [welcomeEmbed], components: [langButtons] }).catch((err) => {
            console.log(`❌ لم أتمكن من إرسال الخاص لـ ${inviter.tag} لأن الخاص لديه مغلق.`);
        });

    } catch (error) {
        console.error('❌ خطأ في حدث guildCreate:', error);
    }
};