const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../database/settings.json');
const gwPath = path.join(__dirname, '../database/giveaways.json');

function getDb(filePath) {
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify({}));
    }
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return {}; }
}

function saveDb(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

function ensureGuildSettings(guildId) {
    if (!guildId) return null;
    const allSettings = getDb(settingsPath);
    if (!allSettings[guildId]) {
        allSettings[guildId] = {
            language: 'ar',
            antiLink: false,
            antiBot: false,
            antiSpam: false,
            antiNuke: false,
            logChannel: null,
            welcomeChannel: null,
            welcomeMessage: null,
            lineChannels: [],
            lineUrl: null,
            trustedRoles: []
        };
        saveDb(settingsPath, allSettings);
    }
    return allSettings[guildId];
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // إذا طُلِب الملف كـ Function مباشرة (دعم لكلا الطريقتين في index.js)
        if (!client && interaction && interaction.client) {
            client = interaction.client;
        }

        // 🌐 0. معالجة اختيار لغة السيرفر
        if (interaction.isButton() && (interaction.customId === 'set_lang_ar' || interaction.customId === 'set_lang_en')) {
            let targetGuildId = interaction.guild?.id;

            if (!targetGuildId && interaction.message?.embeds[0]?.footer?.text) {
                const footerText = interaction.message.embeds[0].footer.text;
                const match = footerText.match(/Guild ID:\s*(\d+)/);
                if (match) targetGuildId = match[1];
            }

            if (!targetGuildId) {
                return interaction.reply({ content: '❌ لم يتم التعرف على السيرفر المطلوب.', flags: 64 });
            }

            ensureGuildSettings(targetGuildId);
            const selectedLang = interaction.customId === 'set_lang_ar' ? 'ar' : 'en';
            const allSettings = getDb(settingsPath);

            if (!allSettings[targetGuildId]) allSettings[targetGuildId] = {};
            allSettings[targetGuildId].language = selectedLang;
            saveDb(settingsPath, allSettings);

            if (selectedLang === 'ar') {
                const arEmbed = new EmbedBuilder()
                    .setTitle('✅ تم ضبط لغة البوت على: العربية 🇸🇦')
                    .setDescription('ستظهر جميع رسائل البوت وإعداداته باللغة العربية في هذا السيرفر.')
                    .setColor('#57F287');
                return interaction.reply({ embeds: [arEmbed] });
            } else {
                const enEmbed = new EmbedBuilder()
                    .setTitle('✅ Server language set to: English 🇬🇧')
                    .setDescription('All bot responses and settings will now be in English for this server.')
                    .setColor('#57F287');
                return interaction.reply({ embeds: [enEmbed] });
            }
        }

        if (interaction.guild) {
            ensureGuildSettings(interaction.guild.id);
        }

        const guildId = interaction.guild?.id;

        // 1. تشغيل أوامر السلاش (/ commands)
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`❌ لم يتم العثور على الأمر: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`❌ خطأ في تنفيذ الأمر ${interaction.commandName}:`, error);
                const errorReply = { content: '❌ حدث خطأ غير متوقع أثناء تنفيذ هذا الأمر!', flags: 64 };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorReply).catch(() => {});
                } else {
                    await interaction.reply(errorReply).catch(() => {});
                }
            }
            return;
        }

        // 2. إعدادات الترحيب
        if (interaction.isButton() && interaction.customId === 'btn_open_welcome_channel') {
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('select_welcome_channel')
                .setPlaceholder('اختر قناة الترحيب النصية...')
                .setChannelTypes(ChannelType.GuildText)
                .setMinValues(1)
                .setMaxValues(1);

            return interaction.reply({
                content: '📥 **اختر القناة النصية التي سيتم إرسال رسائل وإمبدات الترحيب بها:**',
                components: [new ActionRowBuilder().addComponents(channelSelect)],
                flags: 64
            });
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'select_welcome_channel') {
            const selectedChannelId = interaction.values[0];
            const allSettings = getDb(settingsPath);
            
            allSettings[guildId].welcomeChannel = selectedChannelId;
            saveDb(settingsPath, allSettings);

            const embed = new EmbedBuilder()
                .setTitle('✅ تم تحديد روم الترحيب بنجاح!')
                .setDescription(`سيقوم البوت الآن بإرسال إمبد الترحيب فور دخول أي عضو جديد إلى القناة: <#${selectedChannelId}>`)
                .setColor('#57F287');

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (interaction.isButton() && interaction.customId === 'btn_open_msg_modal') {
            const settings = getDb(settingsPath)[guildId] || {};

            const modal = new ModalBuilder()
                .setCustomId('modal_save_welcome_msg')
                .setTitle('✏️ تعديل رسالة الترحيب');

            const currentText = settings.welcomeMessage || "مرحباً بك {user} 👋 في سيرفر {guild}! أنت العضو رقم #{memberCount}.";

            const textInput = new TextInputBuilder()
                .setCustomId('input_welcome_text')
                .setLabel('اكتب نص الترحيب (استخدم {user}, {guild})')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(currentText)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_save_welcome_msg') {
            const newMsg = interaction.fields.getTextInputValue('input_welcome_text');
            const allSettings = getDb(settingsPath);
            
            allSettings[guildId].welcomeMessage = newMsg;
            saveDb(settingsPath, allSettings);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ تم حفظ رسالة الترحيب بنجاح!')
                .setDescription(`**النص الجديد الخاص بسيرفركم:**\n\`\`\`${newMsg}\`\`\`\n\n💡 **نصيحة:** للتحكم المتقدم وتصاميم الصور، تفضل بزيارة **موقع الداشبورد الرسمي**!`)
                .setColor('#57F287');

            return interaction.reply({ embeds: [successEmbed], flags: 64 });
        }

        // 3. إعدادات الحماية واللوج
        if (interaction.isButton() && interaction.customId.startsWith('prot_')) {
            const allSettings = getDb(settingsPath);
            const settings = allSettings[guildId];

            if (interaction.customId === 'prot_toggle_all') {
                const newState = !settings.antiLink;
                settings.antiLink = newState;
                settings.antiBot = newState;
                settings.antiSpam = newState;
                settings.antiNuke = newState;
                saveDb(settingsPath, allSettings);
                return interaction.reply({ content: `✅ **تم ${newState ? 'تفعيل' : 'تعطيل'} جميع أنظمة الحماية لهذا السيرفر بنجاح!**`, flags: 64 });
            }

            if (interaction.customId === 'prot_toggle_links') settings.antiLink = !settings.antiLink;
            if (interaction.customId === 'prot_toggle_bots') settings.antiBot = !settings.antiBot;
            if (interaction.customId === 'prot_toggle_spam') settings.antiSpam = !settings.antiSpam;
            if (interaction.customId === 'prot_toggle_nuke') settings.antiNuke = !settings.antiNuke;

            saveDb(settingsPath, allSettings);

            if (interaction.customId === 'prot_set_log_channel') {
                const channelSelect = new ChannelSelectMenuBuilder()
                    .setCustomId('select_log_channel')
                    .setPlaceholder('اختر القناة النصية لإرسال اللوجات والسجلات...')
                    .setChannelTypes(ChannelType.GuildText)
                    .setMinValues(1)
                    .setMaxValues(1);

                return interaction.reply({
                    content: '📜 **اختر القناة التي تريد إرسال سجلات الحذف، التعديل، ودخول الأعضاء فيها:**',
                    components: [new ActionRowBuilder().addComponents(channelSelect)],
                    flags: 64
                });
            }

            if (interaction.customId === 'prot_set_trusted') {
                const roleSelect = new RoleSelectMenuBuilder()
                    .setCustomId('select_trusted_roles')
                    .setPlaceholder('اختر الرتب الموثوقة التي تُستثنى من العقوبات...')
                    .setMinValues(0)
                    .setMaxValues(5);

                return interaction.reply({
                    content: '👑 **اختر الرتب التي تمتلك ثقة كاملة في السيرفر (لن تطبق عليها أنظمة الحماية):**',
                    components: [new ActionRowBuilder().addComponents(roleSelect)],
                    flags: 64
                });
            }

            return interaction.reply({ content: '⚙️ تم تحديث حالة إعدادات الحماية للسيرفر بنجاح!', flags: 64 });
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'select_log_channel') {
            const selectedChannelId = interaction.values[0];
            const allSettings = getDb(settingsPath);
            
            allSettings[guildId].logChannel = selectedChannelId;
            saveDb(settingsPath, allSettings);

            const embed = new EmbedBuilder()
                .setTitle('✅ تم تحديد قناة اللوج بنجاح!')
                .setDescription(`سيقوم البوت بإرسال كافة السجلات في القناة: <#${selectedChannelId}>`)
                .setColor('#57F287');

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (interaction.isRoleSelectMenu() && interaction.customId === 'select_trusted_roles') {
            const selectedRoles = interaction.values;
            const allSettings = getDb(settingsPath);
            
            allSettings[guildId].trustedRoles = selectedRoles;
            saveDb(settingsPath, allSettings);

            return interaction.reply({
                content: `👑 **تم تحديث الرتب الموثوقة للسيرفر بنجاح!**\nالرتب المحددة: ${selectedRoles.map(r => `<@&${r}>`).join(', ')}`,
                flags: 64
            });
        }

        // 4. التفاعل مع المسابقات (Giveaways)
        if (interaction.isButton() && interaction.customId === 'gw_join_btn') {
            const db = getDb(gwPath);
            const gw = db[interaction.message.id];

            if (!gw || gw.ended || Date.now() > gw.endTime) {
                return interaction.reply({ content: '❌ هذه المسابقة انتهت أو تم إلغاؤها.', flags: 64 });
            }

            const userId = interaction.user.id;
            const exists = gw.participants.includes(userId);

            if (exists) {
                gw.participants = gw.participants.filter(id => id !== userId);
                await interaction.reply({ content: '❌ تم إلغاء اشتراكك من المسابقة.', flags: 64 });
            } else {
                gw.participants.push(userId);
                await interaction.reply({ content: '🎉 تم تسجيل اشتراكك بنجاح في المسابقة! بالتوفيق.', flags: 64 });
            }

            saveDb(gwPath, db);

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setDescription(`اضغط على الزر أدناه للدخول في المسابقة!\n\n👑 **عدد الفائزين:** \`${gw.winnersCount || 1}\`\n👥 **المشاركون حالياً:** \`${gw.participants.length}\`\n⏰ **تنتهي في:** <t:${Math.floor(gw.endTime / 1000)}:R>`);

            const updatedBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('gw_join_btn')
                    .setLabel(`دخول المسابقة (${gw.participants.length})`)
                    .setEmoji('🎉')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedBtn] }).catch(() => {});
            return;
        }

        // 5. قائمة المساعدة
        if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
            const selected = interaction.values[0];
            const embed = new EmbedBuilder().setColor('#5865F2');

            if (selected === 'help_mod') {
                embed.setTitle('🛡️ أوامر الإدارة والرقابة')
                    .setDescription('`/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/clear`, `/warn`, `/warnings`, `/remove-warn`, `/clear-warns`, `/lock`, `/unlock`, `/hide`, `/show`, `/slowmode`, `/setnickname`, `/role-add`, `/role-remove`');
            } else if (selected === 'help_eco') {
                embed.setTitle('💰 أوامر الاقتصاد و Spider Pounds')
                    .setDescription('`/balance`, `/daily`, `/transfer`, `/top`, `/add-pounds` (خاص بمالك البوت)');
            } else if (selected === 'help_voice') {
                embed.setTitle('🔊 أوامر الرومات الصوتية')
                    .setDescription('`/vmove`, `/vmoveall`, `/vkick`');
            } else if (selected === 'help_gen') {
                embed.setTitle('⚙️ الأوامر العامة والخدمات')
                    .setDescription('`/server-info`, `/roles-list`, `/dashboard`, `/welcome-setup`, `/setup-protection`, `/setup-logs`, `/add-emoji`, `/set-role-icon`, `/gstart`, `/gend`, `/gcancel`, `/greroll`');
            }

            return interaction.update({ embeds: [embed] });
        }
    }
};