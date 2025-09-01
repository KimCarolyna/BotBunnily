const { EmbedBuilder } = require("discord.js");

// Armazena os timers ativos por usuário
const pomodorosAtivos = new Map();

module.exports = {
  name: "pomodoro",
  description: "Inicia ou para um timer de estudo estilo Pomodoro",
  execute(message, args) {
    const action = args[0];

    // Se o comando for "stop"
    if (action === "stop") {
      if (pomodorosAtivos.has(message.author.id)) {
        clearTimeout(pomodorosAtivos.get(message.author.id).timeoutFinal);
        pomodorosAtivos.get(message.author.id).timeoutsExtras.forEach(t => clearTimeout(t));
        pomodorosAtivos.delete(message.author.id);

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("🛑 Pomodoro cancelado")
          .setDescription("Seu Pomodoro foi interrompido com sucesso.");
        return message.channel.send({ embeds: [embed] });
      } else {
        return message.reply("⚠️ Você não tem nenhum Pomodoro em andamento.");
      }
    }

    // Se for iniciar
    const minutos = parseInt(action);

    if (isNaN(minutos) || minutos <= 0) {
      return message.reply("⚠️ Informe um tempo válido em minutos! Exemplo: `#pomodoro 25` ou `#pomodoro stop`");
    }

    // Cancela qualquer Pomodoro já ativo do usuário
    if (pomodorosAtivos.has(message.author.id)) {
      clearTimeout(pomodorosAtivos.get(message.author.id).timeoutFinal);
      pomodorosAtivos.get(message.author.id).timeoutsExtras.forEach(t => clearTimeout(t));
    }

    const totalSegundos = minutos * 60;
    const intervalos = [0.25, 0.5, 0.75]; // lembretes: 25%, 50% e 75%
    const timeoutsExtras = [];

    const embedStart = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle("⏳ Pomodoro iniciado!")
      .setDescription(`Tempo total: **${minutos} minutos**\n\nFoque nos estudos, você consegue! 🐇✨`)
      .setFooter({ text: "Use `#pomodoro stop` para cancelar." });

    message.channel.send({ embeds: [embedStart] });

    intervalos.forEach(pct => {
      const t = setTimeout(() => {
        const minutosRestantes = Math.ceil(minutos * (1 - pct));
        const progresso = "▰".repeat(pct * 10) + "▱".repeat(10 - pct * 10);

        const lembrete = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("📌 Lembrete do Pomodoro")
          .setDescription(`Progresso: \`${progresso}\`\nAinda faltam **${minutosRestantes} minutos**! 🚀`);

        message.channel.send({ embeds: [lembrete] });
      }, totalSegundos * pct * 1000);

      timeoutsExtras.push(t);
    });

    const timeoutFinal = setTimeout(() => {
      const fim = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ Pomodoro finalizado!")
        .setDescription("Hora de fazer uma pausa ☕\nBom trabalho, você mandou bem! 🐇");

      message.channel.send({ embeds: [fim] });

      message.author.send({ embeds: [fim] }).catch(() => {
        message.reply("⚠️ Não consegui enviar no DM (talvez esteja bloqueado).");
      });

      pomodorosAtivos.delete(message.author.id);
    }, totalSegundos * 1000);

    pomodorosAtivos.set(message.author.id, { timeoutFinal, timeoutsExtras });
  }
};