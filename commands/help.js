// commands/help.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Mostra a lista de comandos disponíveis",
  async execute(message, args, client) {
    const comandos = client.commands;

    // Gera lista dinâmica dos comandos
    const lista = comandos.map(cmd => `\`#${cmd.name}\` — ${cmd.description || "Sem descrição"}`).join("\n");

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("📚 Lista de Comandos")
      .setDescription(`Aqui estão todos os comandos disponíveis no bot:\n\n${lista}`)
      .setFooter({ text: "Use os comandos com # antes do nome (ex: #ping)" });

    await message.channel.send({ embeds: [embed] });
  }
};