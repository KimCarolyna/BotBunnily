const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Carregar comandos da pasta
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// Mensagem de boas-vindas
client.on("guildMemberAdd", (member) => {
  const canal = member.guild.systemChannel;
  if (canal) {
    const embed = new EmbedBuilder()
      .setColor("Pink")
      .setTitle("🐇 Bem-vindo!")
      .setDescription(`Olá ${member}, seja bem-vindo ao servidor **${member.guild.name}**! 🎉`)
      .setThumbnail(member.user.displayAvatarURL());
    canal.send({ embeds: [embed] });
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // --- NOVA FUNÇÃO: Resposta ao @Bot help ---
  const isMentioned = message.mentions.has(client.user);
  if (isMentioned && message.content.toLowerCase().includes("help")) {
    const helpCommand = client.commands.get("help");
    if (helpCommand) {
      await helpCommand.execute(message, [], client);
    }
    return; // evita rodar a parte de prefixo
  }
  // -----------------------------------------

  // Comando com prefixo
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply("⚠️ Ocorreu um erro ao executar o comando!");
  }
});

require("dotenv").config();
client.login(process.env.DISCORD_TOKEN);