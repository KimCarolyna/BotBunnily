const fs = require("fs");
const path = require("path");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const filePath = path.join(__dirname, "../data/resumos.json");

function loadData() {
  if (!fs.existsSync(filePath)) return { resumos: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

module.exports = {
  name: "questao",
  description: "Visualizar questões de resumos com botões",
  async execute(message, args) {
    const data = loadData();
    const titulo = args.join(" ").trim();
    const resumo = data.resumos.find(r => r.titulo.toLowerCase() === titulo.toLowerCase());

    if (!resumo) return message.reply("⚠️ Resumo não encontrado.");
    if (resumo.questoes.length === 0) return message.reply("❌ Nenhuma questão cadastrada nesse resumo.");

    let index = 0;

    const embed = new EmbedBuilder()
      .setTitle(`❓ Questão de ${resumo.titulo}`)
      .setDescription(`${resumo.questoes[index].pergunta}\n\n💡 **Resposta:** ${resumo.questoes[index].resposta}`)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prevQ").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("nextQ").setLabel("➡️").setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.customId === "prevQ") {
        index = (index - 1 + resumo.questoes.length) % resumo.questoes.length;
      } else if (interaction.customId === "nextQ") {
        index = (index + 1) % resumo.questoes.length;
      }

      const newEmbed = new EmbedBuilder()
        .setTitle(`❓ Questão de ${resumo.titulo}`)
        .setDescription(`${resumo.questoes[index].pergunta}\n\n💡 **Resposta:** ${resumo.questoes[index].resposta}`)
        .setColor("Green");

      await interaction.update({ embeds: [newEmbed], components: [row] });
    });
  },
};