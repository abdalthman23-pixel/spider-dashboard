const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// تتبع عدد الرسائل لمعالجة منع السبيام (Anti-Spam)
const userSpamMap = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const dbDir = path.join(__dirname, '../database');

        const loadConfig = (fileName) => {
            const p = path.join(dbDir, `${guildId}_${fileName}.json`);
            return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
        };

        const protection = loadConfig('protection');
        const repliesConfig = loadConfig('replies');
        const commandsConfig = loadConfig('commands');

        // 🛡️ 1. فحص الرتب الموثوقة (Trusted Roles)
        let isTrusted = false;
        if (protection && protection.trustedRoles && Array.isArray(protection.trustedRoles)) {
            isTrusted = protection.trustedRoles.some(roleId => message.member.roles.cache.has(roleId)) || message.member.permissions.has('Administrator');
        } else if (message.member.permissions.has('Administrator')) {
            isTrusted = true;
        }

        // 🛡️ 2. تطبيق نظام الحماية والعقوبات
        if (protection && !isTrusted) {
            let penaltyAction = null;
            let penaltyMinutes = 5;
            let reasonText = '';

            // أ) منع الروابط
            if (protection.links && message.content.match(/https?:\/\/[^\s]+/g)) {
                penaltyAction = protection.linkAction || 'warn';
                penaltyMinutes = parseInt(protection.linkMuteTime) || 5;
                reasonText = 'إرسال روابط غير مصرح بها';
            }

            // ب) منع المنشن الجماعي
            if (!penaltyAction && protection.massMention && (message.content.includes('@everyone') || message.content.includes('@here'))) {
                penaltyAction = protection.mentionAction || 'warn';
                penaltyMinutes = parseInt(protection.mentionMuteTime) || 5;
                reasonText = 'استخدام المنشن الجماعي';
            }

            // ج) منع السبيام (Anti-Spam)
            if (!penaltyAction && protection.antiSpam) {
                const now = Date.now();
                const userData = userSpamMap.get(message.author.id) || { count: 0, lastMsg: now };
                if (now - userData.lastMsg < 2000) {
                    userData.count += 1;
                } else {
                    userData.count = 1;
                }
                userData.lastMsg = now;
                userSpamMap.set(message.author.id, userData);

                if (userData.count >= 5) {
                    penaltyAction = protection.spamAction || 'mute';
                    penaltyMinutes = parseInt(protection.spamMuteTime) || 10;
                    reasonText = 'التكرار والإزعاج (Anti-Spam)';
                    userSpamMap.delete(message.author.id);
                }
            }

            // تنفيذ العقوبة فوراً
            if (penaltyAction) {
                await message.delete().catch(() => {});

                if (penaltyAction === 'warn') {
                    return message.channel.send(`⚠️ <@${message.author.id}> يمنع **${reasonText}** في هذا السيرفر!`).then(m => setTimeout(() => m.delete(), 4000));
                } else if (penaltyAction === 'mute') {
                    await message.member.timeout(penaltyMinutes * 60 * 1000, reasonText).catch(() => {});
                    return message.channel.send(`🔇 تم إعطاء <@${message.author.id}> ميوت مؤقت لمدة **${penaltyMinutes} دقائق** بسبب: ${reasonText}`);
                } else if (penaltyAction === 'kick') {
                    await message.member.kick(reasonText).catch(() => {});
                    return message.channel.send(`👞 تم طرد <@${message.author.id}> من السيرفر بسبب: ${reasonText}`);
                } else if (penaltyAction === 'ban') {
                    await message.member.ban({ reason: reasonText }).catch(() => {});
                    return message.channel.send(`🔨 تم حظر <@${message.author.id}> نهائياً من السيرفر بسبب: ${reasonText}`);
                }
            }
        }

        // 💬 3. الردود التلقائية (محدثة لتعمل بدقة وسلاسة)
        if (repliesConfig && repliesConfig.replies) {
            const rawMessage = message.content.trim();
            const lowerMessage = rawMessage.toLowerCase();

            for (const [keyword, response] of Object.entries(repliesConfig.replies)) {
                if (keyword.trim() === '' || !response) continue;

                const cleanKey = keyword.trim().toLowerCase();

                // مطابقة تامة أو مطابقة مرنة للنص
                if (lowerMessage === cleanKey || rawMessage === keyword.trim()) {
                    return message.channel.send(response);
                }
            }
        }

        // ⚡ 4. تنفيذ الاختصارات والأوامر
        if (commandsConfig) {
            const args = message.content.trim().split(/ +/);
            const trigger = args.shift().toLowerCase();

            for (const [cmdName, conf] of Object.entries(commandsConfig)) {
                if (!conf.enabled) continue;

                const isAliasMatch = conf.aliases && conf.aliases.some(a => a.toLowerCase() === trigger);

                if (isAliasMatch) {
                    if (conf.channel && conf.channel !== 'all' && conf.channel !== message.channel.id) {
                        return message.reply(`❌ لا يمكنك استخدام هذا الاختصار في هذا الروم!`).then(m => setTimeout(() => m.delete(), 4000));
                    }

                    if (conf.roles && !conf.roles.includes('everyone')) {
                        const hasRole = conf.roles.some(rId => message.member.roles.cache.has(rId) || (rId === 'admin' && message.member.permissions.has('Administrator')));
                        if (!hasRole) {
                            return message.reply(`❌ ليس لديك الرتبة المسموح لها باستخدام هذا الاختصار!`).then(m => setTimeout(() => m.delete(), 4000));
                        }
                    }

                    const command = client.commands.get(cmdName);
                    const targetMember = message.mentions.members.first();
                    const requiresMember = ['kick', 'ban', 'timeout', 'warn'].includes(cmdName);

                    if (requiresMember && !targetMember) {
                        const helpEmbed = new EmbedBuilder()
                            .setColor('#0088ff')
                            .setTitle(`ℹ️ طريقة استخدام أمر: /${cmdName}`)
                            .setDescription(`أنت تستخدم الاختصار **"${trigger}"** المخصص لأمر **/${cmdName}**.`)
                            .addFields(
                                { name: '📖 طريقة الاستخدام الصحيحة:', value: `\`${trigger} @العضو [السبب]\``, inline: false },
                                { name: '🏷️ الاختصارات المتاحة لهذا الأمر:', value: conf.aliases.map(a => `\`${a}\``).join(' ، ') || `\`${cmdName}\``, inline: false }
                            )
                            .setFooter({ text: 'Spider Pro Engine', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp();

                        return message.channel.send({ embeds: [helpEmbed] });
                    }

                    try {
                        const fakeInteraction = {
                            guild: message.guild, channel: message.channel, member: message.member, user: message.author, client: client, commandName: cmdName,
                            options: {
                                getMember: () => targetMember,
                                getUser: () => targetMember ? targetMember.user : message.author,
                                getString: (optName) => args.join(' ') || null,
                                getInteger: () => parseInt(args[0]) || null,
                            },
                            reply: async (options) => message.channel.send(options),
                            followUp: async (options) => message.channel.send(options),
                            deferReply: async () => message.channel.sendTyping(),
                            editReply: async (options) => message.channel.send(options)
                        };

                        if (command && typeof command.execute === 'function') {
                            await command.execute(fakeInteraction, client);
                        }
                    } catch (err) {
                        console.error(`خطأ أثناء تنفيذ الكوماند ${cmdName}:`, err);
                    }
                    break;
                }
            }
        }
    }
};