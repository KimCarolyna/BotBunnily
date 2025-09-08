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
const favPath = path.join(__dirname, "../data/favorites.json");

// Garante que os arquivos existam
if (!fs.existsSync(dicPath)) fs.writeFileSync(dicPath, "[]");
if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, "{}");
if (!fs.existsSync(favPath)) fs.writeFileSync(favPath, "{}");

module.exports = {
  name: "dic",
  description:
    "Dicionário de palavras (add, list, search, remove, random, history, fav, top, desafio)",
  category: "📖 Estudos",

  async execute(message, args) {
    let dic = JSON.parse(fs.readFileSync(dicPath, "utf8"));
    let history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
    let favs = JSON.parse(fs.readFileSync(favPath, "utf8"));

    const subcommand = args.shift();

    // ----------- ADD -----------
    if (subcommand === "add") {
      const partes = args.join(" ").split("|").map((p) => p.trim());
      const palavra = partes[0];
      const definicao = partes[1];
      const sinonimos = partes[2]
        ? partes[2].replace(/sinônimos:/i, "").split(",").map((s) => s.trim())
        : [];
      const exemplo = partes[3]?.replace(/exemplo:/i, "").trim() || null;
      const categoria = partes[4]?.replace(/categoria:/i, "").trim() || "geral";

      if (!palavra || !definicao) {
        return message.reply(
          "⚠️ Use: `#dic add palavra | definição | sinônimos: opcional,opcional | exemplo: opcional | categoria: opcional`"
        );
      }

      if (dic.find((item) => item.palavra.toLowerCase() === palavra.toLowerCase())) {
        const msg = await message.reply("❌ Essa palavra já existe no dicionário.");
        msg.react("❌");
        return;
      }

      dic.push({ palavra, definicao, sinonimos, exemplo, categoria });
      fs.writeFileSync(dicPath, JSON.stringify(dic, null, 2));

      const msg = await message.reply(`✅ Palavra adicionada: **${palavra}** (categoria: ${categoria})`);
      msg.react("✅");
      return;
    }

    // ----------- LIST -----------
    if (subcommand === "list") {
      if (dic.length === 0) return message.reply("⚠️ Nenhuma palavra cadastrada.");

      let index = 0;
      let item = dic[index];

      const buildEmbed = (data) => {
        const embed = new EmbedBuilder()
          .setTitle(`📖 ${data.palavra}`)
          .setDescription(data.definicao)
          .setColor("Blue")
          .setFooter({ text: `Categoria: ${data.categoria || "geral"}` });

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

      const quickRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("known").setLabel("👍 Já conhecia").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("unknown").setLabel("👎 Não conhecia").setStyle(ButtonStyle.Danger)
      );

      const msg = await message.reply({ embeds: [embed], components: [row, quickRow] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: "⚠️ Só quem usou o comando pode interagir.", ephemeral: true });
        }

        if (interaction.customId === "prev") {
          index = (index - 1 + dic.length) % dic.length;
          item = dic[index];
          await interaction.update({ embeds: [buildEmbed(item)], components: [row, quickRow] });
        } else if (interaction.customId === "next") {
          index = (index + 1) % dic.length;
          item = dic[index];
          await interaction.update({ embeds: [buildEmbed(item)], components: [row, quickRow] });
        } else if (interaction.customId === "known") {
          await interaction.reply({ content: "✅ Legal! Você já conhecia essa palavra.", ephemeral: true });
        } else if (interaction.customId === "unknown") {
          await interaction.reply({ content: "📚 Bom saber! Agora você aprendeu algo novo.", ephemeral: true });
        }
      });
      return;
    }

    // ----------- SEARCH -----------
    if (subcommand === "search") {
      const termo = args.join(" ").toLowerCase();
      if (!termo) return message.reply("⚠️ Use: `#dic search palavra`");

      const encontrados = dic.filter(
        (item) =>
          item.palavra.toLowerCase().includes(termo) ||
          (item.sinonimos && item.sinonimos.some((s) => s.toLowerCase().includes(termo)))
      );

      if (encontrados.length === 0) return message.reply("❌ Palavra não encontrada.");

      // Registrar histórico
      encontrados.forEach((item) => {
        if (!history[item.palavra]) history[item.palavra] = 0;
        history[item.palavra]++;
      });
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      let resposta = "🔎 **Resultados encontrados:**\n";
      encontrados.forEach((item) => {
        resposta += `\n📖 **${item.palavra}** — ${item.definicao}`;
        if (item.sinonimos?.length) resposta += `\n   🔗 *Sinônimos:* ${item.sinonimos.join(", ")}`;
        if (item.exemplo) resposta += `\n   💡 *Exemplo:* ${item.exemplo}`;
        resposta += `\n   📌 *Categoria:* ${item.categoria || "geral"}\n`;
      });

      const quickRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("known").setLabel("👍 Já conhecia").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("unknown").setLabel("👎 Não conhecia").setStyle(ButtonStyle.Danger)
      );

      await message.channel.send({ content: resposta, components: [quickRow] });
      return;
    }

    // ----------- RANDOM -----------
    if (subcommand === "random") {
      let categoria = args[0]?.toLowerCase();
      let lista = dic;

      if (categoria) {
        lista = dic.filter((item) => item.categoria?.toLowerCase() === categoria);
        if (lista.length === 0) return message.reply(`⚠️ Nenhuma palavra na categoria **${categoria}**.`);
      }

      const random = lista[Math.floor(Math.random() * lista.length)];
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Palavra aleatória: ${random.palavra}`)
        .setDescription(random.definicao)
        .setColor("Green")
        .setFooter({ text: `Categoria: ${random.categoria || "geral"}` });

      if (random.sinonimos?.length) {
        embed.addFields({ name: "🔗 Sinônimos", value: random.sinonimos.join(", ") });
      }
      if (random.exemplo) {
        embed.addFields({ name: "💡 Exemplo", value: `\`\`\`${random.exemplo}\`\`\`` });
      }

      const quickRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("known").setLabel("👍 Já conhecia").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("unknown").setLabel("👎 Não conhecia").setStyle(ButtonStyle.Danger)
      );

      return message.channel.send({ embeds: [embed], components: [quickRow] });
    }

    // ----------- FAVORITOS -----------
    if (subcommand === "fav") {
      const action = args.shift();
      const userId = message.author.id;

      if (!favs[userId]) favs[userId] = [];

      if (action === "add") {
        const termo = args.join(" ").toLowerCase();
        const item = dic.find((i) => i.palavra.toLowerCase() === termo);
        if (!item) return message.reply("❌ Palavra não encontrada no dicionário.");

        if (favs[userId].some((fav) => fav.palavra === item.palavra)) {
          return message.reply("⚠️ Essa palavra já está nos seus favoritos.");
        }

        // Salva com data de inclusão
        favs[userId].push({ palavra: item.palavra, data: Date.now() });
        fs.writeFileSync(favPath, JSON.stringify(favs, null, 2));

        return message.reply(`⭐ Palavra adicionada aos favoritos: **${item.palavra}**\n📅 Você receberá lembretes para revisar.`);
      }

      if (action === "list") {
        if (favs[userId].length === 0) return message.reply("⚠️ Você ainda não tem favoritos.");

        let texto = "⭐ **Seus favoritos:**\n";
        favs[userId].forEach((p) => {
          texto += `- ${p.palavra} (adicionado em ${new Date(p.data).toLocaleDateString("pt-BR")})\n`;
        });

        return message.channel.send(texto);
      }

      return message.reply("⚠️ Use: `#dic fav add palavra` ou `#dic fav list`");
    }

    // ----------- HELP -----------
    return message.reply(
      "📖 **Comandos disponíveis:**\n" +
        "`#dic add palavra | definição | sinônimos: opcional | exemplo: opcional | categoria: opcional`\n" +
        "`#dic list`\n" +
        "`#dic search palavra`\n" +
        "`#dic remove palavra`\n" +
        "`#dic random [categoria]`\n" +
        "`#dic history`\n" +
        "`#dic top`\n" +
        "`#dic fav add palavra`\n" +
        "`#dic fav list`\n" +
        "`#dic desafio`"
    );
  },
};

// ---------------------------
// Função de revisão programada
// ---------------------------
setInterval(() => {
  let favs = JSON.parse(fs.readFileSync(favPath, "utf8"));
  const agora = Date.now();

  for (const userId in favs) {
    favs[userId].forEach((fav) => {
      const tempo = agora - fav.data;
      // 1 hora, 1 dia, 1 semana
      if (
        Math.abs(tempo - 3600000) < 60000 || // 1h
        Math.abs(tempo - 86400000) < 60000 || // 1d
        Math.abs(tempo - 604800000) < 60000   // 7d
      ) {
        const user = global.client.users.cache.get(userId);
        if (user) {
          user.send(`📅 Revisão: lembre-se da palavra **${fav.palavra}**!`);
        }
      }
    });
  }
}, 60000); // verifica a cada 1 minuto