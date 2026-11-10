require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { commands } = require("./commands");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID,
      process.env.DISCORD_GUILD_ID
    ),
    { body: commands }
  );

  console.log("Project Sirius commands registered!");
}

main().catch(console.error);