const fs = require("fs");
const dicPath = "./data/dictionary.json";
const historyPath = "./data/history.json";

if (!fs.existsSync(dicPath)) fs.writeFileSync(dicPath, "[]");
if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, "{}");

module.exports = {
  name: "dic",
  description: "Dicionário de palavras (add, list, search, remove, random, history)",
  category: "📖 Estudos",
  async execute(message, args) {
    let dic = JSON.parse(fs.readFileSync(dicPath));
    let history = JSON.parse(fs.readFileSync(historyPath));

    // ----------- ADD -----------
    if (args[0] === "add") {
      const partes = args.slice(1).join(" ").split("|").map(p => p.trim());
      const palavra = partes[0];
      const definicao = partes[1];
      const sinonimos = partes[2] ? partes[2].replace("sinônimos:", "").split(",").map(s => s.trim()) : [];

      if (!palavra || !definicao) {
        return message.reply("⚠️ Use: `#dic add palavra | definição | sinônimos: opcional,opcional`");
      }

      if (dic.find(item => item.palavra.toLowerCase() === palavra.toLowerCase())) {
        return message.reply("⚠️ Essa palavra já existe no dicionário.");
      }

      dic.push({ palavra, definicao, sinonimos });
      fs.writeFileSync(dicPath, JSON.stringify(dic, null, 2));
      return message.reply(`✅ Palavra adicionada: **${palavra}**`);
    }

    // ----------- LIST -----------
    if (args[0] === "list") {
      if (dic.length === 0) return message.reply("⚠️ Nenhuma palavra cadastrada.");
      let texto = `📚 **Dicionário (${dic.length})**:\n\n`;
      dic.forEach((item, i) => {
        texto += `${i + 1}. **${item.palavra}** — ${item.definicao}\n`;
      });
      return message.channel.send(texto);
    }

    // ----------- SEARCH -----------
    if (args[0] === "search") {
      const termo = args.slice(1).join(" ").toLowerCase();
      if (!termo) return message.reply("⚠️ Use: `#dic search palavra`");

      const encontrados = dic.filter(item =>
        item.palavra.toLowerCase().includes(termo) ||
        (item.sinonimos && item.sinonimos.some(s => s.toLowerCase().includes(termo)))
      );

      if (encontrados.length === 0) return message.reply("❌ Palavra não encontrada.");

      // 🔥 Registrar histórico
      encontrados.forEach(item => {
        if (!history[item.palavra]) history[item.palavra] = 0;
        history[item.palavra]++;
      });
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      let resposta = "🔎 **Resultados encontrados:**\n";
      encontrados.forEach(item => {
        resposta += `\n📖 **${item.palavra}** — ${item.definicao}`;
        if (item.sinonimos?.length) resposta += `\n   🔗 *Sinônimos:* ${item.sinonimos.join(", ")}`;
      });
      return message.channel.send(resposta);
    }

    // ----------- REMOVE -----------
    if (args[0] === "remove") {
      const index = parseInt(args[1]) - 1;
      if (isNaN(index) || index < 0 || index >= dic.length) {
        return message.reply("⚠️ Use: `#dic remove número`");
      }
      const removido = dic.splice(index, 1);
      fs.writeFileSync(dicPath, JSON.stringify(dic, null, 2));
      return message.reply(`🗑️ Palavra removida: **${removido[0].palavra}**`);
    }

    // ----------- RANDOM -----------
    if (args[0] === "random") {
      if (dic.length === 0) return message.reply("⚠️ Nenhuma palavra cadastrada.");
      const random = dic[Math.floor(Math.random() * dic.length)];
      let resposta = `🎲 **Palavra do dia:**\n📖 **${random.palavra}** — ${random.definicao}`;
      if (random.sinonimos?.length) resposta += `\n🔗 *Sinônimos:* ${random.sinonimos.join(", ")}`;
      return message.channel.send(resposta);
    }

    // ----------- HISTORY -----------
    if (args[0] === "history") {
      if (Object.keys(history).length === 0) return message.reply("⚠️ Nenhuma busca registrada ainda.");

      let texto = "📊 **Histórico de buscas:**\n\n";
      const sorted = Object.entries(history).sort((a, b) => b[1] - a[1]); // ordena por mais pesquisadas
      sorted.forEach(([palavra, count], i) => {
        texto += `${i + 1}. **${palavra}** — pesquisada **${count}x**\n`;
      });

      return message.channel.send(texto);
    }
  }
};