module.exports = {
  name: "coinflip",
  description: "Joga uma moeda e retorna Cara ou Coroa",
  execute(message) {
    const result = Math.random() < 0.5 ? "🪙 Caiu **Cara**!" : "🪙 Caiu **Coroa**!";
    message.channel.send(result);
  },
};