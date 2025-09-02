const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const dicPath = path.join(__dirname, "../data/dictionary.json");
const historyPath = path.join(__dirname, "../data/history.json");

// Garante que os arquivos existam
if (!fs.existsSync(dicPath)) fs.writeFileSync(dicPath, "[]");
if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, "{}");

module.exports = {
  name: "dic",
  description: "Dicionário de palavras (add, list, search, remove, random, history)",
  category: "📖 Estudos",

  async execute(message, args) {
    let dic = JSON.parse(fs.readFileSync(dicPath, "utf8"));
    let history = JSON.parse(fs.readFileSync(historyPath, "utf8"));

    const subcommand = args.shift();

    // ----------- ADD -----------
    if (subcommand === "add") {
      const partes = args.join(" ").split("|").map(p => p.trim());
      const palavra = partes[0];
      const definicao = partes[1];
      const sinonimos = partes[2]
        ? partes[2].replace(/sinônimos:/i, "").split(",").map(s => s.trim())
        : [];
      const exemplo = partes[3]?.replace(/exemplo:/i, "").trim() || null;

      if (!palavra || !definicao) {
        return message.reply(
          "⚠️ Use: `#dic add palavra | definição | sinônimos: opcional,opcional | exemplo: opcional`"
        );
      }

      if (dic.find(item => item.palavra.toLowerCase() === palavra.toLowerCase())) {
        return message.reply("⚠️ Essa palavra já existe no dicionário.");
      }

      dic.push({ palavra, definicao, sinonimos, exemplo });
      fs.writeFileSync(dicPath, JSON.stringify(dic, null, 2));
      return message.reply(`✅ Palavra adicionada: **${palavra}**`);
    }

    // ----------- LIST (com botões ⬅️➡️) -----------
    if (subcommand === "list") {
      if (dic.length === 0) return message.reply("⚠️ Nenhuma palavra cadastrada.");

      let index = 0;
      let item = dic[index];

      const buildEmbed = (data) => {
        const embed = new EmbedBuilder()
          .setTitle(`📖 ${data.palavra}`)
          .setDescription(data.definicao)
          .setColor("Blue");

        if (data.sinonimos?.length) {
          embed.addFields({ name: "🔗 Sinônimos", value: data.sinonimos.join(", ") });
        }
        if (data.exemplo) {
          embed.addFields({ name: "💡 Exemplo", value: `\`\`\`${data.exemplo}\`\`\`` });
        }
        return embed;
      };

      const embed = buildEmbed(item);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary)
      );

      const msg = await message.reply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: "⚠️ Só quem usou o comando pode navegar.", ephemeral: true });
        }

        if (interaction.customId === "prev") {
          index = (index - 1 + dic.length) % dic.length;
        } else if (interaction.customId === "next") {
          index = (index + 1) % dic.length;
        }

        item = dic[index];
        await interaction.update({ embeds: [buildEmbed(item)], components: [row] });
      });
      return;
    }

    // ----------- SEARCH -----------
    if (subcommand === "search") {
      const termo = args.join(" ").toLowerCase();
      if (!termo) return message.reply("⚠️ Use: `#dic search palavra`");

      const encontrados = dic.filter(item =>
        item.palavra.toLowerCase().includes(termo) ||
        (item.sinonimos && item.sinonimos.some(s => s.toLowerCase().includes(termo)))
      );

      if (encontrados.length === 0) return message.reply("❌ Palavra não encontrada.");

      // Registrar histórico
      encontrados.forEach(item => {
        if (!history[item.palavra]) history[item.palavra] = 0;
        history[item.palavra]++;
      });
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      let resposta = "🔎 **Resultados encontrados:**\n";
      encontrados.forEach(item => {
        resposta += `\n📖 **${item.palavra}** — ${item.definicao}`;
        if (item.sinonimos?.length) resposta += `\n   🔗 *Sinônimos:* ${item.sinonimos.join(", ")}`;
        if (item.exemplo) resposta += `\n   💡 *Exemplo:* ${item.exemplo}`;
      });

      return message.channel.send(resposta);
    }

    // ----------- REMOVE -----------
    if (subcommand === "remove") {
      const termo = args.join(" ").toLowerCase();
      if (!termo) return message.reply("⚠️ Use: `#dic remove palavra`");

      const index = dic.findIndex(item => item.palavra.toLowerCase() === termo);
      if (index === -1) return message.reply("❌ Palavra não encontrada no dicionário.");

      const removido = dic.splice(index, 1);
      fs.writeFileSync(dicPath, JSON.stringify(dic, null, 2));
      return message.reply(`🗑️ Palavra removida: **${removido[0].palavra}**`);
    }

    // ----------- RANDOM -----------
    if (subcommand === "random") {
      if (dic.length === 0) return message.reply("⚠️ Nenhuma palavra cadastrada.");

      const random = dic[Math.floor(Math.random() * dic.length)];
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Palavra do dia: ${random.palavra}`)
        .setDescription(random.definicao)
        .setColor("Green");

      if (random.sinonimos?.length) {
        embed.addFields({ name: "🔗 Sinônimos", value: random.sinonimos.join(", ") });
      }
      if (random.exemplo) {
        embed.addFields({ name: "💡 Exemplo", value: `\`\`\`${random.exemplo}\`\`\`` });
      }

      return message.channel.send({ embeds: [embed] });
    }

    // ----------- HISTORY -----------
    if (subcommand === "history") {
      if (Object.keys(history).length === 0) return message.reply("⚠️ Nenhuma busca registrada ainda.");

      let texto = "📊 **Histórico de buscas:**\n\n";
      const sorted = Object.entries(history).sort((a, b) => b[1] - a[1]);

      sorted.forEach(([palavra, count], i) => {
        texto += `${i + 1}. **${palavra}** — pesquisada **${count}x**\n`;
      });

      return message.channel.send(texto);
    }

    // ----------- HELP -----------
    return message.reply(
      "📖 **Comandos disponíveis:**\n" +
      "`#dic add palavra | definição | sinônimos: opcional,opcional | exemplo: opcional`\n" +
      "`#dic list`\n" +
      "`#dic search palavra`\n" +
      "`#dic remove palavra`\n" +
      "`#dic random`\n" +
      "`#dic history`"
    );
  }
};