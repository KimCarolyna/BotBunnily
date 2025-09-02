// commands/flash.js
const fs = require("fs");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const flashPath = "./data/flashcards.json";
if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync(flashPath)) fs.writeFileSync(flashPath, "[]");

// sessões em memória: uma por usuário+canal
const sessions = new Map();

module.exports = {
  name: "flash",
  description: "Sistema de flashcards (add, list, play, remove, stop)",
  async execute(message, args) {
    const flashcards = JSON.parse(fs.readFileSync(flashPath));

    const sub = (args[0] || "").toLowerCase();

    // ---------------- ADD ----------------
    if (sub === "add") {
      const partes = args
        .slice(1)
        .join(" ")
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);

      const pergunta = partes.shift();
      if (!pergunta || partes.length < 2) {
        return message.reply(
          "⚠️ Use: `#flash add pergunta | opção1* | opção2 | opção3...` (marque a correta com `*`)."
        );
      }

      let correta = null;
      const alternativas = partes.map((alt) => {
        if (alt.endsWith("*")) {
          correta = alt.slice(0, -1).trim();
          return correta;
        }
        return alt;
      });

      if (!correta)
        return message.reply("⚠️ Você precisa marcar a resposta correta com `*`.");

      flashcards.push({ pergunta, alternativas, correta });
      fs.writeFileSync(flashPath, JSON.stringify(flashcards, null, 2));

      const emb = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("✅ Flashcard adicionado!")
        .setDescription(
          `**Q:** ${pergunta}\n\n${alternativas
            .map((a, i) => `${i + 1}. ${a}`)
            .join("\n")}\n\n✔ **Correta:** ${correta}`
        );

      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- LIST ----------------
    if (sub === "list") {
      if (flashcards.length === 0)
        return message.reply("⚠️ Nenhum flashcard salvo.");
      const emb = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`📚 Flashcards (${flashcards.length})`)
        .setDescription(
          flashcards
            .map((c, i) => `**${i + 1}.** ${c.pergunta}`)
            .join("\n")
            .slice(0, 4000)
        );
      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- REMOVE ----------------
    if (sub === "remove") {
      const index = parseInt(args[1], 10) - 1;
      if (isNaN(index) || index < 0 || index >= flashcards.length) {
        return message.reply(
          "⚠️ Use: `#flash remove número` (veja os números em `#flash list`)."
        );
      }
      const [removido] = flashcards.splice(index, 1);
      fs.writeFileSync(flashPath, JSON.stringify(flashcards, null, 2));

      const emb = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑️ Flashcard removido")
        .setDescription(`**Q:** ${removido.pergunta}`);
      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- STOP ----------------
    if (sub === "stop") {
      const key = `${message.channel.id}:${message.author.id}`;
      const sess = sessions.get(key);
      if (!sess)
        return message.reply("ℹ️ Você não tem uma sessão de flashcards ativa.");
      sess.collector?.stop("stopped_by_user");
      return;
    }

    // ---------------- PLAY ----------------
    if (sub === "play") {
      if (flashcards.length === 0)
        return message.reply("⚠️ Nenhum flashcard salvo.");

      let qtd = parseInt(args[1], 10);
      if (isNaN(qtd) || qtd <= 0 || qtd > flashcards.length)
        qtd = flashcards.length;

      const key = `${message.channel.id}:${message.author.id}`;
      if (sessions.has(key)) {
        return message.reply(
          "⚠️ Você já tem uma sessão ativa. Use `#flash stop` para encerrar e iniciar outra."
        );
      }

      const order = [...flashcards.keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, qtd);

      const sess = {
        index: 0,
        order,
        score: 0,
        total: order.length,
        currentCard: null,
        collector: null,
      };
      sessions.set(key, sess);

      await message.channel.send(
        "🔴 **Modo flashcards iniciado!** Use `#flash stop` para encerrar."
      );

      // Coletor de botões
      const collector = message.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        idle: 30000,
      });
      sess.collector = collector;

      const sendNext = async () => {
        if (sess.index >= sess.total) {
          collector.stop("finished");
          return;
        }

        const card = flashcards[sess.order[sess.index]];
        sess.currentCard = card;

        const emb = new EmbedBuilder()
          .setColor("Gold")
          .setTitle(`❓ ${card.pergunta}`)
          .setFooter({
            text: `Pergunta ${sess.index + 1}/${sess.total}`,
          });

        const row = new ActionRowBuilder();
        card.alternativas.forEach((alt, i) => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`alt_${i}`)
              .setLabel(`${i + 1}`)
              .setStyle(ButtonStyle.Secondary)
          );
        });

        await message.channel.send({ embeds: [emb], components: [row] });
      };

      await sendNext();

      collector.on("collect", async (interaction) => {
        if (!sess.currentCard) return;

        const escolhaIndex = parseInt(
          interaction.customId.split("_")[1],
          10
        );
        const card = sess.currentCard;
        const alt = card.alternativas[escolhaIndex];

        if (alt === card.correta) {
          sess.score++;
          await interaction.reply({
            content: "✅ **Correto!**",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ **Errado!** A resposta certa era: **${card.correta}**`,
            ephemeral: true,
          });
        }

        sess.index++;
        await sendNext();
      });

      collector.on("end", async (_collected, reason) => {
        sessions.delete(key);
        const emb = new EmbedBuilder()
          .setColor("Green")
          .setTitle("📊 Sessão finalizada")
          .setDescription(`Pontuação: **${sess.score}/${sess.total}**`)
          .setFooter({
            text:
              reason === "stopped_by_user"
                ? "Encerrado pelo usuário."
                : reason === "idle"
                ? "Tempo esgotado (inatividade)."
                : "Concluído.",
          });

        await message.channel.send({ embeds: [emb] });
      });

      return;
    }

    // ---------------- HELP ----------------
    const help = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("📎 Flashcards — comandos")
      .setDescription(
        [
          "`#flash add pergunta | opção1* | opção2 | opção3`  → adiciona (marque a correta com *)",
          "`#flash list`                                     → lista os flashcards",
          "`#flash remove <n>`                               → remove pelo número mostrado no list",
          "`#flash play [qtd]`                               → inicia sessão com botões (opcional: qtd)",
          "`#flash stop`                                     → encerra a sessão atual",
        ].join("\n")
      );
    return message.channel.send({ embeds: [help] });
  },
};