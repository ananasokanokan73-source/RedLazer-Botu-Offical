try { require("dotenv").config(); } catch {}
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionFlagsBits,
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, ActivityType, Events, MessageFlags,
} = require("discord.js");
const fs = require("fs");

const BOT_NAME = "REDLASER BOT";
const RED = 0xff2d3d;
const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
const DATA_FILE = "data.json";
const EPH = MessageFlags.Ephemeral;

const ADMIN_ROLE = "👑 Yönetici";
const MOD_ROLE = "🛡️ Moderatör";
const MEMBER_ROLE = "✅ Üye";
const TICKET_CATEGORY = "🎫 TİCKETLER";
const LINK_RE = /(https?:\/\/|discord\.gg\/|www\.)/i;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ---------- Veri ----------
let data = {};
try { data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { data = {}; }
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const gd = (id) => (data[id] ??= { xp: {}, warns: {}, config: {} });
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 50));
const xpCooldown = new Map();

async function sendLog(guild, embed) {
  const id = gd(guild.id).config.logChannel;
  const ch = id && guild.channels.cache.get(id);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}
const emb = (title, desc, color = RED) =>
  new EmbedBuilder().setTitle(title).setDescription(desc || null).setColor(color);

// ---------- Komut listesi ----------
const P = PermissionFlagsBits;
const commands = [
  new SlashCommandBuilder().setName("kur").setDescription("Sunucuyu otomatik kurar").setDefaultMemberPermissions(P.Administrator),
  new SlashCommandBuilder().setName("yardım").setDescription("Komut listesi"),
  new SlashCommandBuilder().setName("ping").setDescription("Botun gecikmesi"),
  new SlashCommandBuilder().setName("avatar").setDescription("Avatar göster")
    .addUserOption((o) => o.setName("kullanici").setDescription("Kullanıcı")),
  new SlashCommandBuilder().setName("kullanıcı").setDescription("Kullanıcı bilgisi")
    .addUserOption((o) => o.setName("kullanici").setDescription("Kullanıcı")),
  new SlashCommandBuilder().setName("sunucu").setDescription("Sunucu bilgisi"),
  new SlashCommandBuilder().setName("zar").setDescription("Zar at")
    .addIntegerOption((o) => o.setName("yuz").setDescription("Yüz sayısı").setMinValue(2).setMaxValue(1000)),
  new SlashCommandBuilder().setName("yazıtura").setDescription("Yazı tura at"),
  new SlashCommandBuilder().setName("8top").setDescription("Sihirli 8 top")
    .addStringOption((o) => o.setName("soru").setDescription("Sorun").setRequired(true)),
  new SlashCommandBuilder().setName("anket").setDescription("Evet/Hayır anketi")
    .addStringOption((o) => o.setName("soru").setDescription("Soru").setRequired(true)),
  new SlashCommandBuilder().setName("çekiliş").setDescription("Çekiliş başlat").setDefaultMemberPermissions(P.ManageGuild)
    .addStringOption((o) => o.setName("odul").setDescription("Ödül").setRequired(true))
    .addIntegerOption((o) => o.setName("dakika").setDescription("Süre (dk)").setRequired(true).setMinValue(1).setMaxValue(60)),
  new SlashCommandBuilder().setName("seviye").setDescription("Seviyeni göster")
    .addUserOption((o) => o.setName("kullanici").setDescription("Kullanıcı")),
  new SlashCommandBuilder().setName("liderlik").setDescription("En yüksek XP'li 10 kişi"),
  new SlashCommandBuilder().setName("kick").setDescription("Üyeyi at").setDefaultMemberPermissions(P.KickMembers)
    .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep")),
  new SlashCommandBuilder().setName("ban").setDescription("Üyeyi banla").setDefaultMemberPermissions(P.BanMembers)
    .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep")),
  new SlashCommandBuilder().setName("timeout").setDescription("Üyeyi sustur").setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true))
    .addIntegerOption((o) => o.setName("dakika").setDescription("Dakika").setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep")),
  new SlashCommandBuilder().setName("temizle").setDescription("Mesajları sil").setDefaultMemberPermissions(P.ManageMessages)
    .addIntegerOption((o) => o.setName("adet").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName("uyar").setDescription("Üyeyi uyar").setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption((o) => o.setName("sebep").setDescription("Sebep").setRequired(true)),
  new SlashCommandBuilder().setName("uyarılar").setDescription("Uyarıları göster").setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName("uye").setDescription("Üye").setRequired(true)),
  new SlashCommandBuilder().setName("kilitle").setDescription("Kanalı kilitle").setDefaultMemberPermissions(P.ManageChannels),
  new SlashCommandBuilder().setName("aç").setDescription("Kanal kilidini aç").setDefaultMemberPermissions(P.ManageChannels),
  new SlashCommandBuilder().setName("yavaşmod").setDescription("Yavaş mod (sn, 0 = kapat)").setDefaultMemberPermissions(P.ManageChannels)
    .addIntegerOption((o) => o.setName("saniye").setDescription("Saniye").setRequired(true).setMinValue(0).setMaxValue(21600)),
  new SlashCommandBuilder().setName("duyuru").setDescription("Duyuru gönder").setDefaultMemberPermissions(P.ManageGuild)
    .addStringOption((o) => o.setName("baslik").setDescription("Başlık").setRequired(true))
    .addStringOption((o) => o.setName("mesaj").setDescription("Mesaj").setRequired(true)),
];

