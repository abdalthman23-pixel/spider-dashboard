const { sendLog } = require('../utils/logger');

module.exports = async (client, member) => {
    await sendLog(member.guild, {
        title: '🚪 مغادرة / طرد عضو',
        description: `غادر العضو ${member} (\`${member.id}\`) السيرفر.`,
        color: '#ED4245',
        fields: [
            { name: '👥 عدد الأعضاء الحالي:', value: `**${member.guild.memberCount}**` }
        ],
        user: member.user
    });
};