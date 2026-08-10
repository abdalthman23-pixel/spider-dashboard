const { sendLog } = require('../utils/logger');

module.exports = async (client, message) => {
    if (!message.guild || message.author?.bot) return;

    await sendLog(message.guild, {
        title: '🗑️ مسح رسالة',
        description: `تم مسح رسالة في القناة ${message.channel}`,
        color: '#ED4245',
        fields: [
            { name: '💬 المحتوى:', value: message.content || '*[تحتوي على ملف أو إمبد]*' }
        ],
        user: message.author
    });
};