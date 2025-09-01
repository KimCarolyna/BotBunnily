// commands/flash.js
const fs = require("fs");
const { EmbedBuilder } = require("discord.js");

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
      const partes = args.slice(1).join(" ").split("|").map(p => p.trim()).filter(Boolean);
      const pergunta = partes.shift();
      if (!pergunta || partes.length < 2) {
        return message.reply("⚠️ Use: `#flash add pergunta | opção1* | opção2 | opção3...` (marque a correta com `*`).");
      }

      let correta = null;
      const alternativas = partes.map(alt => {
        if (alt.endsWith("*")) {
          correta = alt.slice(0, -1).trim();
          return correta;
        }
        return alt;
      });

      if (!correta) return message.reply("⚠️ Você precisa marcar a resposta correta com `*`.");

      flashcards.push({ pergunta, alternativas, correta });
      fs.writeFileSync(flashPath, JSON.stringify(flashcards, null, 2));

      const emb = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("✅ Flashcard adicionado!")
        .setDescription(`**Q:** ${pergunta}\n\n${alternativas.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\n✔ **Correta:** ${correta}`);

      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- LIST ----------------
    if (sub === "list") {
      if (flashcards.length === 0) return message.reply("⚠️ Nenhum flashcard salvo.");
      const emb = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`📚 Flashcards (${flashcards.length})`)
        .setDescription(flashcards.map((c, i) => `**${i + 1}.** ${c.pergunta}`).join("\n").slice(0, 4000));
      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- REMOVE ----------------
    if (sub === "remove") {
      const index = parseInt(args[1], 10) - 1;
      if (isNaN(index) || index < 0 || index >= flashcards.length) {
        return message.reply("⚠️ Use: `#flash remove número` (veja os números em `#flash list`).");
      }
      const [removido] = flashcards.splice(index, 1);
      fs.writeFileSync(flashPath, JSON.stringify(flashcards, null, 2));

      const emb = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑️ Flashcard removido")
        .setDescription(`**Q:** ${removido.pergunta}`);
      return message.channel.send({ embeds: [emb] });
    }

    // ---------------- STOP (encerra sessão em andamento) ----------------
    if (sub === "stop") {
      const key = `${message.channel.id}:${message.author.id}`;
      const sess = sessions.get(key);
      if (!sess) return message.reply("ℹ️ Você não tem uma sessão de flashcards ativa.");
      sess.collector?.stop("stopped_by_user");
      return; // o resumo sai no 'end'
    }

    // ---------------- PLAY (sequencial) ----------------
    if (sub === "play") {
      if (flashcards.length === 0) return message.reply("⚠️ Nenhum flashcard salvo.");

      // quantidade opcional: #flash play 5
      let qtd = parseInt(args[1], 10);
      if (isNaN(qtd) || qtd <= 0 || qtd > flashcards.length) qtd = flashcards.length;

      const key = `${message.channel.id}:${message.author.id}`;
      if (sessions.has(key)) {
        return message.reply("⚠️ Você já tem uma sessão ativa. Use `#flash stop` para encerrar e iniciar outra.");
      }

      // ordem (embaralha e corta na quantidade)
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

      // cria collector para as respostas numéricas do autor
      const filter = m => m.author.id === message.author.id && /^\d+$/.test(m.content.trim());
      const collector = message.channel.createMessageCollector({ filter, idle: 30000 }); // 30s sem resposta -> encerra
      sess.collector = collector;

      // função para enviar a próxima pergunta
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
          .setFooter({ text: `Pergunta ${sess.index + 1}/${sess.total} • responda com o número (1, 2, 3, ...)` })
          .setDescription(card.alternativas.map((a, i) => `${i + 1}. ${a}`).join("\n"));

        await message.channel.send({ embeds: [emb] });
      };

      // primeira pergunta
      await message.channel.send("🔴 **Modo flashcards iniciado!** Use `#flash stop` para encerrar.");
      await sendNext();

      collector.on("collect", async (m) => {
        const escolha = parseInt(m.content.trim(), 10);
        const card = sess.currentCard;
        if (!card) return;

        const alt = card.alternativas[escolha - 1];
        if (!alt) {
          await message.channel.send("⚠️ Resposta inválida. Digite o **número** da alternativa.");
          return;
        }

        if (alt === card.correta) {
          sess.score++;
          await message.channel.send("✅ **Correto!**");
        } else {
          await message.channel.send(`❌ **Errado!** A resposta certa era: **${card.correta}**`);
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
          .setFooter({ text: reason === "stopped_by_user" ? "Encerrado pelo usuário." : (reason === "idle" ? "Tempo esgotado (inatividade)." : "Concluído.") });

        await message.channel.send({ embeds: [emb] });
      });

      return;
    }

    // ---------------- AJUDA ----------------
    const help = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("📎 Flashcards — comandos")
      .setDescription([
        "`#flash add pergunta | opção1* | opção2 | opção3`  → adiciona (marque a correta com *)",
        "`#flash list`                                     → lista os flashcards",
        "`#flash remove <n>`                               → remove pelo número mostrado no list",
        "`#flash play [qtd]`                               → inicia sessão sequencial (opcional: qtd)",
        "`#flash stop`                                     → encerra a sessão atual",
      ].join("\n"));
    return message.channel.send({ embeds: [help] });
  }
};