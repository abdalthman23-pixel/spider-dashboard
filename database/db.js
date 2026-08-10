const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bot_guilds (
            guild_id VARCHAR(30) PRIMARY KEY,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log("✅ Database connected & Table created/verified");
}

async function syncGuilds(guildIds) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query("DELETE FROM bot_guilds");

        for (const guildId of guildIds) {
            await client.query(
                `
                INSERT INTO bot_guilds (guild_id, updated_at)
                VALUES ($1, CURRENT_TIMESTAMP)
                ON CONFLICT (guild_id)
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                `,
                [guildId]
            );
        }

        await client.query("COMMIT");
        console.log(`✅ Synced ${guildIds.length} guilds to PostgreSQL`);

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function addGuild(guildId) {
    await pool.query(
        `
        INSERT INTO bot_guilds (guild_id, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP)
        ON CONFLICT (guild_id)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        `,
        [guildId]
    );
}

async function removeGuild(guildId) {
    await pool.query(
        `
        DELETE FROM bot_guilds
        WHERE guild_id = $1
        `,
        [guildId]
    );
}

async function getGuilds() {
    const result = await pool.query("SELECT guild_id FROM bot_guilds");
    return result.rows.map(row => row.guild_id);
}

module.exports = {
    pool,
    initDatabase,
    syncGuilds,
    addGuild,
    removeGuild,
    getGuilds
};
