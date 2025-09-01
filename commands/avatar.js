module.exports = {
  name: "avatar",
  description: "Mostra o avatar do usuário",
  execute(message) {
    const user = message.mentions.users.first() || message.author;
    message.reply(user.displayAvatarURL({ dynamic: true, size: 512 }));
  },
};