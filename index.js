const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server started");
});

require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const PUBG_API = "https://api.pubg.com/shards/steam";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// --------------------
// STATE
// --------------------
let lastMatchId = null;

// --------------------
// PUBG FETCH MATCH
// --------------------
async function fetchMatch(matchId) {
  const res = await axios.get(
    `${PUBG_API}/matches/${matchId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
        Accept: "application/vnd.api+json"
      }
    }
  );

  return res.data;
}

// --------------------
// CHECK MATCH LOOP
// --------------------
async function checkMatch() {
  try {
    const playerRes = await axios.get(
      `${PUBG_API}/players?filter[playerNames]=${process.env.PLAYER_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
          Accept: "application/vnd.api+json"
        }
      }
    );

    const player = playerRes.data.data[0];
    const matchId = player.relationships.matches.data[0].id;

    // no new match
    if (matchId === lastMatchId) return;

    lastMatchId = matchId;

    const match = await fetchMatch(matchId);

    const included = match.included;

    const me = included
      .filter(x => x.type === "participant")
      .find(p => p.attributes.stats.name === process.env.PLAYER_NAME)
      ?.attributes.stats;

    if (!me) return;

    // ONLY WIN
    if (me.winPlace !== 1) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const member = guild.members.cache.find(
      m => m.user.username === process.env.DISCORD_USERNAME
    );

    if (!member?.voice?.channel) return;

    const voiceChannel = member.voice.channel;

    const mentions = voiceChannel.members
      .map(m => `<@${m.id}>`)
      .join(" ");

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);

    const mapName = match.data.attributes.mapName;
    const duration = match.data.attributes.duration;

    channel.send(
      `🐔 **CHICKEN DINNER AUTO DETECTED!**\n\n` +
      `🗺 Map: ${mapName}\n` +
      `⏱ Duration: ${Math.floor(duration / 60)}m\n\n` +
      `${mentions}\n\n` +
      `💀 Kills: ${me.kills}\n` +
      `💥 Damage: ${me.damageDealt}`
    );

  } catch (err) {
    console.log("Error:", err.message);
  }
}

// --------------------
// START BOT
// --------------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // run every 60 seconds
  setInterval(checkMatch, 60000);
});

client.login(process.env.DISCORD_TOKEN);