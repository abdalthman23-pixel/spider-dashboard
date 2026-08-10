const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// دالة لجمع الأوامر من جميع المجلدات والمجلدات الفرعية
function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath); // قراءة المجلدات الفرعية
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ تم تجهيز الأمر: /${command.data.name}`);
            } else {
                console.log(`⚠️ تحذير: الأمر في ${filePath} يفتقد لخاصية "data" أو "execute".`);
            }
        }
    }
}

loadCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log(`\n🔄 جاري رفع وتسجيل (${commands.length}) أمر سلاش إلى ديسكورد...`);

        // رفع الأوامر عالمياً لجميع السيرفرات (Global Commands)
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );

        console.log(`\n🎉 تم تسجيل (${data.length}) أمر سلاش بنجاح على جميع السيرفرات!`);
    } catch (error) {
        console.error('❌ حدث خطأ أثناء رفع الأوامر:', error);
    }
})();