const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل في القناة (حتى 500 رسالة)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt => 
            opt.setName('amount')
               .setDescription('عدد الرسائل المراد مسحها (من 1 إلى 500)')
               .setMinValue(1)
               .setMaxValue(500) // 👈 تم رفع الحد الأقصى هنا إلى 500
               .setRequired(true)
        ),

    async execute(interaction) {
        let amount = interaction.options.getInteger('amount');

        // تأجيل الرد لأن مسح 500 رسالة قد يتطلب بضع ثوانٍ
        await interaction.deferReply({ flags: 64 });

        let totalDeleted = 0;

        try {
            // حلقة تكرارية لمسح الرسائل على دفعتين أو أكثر (كل دفعة 100 كحد أقصى)
            while (amount > 0) {
                const deleteSize = amount > 100 ? 100 : amount;
                
                // مسح الدفعة الحالية (يتم الاستثناء تلقائياً للرسائل الأقدم من 14 يوم حسب شروط ديسكورد)
                const deleted = await interaction.channel.bulkDelete(deleteSize, true);
                
                if (deleted.size === 0) break; // إذا لم يتبقَ رسائل قابلة للمسح

                totalDeleted += deleted.size;
                amount -= deleted.size;

                // الانتظار ثانيتين بين كل دفعة لعدم التسبب في Rate Limit
                if (amount > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🧹 تم تطهير الشات بنجاح')
                .setDescription(`تم مسح **${totalDeleted}** رسالة من القناة بنجاح بواسطة ${interaction.user}.`)
                .setColor('#57F287')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في مسح الرسائل:', error);
            return interaction.editReply({ 
                content: '❌ حدث خطأ أثناء مسح الرسائل! تنبيه: لا يمكن مسح الرسائل التي مر عليها أكثر من 14 يوماً.' 
            });
        }
    }
};