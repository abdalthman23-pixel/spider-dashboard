const { sendLog } = require('../utils/logger');

module.exports = async (client, oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await sendLog(oldMessage.guild, {
        title: '✏️ تعديل رسالة',
        description: `تم تعديل رسالة في القناة ${oldMessage.channel} [انتقل للرسالة](${newMessage.url})`,
        color: '#FEE75C',
        fields: [
            { name: '📝 القيمة القديمة:', value: oldMessage.content || '*[فارغ]*' },
            { name: '✨ القيمة الجديدة:', value: newMessage.content || '*[فارغ]*' }
        ],
        user: oldMessage.author
    });
};