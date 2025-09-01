module.exports = {
  name: "say",
  description: "Repete a mensagem",
  execute(message, args) {
    if (!args.length) return message.reply("Digite algo pra eu repetir!");
    message.channel.send(args.join(" "));
  },
};