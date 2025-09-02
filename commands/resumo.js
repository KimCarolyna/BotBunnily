const fs = require("fs");
const path = require("path");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const filePath = path.join(__dirname, "../data/resumos.json");

function loadData() {
  if (!fs.existsSync(filePath)) return { resumos: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "resumo",
  description: "Gerenciar resumos com botões interativos",
  async execute(message, args) {
    const data = loadData();
    const subcommand = args.shift();

    // ================================
    // AJUDA / EXEMPLOS
    // ================================
    if (!subcommand || subcommand === "help") {
      const embed = new EmbedBuilder()
        .setTitle("📘 Comandos de Resumos")
        .setColor("Blue")
        .setDescription("Veja abaixo como usar os comandos do resumo:")
        .addFields(
          { name: "➕ Adicionar", value: "`#resumo add <Título> | <Conteúdo>`\nExemplo: `#resumo add Matemática | Equações de 2º grau`" },
          { name: "📂 Listar", value: "`#resumo list`\nExemplo: `#resumo list`" },
          { name: "🗑️ Remover", value: "`#resumo remove <Título>`\nExemplo: `#resumo remove Matemática`" }
        );

      return message.reply({ embeds: [embed] });
    }

    // ================================
    // ADICIONAR RESUMO
    // ================================
    if (subcommand === "add") {
      const [titulo, ...conteudoArr] = args.join(" ").split("|");
      if (!titulo || conteudoArr.length === 0) {
        return message.reply("⚠️ Use: `#resumo add <Título> | <Conteúdo>`\nExemplo: `#resumo add História | Revolução Francesa`");
      }

      const conteudo = conteudoArr.join("|").trim();

      data.resumos.push({ titulo: titulo.trim(), conteudo });
      saveData(data);

      return message.reply(`✅ Resumo **${titulo.trim()}** adicionado com sucesso!`);
    }

    // ================================
    // LISTAR RESUMOS
    // ================================
    if (subcommand === "list") {
      if (data.resumos.length === 0) return message.reply("📂 Nenhum resumo salvo.");

      let index = 0;
      let resumo = data.resumos[index];

      const embed = new EmbedBuilder()
        .setTitle(`📘 ${resumo.titulo}`)
        .setDescription(resumo.conteudo)
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary)
      );

      const msg = await message.reply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.customId === "prev") {
          index = (index - 1 + data.resumos.length) % data.resumos.length;
        } else if (interaction.customId === "next") {
          index = (index + 1) % data.resumos.length;
        }

        resumo = data.resumos[index];
        const newEmbed = new EmbedBuilder()
          .setTitle(`📘 ${resumo.titulo}`)
          .setDescription(resumo.conteudo)
          .setColor("Blue");

        await interaction.update({ embeds: [newEmbed], components: [row] });
      });
    }

    // ================================
    // REMOVER RESUMO
    // ================================
    if (subcommand === "remove") {
      const titulo = args.join(" ").trim();
      if (!titulo) {
        return message.reply("⚠️ Use: `#resumo remove <Título>`\nExemplo: `#resumo remove Matemática`");
      }

      const index = data.resumos.findIndex(r => r.titulo.toLowerCase() === titulo.toLowerCase());
      if (index === -1) return message.reply(`❌ Nenhum resumo encontrado com o título **${titulo}**.`);

      data.resumos.splice(index, 1);
      saveData(data);

      return message.reply(`🗑️ Resumo **${titulo}** removido com sucesso!`);
    }
  },
};