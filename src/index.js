
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const backend = process.env.BACKEND_URL;
const apiKey = process.env.BACKEND_API_KEY;
const ownerId = process.env.OWNER_USER_ID;

const admins = new Set(
  (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
);

async function request(path, data) {
  if (!backend || !apiKey) {
    throw new Error("Backend not connected yet.");
  }

  const response = await fetch(
    `${backend.replace(/\/$/, "")}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Backend request failed.");
  }

  return result;
}

function makeModal(type) {
  const modal = new ModalBuilder()
    .setCustomId(`account:${type}`)
    .setTitle(type === "create" ? "Create Account" : "Login");

  const username = new TextInputBuilder()
    .setCustomId("username")
    .setLabel("Username")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const password = new TextInputBuilder()
    .setCustomId("password")
    .setLabel("Password")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(username),
    new ActionRowBuilder().addComponents(password)
  );

  return modal;
}

client.once(Events.ClientReady, bot => {
  console.log(`${bot.user.tag} is online!`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;

      if (command === "create" || command === "login") {
        return interaction.showModal(makeModal(command));
      }

      if (command === "addvbucks") {
        if (interaction.user.id !== ownerId) {
          return interaction.reply({
            content: "Only the owner can use this command.",
            ephemeral: true
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await request("/admin/addvbucks", {
          account: interaction.options.getString("account"),
          amount: interaction.options.getInteger("amount"),
          discordUserId: interaction.user.id
        });

        return interaction.editReply(
          result.message || "Request completed."
        );
      }

      if (command === "give") {
        if (
          interaction.user.id !== ownerId &&
          !admins.has(interaction.user.id)
        ) {
          return interaction.reply({
            content: "You are not authorised.",
            ephemeral: true
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await request("/admin/give", {
          account: interaction.options.getString("account"),
          item: interaction.options.getString("item"),
          quantity: interaction.options.getInteger("quantity"),
          discordUserId: interaction.user.id
        });

        return interaction.editReply(
          result.message || "Reward request completed."
        );
      }

      if (command === "server") {
        await interaction.deferReply({ ephemeral: true });

        const region = interaction.options.getString("region");

        const result = await request("/server/select", {
          region,
          discordUserId: interaction.user.id
        });

        return interaction.editReply(
          result.message || `Region selected: ${region}`
        );
      }
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("account:")
    ) {
      await interaction.deferReply({ ephemeral: true });

      const action = interaction.customId.split(":")[1];

      const result = await request(`/account/${action}`, {
        username: interaction.fields.getTextInputValue("username"),
        password: interaction.fields.getTextInputValue("password"),
        discordUserId: interaction.user.id
      });

      return interaction.editReply(
        result.message || "Request completed."
      );
    }
  } catch (error) {
    const message = error.message || "Something went wrong.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