// ---------- Sunucu kurulumu ----------
async function kur(interaction) {
  await interaction.reply({ content: `⚙️ ${BOT_NAME} sunucuyu kuruyor, bu biraz sürebilir...`, flags: EPH });
  const guild = interaction.guild;
  await guild.roles.fetch();
  await guild.channels.fetch();

  const role = async (name, opts) =>
    guild.roles.cache.find((r) => r.name === name) || (await guild.roles.create({ name, ...opts }));

  const admin = await role(ADMIN_ROLE, { color: 0xff0000, permissions: [P.Administrator], hoist: true });
  const mod = await role(MOD_ROLE, {
    color: 0x3498db, hoist: true,
    permissions: [P.KickMembers, P.BanMembers, P.ManageMessages, P.ModerateMembers, P.ManageChannels, P.ViewAuditLog],
  });
  const member = await role(MEMBER_ROLE, { color: 0x2ecc71, hoist: true });
  await role("🔔 Duyuru", { color: 0xe67e22, mentionable: true });
  await role("🎮 Oyuncu", { color: 0x9b59b6, mentionable: true });
  await role("💎 VIP", { color: 0xf1c40f, hoist: true });

  const ev = guild.roles.everyone.id;
  const owPublic = [{ id: ev, allow: [P.ViewChannel], deny: [P.SendMessages, P.AddReactions] }];
  const owMember = [{ id: ev, deny: [P.ViewChannel] }, { id: member.id, allow: [P.ViewChannel] }];
  const owStaff = [{ id: ev, deny: [P.ViewChannel] }, { id: mod.id, allow: [P.ViewChannel] }, { id: admin.id, allow: [P.ViewChannel] }];
  const owRoMember = [{ id: ev, deny: [P.ViewChannel] }, { id: member.id, allow: [P.ViewChannel], deny: [P.SendMessages] }];

  const T = "text", V = "voice";
  const structure = [
    ["📌 BİLGİ", owPublic, [[T, "📜│kurallar"], [T, "📢│duyurular"], [T, "✅│doğrulama"], [T, "👋│hoş-geldin"]]],
    ["💬 SOHBET", owMember, [[T, "💬│genel-sohbet"], [T, "🤖│bot-komut"], [T, "📷│medya"], [T, "😂│mizah"], [T, "📈│seviye"]]],
    ["🎮 OYUN", owMember, [[T, "🎮│oyun-sohbet"], [T, "🔍│takım-arama"], [T, "🏆│başarılar"]]],
    ["🔊 SES", owMember, [[V, "🔊 Genel Ses"], [V, "🎮 Oyun 1"], [V, "🎮 Oyun 2"], [V, "🎵 Müzik"], [V, "💤 AFK"]]],
    ["🎫 DESTEK", owRoMember, [[T, "🎫│destek-aç"]]],
    [TICKET_CATEGORY, owStaff, []],
    ["🛡️ YETKİLİ", owStaff, [[T, "📋│log"], [T, "💬│yetkili-sohbet"], [T, "⚙️│yetkili-komut"]]],
  ];

  const created = {};
  for (const [catName, overwrites, chans] of structure) {
    let cat = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === catName);
    if (!cat) cat = await guild.channels.create({ name: catName, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
    for (const [kind, name] of chans) {
      const type = kind === T ? ChannelType.GuildText : ChannelType.GuildVoice;
      const search = kind === T ? name.toLowerCase() : name;
      let ch = guild.channels.cache.find((c) => c.type === type && c.name === search);
      if (!ch) ch = await guild.channels.create({ name, type, parent: cat.id });
      created[name] = ch;
    }
  }

  const cfg = gd(guild.id).config;
  cfg.logChannel = created["📋│log"].id;
  cfg.welcomeChannel = created["👋│hoş-geldin"].id;
  cfg.levelChannel = created["📈│seviye"].id;
  save();

  await created["📜│kurallar"].send({
    embeds: [emb("📜 Sunucu Kuralları",
      "**1.** Herkese saygılı ol.\n**2.** Küfür, hakaret ve nefret söylemi yasaktır.\n**3.** Spam ve reklam yasaktır.\n" +
      "**4.** NSFW ve rahatsız edici içerik yasaktır.\n**5.** Yetkililerin kararlarına uy.\n**6.** Discord Kullanım Şartları geçerlidir.", 0xff0000)],
  });
  await created["✅│doğrulama"].send({
    embeds: [emb("✅ Doğrulama", "Kuralları okuduysan aşağıdaki butona bas ve sunucuya eriş!", 0x2ecc71)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("verify").setLabel("Doğrulan").setEmoji("✅").setStyle(ButtonStyle.Success))],
  });
  await created["🎫│destek-aç"].send({
    embeds: [emb("🎫 Destek", "Yardıma mı ihtiyacın var? Butona basıp özel bir destek kanalı aç.", 0x5865f2)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_open").setLabel("Ticket Aç").setEmoji("🎫").setStyle(ButtonStyle.Primary))],
  });
  await created["📢│duyurular"].send("📢 Duyurular burada paylaşılacak! `🔔 Duyuru` rolünü alarak bildirim al.");
  await created["🤖│bot-komut"].send(`🔴 **${BOT_NAME}** burada! Komutlar için \`/yardım\` yaz.`);
  await interaction.followUp({ content: "✅ Kurulum tamamlandı!", flags: EPH });
}

// ---------- Komut işleyicileri ----------
const handlers = {
  kur,
  async yardım(i) {
    await i.reply({
      embeds: [new EmbedBuilder().setTitle(`🔴 ${BOT_NAME} - Komutlar`).setColor(RED).setFooter({ text: BOT_NAME }).addFields(
        { name: "⚙️ Yönetim", value: "`/kur` `/duyuru` `/kilitle` `/aç` `/yavaşmod`" },
        { name: "🛡️ Moderasyon", value: "`/kick` `/ban` `/timeout` `/temizle` `/uyar` `/uyarılar`" },
        { name: "📈 Seviye", value: "`/seviye` `/liderlik`" },
        { name: "🎲 Eğlence", value: "`/zar` `/yazıtura` `/8top` `/anket` `/çekiliş`" },
        { name: "ℹ️ Bilgi", value: "`/ping` `/avatar` `/kullanıcı` `/sunucu`" })],
    });
  },
  async ping(i) { await i.reply(`🏓 Pong! ${client.ws.ping} ms | 🔴 ${BOT_NAME}`); },
  async avatar(i) {
    const u = i.options.getUser("kullanici") || i.user;
    await i.reply({ embeds: [emb(`${u.username} avatarı`, "").setImage(u.displayAvatarURL({ size: 1024 }))] });
  },
  async kullanıcı(i) {
    const m = i.options.getMember("kullanici") || i.member;
    const roles = m.roles.cache.filter((r) => r.id !== i.guild.id).map((r) => r.toString()).slice(0, 15).join(" ") || "Yok";
    await i.reply({
      embeds: [new EmbedBuilder().setTitle(m.user.tag).setColor(RED).setThumbnail(m.user.displayAvatarURL()).addFields(
        { name: "ID", value: m.id, inline: true },
        { name: "Hesap açılışı", value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Katılım", value: m.joinedTimestamp ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:D>` : "?", inline: true },
        { name: "Roller", value: roles })],
    });
  },
  async sunucu(i) {
    const g = i.guild;
    await i.reply({
      embeds: [new EmbedBuilder().setTitle(g.name).setColor(RED).setThumbnail(g.iconURL()).addFields(
        { name: "Üye", value: String(g.memberCount), inline: true },
        { name: "Kanal", value: String(g.channels.cache.size), inline: true },
        { name: "Rol", value: String(g.roles.cache.size), inline: true },
        { name: "Kuruluş", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>` })],
    });
  },
  async zar(i) {
    const y = i.options.getInteger("yuz") || 6;
    await i.reply(`🎲 Zar sonucu: **${Math.floor(Math.random() * y) + 1}** (1-${y})`);
  },
  async yazıtura(i) { await i.reply(`🪙 ${Math.random() < 0.5 ? "Yazı" : "Tura"}!`); },
  async "8top"(i) {
    const c = ["Evet!", "Kesinlikle.", "Büyük ihtimalle.", "Belki.", "Şimdi söylemeyeyim.", "Pek sanmam.", "Hayır.", "Kesinlikle hayır!", "Tekrar sor."];
    await i.reply(`🎱 **${i.options.getString("soru")}**\n${c[Math.floor(Math.random() * c.length)]}`);
  },
  async anket(i) {
    await i.reply({ embeds: [emb("📊 Anket", i.options.getString("soru")).setFooter({ text: `${i.user.username} tarafından` })] });
    const msg = await i.fetchReply();
    await msg.react("👍");
    await msg.react("👎");
  },
  async çekiliş(i) {
    const odul = i.options.getString("odul");
    const dk = i.options.getInteger("dakika");
    await i.reply({ embeds: [emb("🎉 ÇEKİLİŞ 🎉", `Ödül: **${odul}**\nKatılmak için 🎉 tepkisine bas!\nSüre: ${dk} dakika`, 0xf1c40f)] });
    const msg = await i.fetchReply();
    await msg.react("🎉");
    setTimeout(async () => {
      try {
        const fresh = await msg.fetch();
        const users = (await fresh.reactions.cache.get("🎉").users.fetch()).filter((u) => !u.bot);
        if (users.size) {
          const w = users.random();
          await i.channel.send(`🏆 Tebrikler ${w}! **${odul}** kazandın!`);
        } else await i.channel.send("Çekilişe kimse katılmadı 😢");
      } catch (e) { console.error("Çekiliş hatası:", e); }
    }, dk * 60 * 1000);
  },
  async seviye(i) {
    const u = i.options.getUser("kullanici") || i.user;
    const xp = gd(i.guild.id).xp[u.id] || 0;
    const l = levelOf(xp);
    await i.reply({
      embeds: [new EmbedBuilder().setTitle(`📈 ${u.username}`).setColor(0x2ecc71).setThumbnail(u.displayAvatarURL()).addFields(
        { name: "Seviye", value: String(l), inline: true },
        { name: "XP", value: `${xp} / ${50 * (l + 1) ** 2}`, inline: true })],
    });
  },
  async liderlik(i) {
    const top = Object.entries(gd(i.guild.id).xp).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) return i.reply("Henüz kimse XP kazanmadı.");
    const medals = ["🥇", "🥈", "🥉"];
    const lines = top.map(([id, xp], n) => {
      const m = i.guild.members.cache.get(id);
      return `${medals[n] || `**${n + 1}.**`} ${m ? m.displayName : `Ayrılmış (${id})`} — Seviye ${levelOf(xp)} (${xp} XP)`;
    });
    await i.reply({ embeds: [emb("🏆 Liderlik", lines.join("\n"), 0xf1c40f)] });
  },
  async kick(i) {
    const m = i.options.getMember("uye");
    const sebep = i.options.getString("sebep") || "Belirtilmedi";
    if (!m || !m.kickable) return i.reply({ content: "Bu kişiyi atamazsın.", flags: EPH });
    await m.kick(sebep);
    await i.reply(`👢 ${m.user.tag} atıldı. Sebep: ${sebep}`);
    sendLog(i.guild, emb("👢 Kick", `${m.user.tag} — ${i.user.tag}\n${sebep}`, 0xe67e22));
  },
  async ban(i) {
    const m = i.options.getMember("uye");
    const sebep = i.options.getString("sebep") || "Belirtilmedi";
    if (!m || !m.bannable) return i.reply({ content: "Bu kişiyi banlayamazsın.", flags: EPH });
    await m.ban({ reason: sebep });
    await i.reply(`🔨 ${m.user.tag} banlandı. Sebep: ${sebep}`);
  },
  async timeout(i) {
    const m = i.options.getMember("uye");
    const dk = i.options.getInteger("dakika");
    const sebep = i.options.getString("sebep") || "Belirtilmedi";
    if (!m || !m.moderatable) return i.reply({ content: "Bu kişiyi susturamazsın.", flags: EPH });
    await m.timeout(dk * 60 * 1000, sebep);
    await i.reply(`🔇 ${m} ${dk} dakika susturuldu. Sebep: ${sebep}`);
  },
  async temizle(i) {
    await i.deferReply({ flags: EPH });
    const del = await i.channel.bulkDelete(i.options.getInteger("adet"), true);
    await i.editReply(`🧹 ${del.size} mesaj silindi.`);
  },
  async uyar(i) {
    const m = i.options.getMember("uye");
    const sebep = i.options.getString("sebep");
    const g = gd(i.guild.id);
    (g.warns[m.id] ??= []).push({ sebep, yetkili: i.user.tag, tarih: Math.floor(Date.now() / 1000) });
    save();
    const n = g.warns[m.id].length;
    await i.reply(`⚠️ ${m} uyarıldı (${n}. uyarı). Sebep: ${sebep}`);
    if (n >= 3 && m.moderatable) {
      await m.timeout(60 * 60 * 1000, "3 uyarı");
      await i.followUp(`🔇 ${m} 3 uyarıya ulaştığı için 1 saat susturuldu.`);
    }
  },
  async uyarılar(i) {
    const m = i.options.getMember("uye");
    const w = gd(i.guild.id).warns[m.id] || [];
    if (!w.length) return i.reply("Bu kullanıcının uyarısı yok. ✅");
    const lines = w.map((x, n) => `**${n + 1}.** ${x.sebep} — ${x.yetkili} (<t:${x.tarih}:d>)`);
    await i.reply({ embeds: [emb(`⚠️ ${m.displayName} uyarıları`, lines.join("\n"), 0xe67e22)] });
  },
  async kilitle(i) {
    await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: false });
    await i.reply("🔒 Kanal kilitlendi.");
  },
  async aç(i) {
    await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: null });
    await i.reply("🔓 Kanal kilidi açıldı.");
  },
  async yavaşmod(i) {
    const s = i.options.getInteger("saniye");
    await i.channel.setRateLimitPerUser(s);
    await i.reply(`🐌 Yavaş mod: ${s} sn`);
  },
  async duyuru(i) {
    const ch = i.guild.channels.cache.find((c) => c.name === "📢│duyurular") || i.channel;
    await ch.send({ embeds: [emb(`📢 ${i.options.getString("baslik")}`, i.options.getString("mesaj"), 0xe67e22).setTimestamp()] });
    await i.reply({ content: "Duyuru gönderildi ✅", flags: EPH });
  },
};

// ---------- Buton işleyicileri ----------
async function handleButton(i) {
  if (i.customId === "verify") {
    const role = i.guild.roles.cache.find((r) => r.name === MEMBER_ROLE);
    if (!role) return i.reply({ content: "Üye rolü bulunamadı.", flags: EPH });
    if (i.member.roles.cache.has(role.id)) return i.reply({ content: "Zaten doğrulandın! 🎉", flags: EPH });
    await i.member.roles.add(role);
    return i.reply({ content: "Doğrulandın, hoş geldin! 🎉", flags: EPH });
  }

  if (i.customId === "ticket_open") {
    const exist = i.guild.channels.cache.find((c) => c.topic === `ticket:${i.user.id}`);
    if (exist) return i.reply({ content: `Zaten açık ticketın var: ${exist}`, flags: EPH });
    const cat = i.guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY);
    const overwrites = [
      { id: i.guild.id, deny: [P.ViewChannel] },
      { id: i.user.id, allow: [P.ViewChannel, P.SendMessages, P.AttachFiles] },
      { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels] },
    ];
    for (const n of [ADMIN_ROLE, MOD_ROLE]) {
      const r = i.guild.roles.cache.find((x) => x.name === n);
      if (r) overwrites.push({ id: r.id, allow: [P.ViewChannel, P.SendMessages] });
    }
    const ch = await i.guild.channels.create({
      name: `ticket-${i.user.username}`.slice(0, 90),
      type: ChannelType.GuildText,
      parent: cat ? cat.id : null,
      topic: `ticket:${i.user.id}`,
      permissionOverwrites: overwrites,
    });
    await ch.send({
      embeds: [emb("🎫 Destek Talebi", `Merhaba ${i.user}! Sorununu yaz, yetkililer en kısa sürede dönecek.`)],
      components: [new ActionRowBuilder().addComponents(
        ne
