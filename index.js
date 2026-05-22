require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const PUBG_API = "https://api.pubg.com/shards/steam";

let lastMatchId = null;

async function checkPlayer() {
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

    if (!player) return;

    const latestMatchId =
      player.relationships.matches.data[0].id;

    if (latestMatchId === lastMatchId) return;

    lastMatchId = latestMatchId;

    const matchRes = await axios.get(
      `${PUBG_API}/matches/${latestMatchId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
          Accept: "application/vnd.api+json"
        }
      }
    );

    const included = matchRes.data.included;

    const participant = included.find(
      x =>
        x.type === "participant" &&
        x.attributes.stats.name === process.env.PLAYER_NAME
    );

    if (!participant) return;

    const stats = participant.attributes.stats;

    if (stats.winPlace === 1) {

      const channel = await client.channels.fetch(
        process.env.CHANNEL_ID
      );

      channel.send(
        `🐔 CHICKEN DINNER!\n` +
        `🎮 ${stats.name}\n` +
        `💀 Kills: ${stats.kills}`
      );
    }

  } catch (err) {
    console.log(err.message);
  }
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(checkPlayer, 120000);
});

client.login(process.env.DISCORD_TOKEN);