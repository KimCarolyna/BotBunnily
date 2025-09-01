// commands/help.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Mostra a lista de comandos disponíveis",
  async execute(message) {
// Monta lista automaticamente
    let lista = "";
    comandos.forEach(cmd => {
      lista += `\`#${cmd.name}\` — ${cmd.description || "Sem descrição"}\n`;
    });
    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("📚 Lista de Comandos")
      .setDescription("Aqui estão todos os comandos disponíveis no bot:\n(Prefixo: `#`)")
      .addFields(
        { name: "⚙️ Utilitários", value: "`#ping` • Testa conexão\n`#avatar @user` • Mostra avatar\n`#say <msg>` • Bot repete mensagem" },
        { name: "🧠 Estudos", value: "`#flash add` • Adiciona flashcard\n`#flash list` • Lista flashcards\n`#flash remove <n>` • Remove flashcard\n`#flash play [qtd]` • Sessão flashcards\n`#flash stop` • Encerra sessão\n`#quiz start` • Inicia quiz\n`#resumo <matéria>` • Gerencia resumos\n`#questoes add` • Gerencia questões" },
        { name: "📅 Organização", value: "`#tarefas add <texto>` • Gerencia tarefas\n`#agenda add <evento>` • Agenda evento\n`#pomodoro [minutos]` • Timer Pomodoro" },
        { name: "🎲 Diversão", value: "`#coinflip` • Cara ou coroa\n`#motivacao` • Frases motivacionais\n`#dicionario <palavra>` • Consulta dicionário" }
      )
      .setFooter({ text: "Use os comandos com # antes do nome (ex: #ping)" });

    await message.channel.send({ embeds: [embed] });
  }
};