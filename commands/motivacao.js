const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const dirPath = path.join(__dirname, "../data");
const filePath = path.join(dirPath, "motivacao.json");

function ensureFile() {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ frases: [] }, null, 2), "utf8");
  }
}

function carregarFrases() {
  ensureFile();
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return Array.isArray(parsed.frases) ? parsed.frases : [];
  } catch (e) {
    console.error("[motivacao] Erro lendo JSON:", e);
    return [];
  }
}

function salvarFrases(frases) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify({ frases }, null, 2), "utf8");
}

module.exports = {
  name: "motivacao",
  description: "Frases motivacionais para animar seu dia!",

  async execute(message, args) {
    try {
      const frases = carregarFrases();

      // Ajuda
      if (args[0] === "help") {
        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setTitle("🌟 Ajuda - Motivação")
          .setDescription("Veja abaixo os comandos disponíveis:")
          .addFields(
            { name: "✨ Frase motivacional", value: "`#motivacao`", inline: false },
            { name: "📋 Listar frases", value: "`#motivacao list`", inline: false },
            { name: "➕ Adicionar", value: "`#motivacao add <frase>`", inline: false },
            { name: "🗑️ Remover", value: "`#motivacao remove <id>`", inline: false }
          )
          .setFooter({ text: "Use as frases para se inspirar todo dia ✨" });

        return message.channel.send({ embeds: [embed] });
      }

      // Listar frases
      if (args[0] === "list") {
        if (frases.length === 0) {
          return message.reply("⚠️ Nenhuma frase cadastrada ainda! Adicione com `#motivacao add <frase>`.");
        }
        const lista = frases.map((f, i) => `**${i + 1}.** ${f}`).join("\n");
        return message.channel.send("📋 **Frases disponíveis:**\n" + lista);
      }

      // Adicionar frase
      if (args[0] === "add") {
        const novaFrase = args.slice(1).join(" ").trim();
        if (!novaFrase) return message.reply("⚠️ Escreva a frase que deseja adicionar!");
        frases.push(novaFrase);
        salvarFrases(frases);
        return message.channel.send("✅ Nova frase motivacional adicionada!");
      }

      // Remover frase
      if (args[0] === "remove") {
        const index = parseInt(args[1], 10) - 1;
        if (isNaN(index) || index < 0 || index >= frases.length) {
          return message.reply("⚠️ Informe um número válido da lista!");
        }
        const removida = frases.splice(index, 1)[0];
        salvarFrases(frases);
        return message.channel.send(`🗑️ Frase removida: ${removida}`);
      }

      // Frase aleatória
      if (args.length === 0) {
        if (frases.length === 0) {
          return message.reply("⚠️ Não há frases ainda. Adicione com `#motivacao add <frase>`.");
        }
        const frase = frases[Math.floor(Math.random() * frases.length)];
        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setTitle("🌟 Motivação do dia 🌟")
          .setDescription(frase)
          .setFooter({ text: "Continue firme, você consegue! 🚀" });

        return message.channel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error("[motivacao] Erro ao executar:", err);
      return message.reply("❌ Não consegui processar o comando. Veja o console para detalhes.");
    }
  }
};