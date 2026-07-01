import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCaiufpdc1ktrS7YIrhnaP7OCGMAfs4Wg8",
  authDomain: "notional-scheduler-4dpgw.firebaseapp.com",
  projectId: "notional-scheduler-4dpgw",
  storageBucket: "notional-scheduler-4dpgw.firebasestorage.app",
  messagingSenderId: "1063837540585",
  appId: "1:1063837540585:web:3cbc6537b78ab293a05078"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance, "ai-studio-5bb90f1c-839f-4f37-ab5c-7db4c0279bc5");

const TELEGRAM_BOT_TOKEN = "8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q";
const ADMIN_CHAT_ID = "5328007859";

interface BotConfig {
  iq_link: string;
  exnova_link: string;
  welcome_msg: string;
  approved_msg: string;
  rejected_msg: string;
  bot_token?: string;
  admin_chat_id?: string;
}

const DEFAULT_CONFIG: BotConfig = {
  iq_link: "https://affiliate.iqoption.net/redir/?aff=198544&aff_model=revenue&afftrack=gub",
  exnova_link: "https://exnova.com/lp/start-trading/?aff=198544&aff_model=revenue&afftrack=gub",
  welcome_msg: "👋 *Olá, {name}! Bem-vindo ao bot de liberação do BugBreaker!*\n\nPara liberar seu acesso na plataforma, siga os passos abaixo:\n\n1️⃣ Cadastre-se em uma de nossas corretoras parceiras:\n👉 [Clique aqui para se cadastrar na IQ Option]({iq_link})\n👉 [Clique aqui para se cadastrar na Exnova]({exnova_link})\n\n2️⃣ Após criar sua conta, envie-me o seu **ID de Usuário** (somente números, com no mínimo 8 dígitos).\n\nAssim que você enviar seu ID, ele será enviado para análise e liberação imediata! 🚀",
  approved_msg: "🎉 *Seu acesso foi LIBERADO com sucesso!*\n\nSeu ID `{id}` agora está ativo no sistema. Volte ao site, insira o ID e clique em *Verificar Conexão* para começar! 🚀",
  rejected_msg: "⚠️ *Seu ID {id} não foi aprovado pela nossa equipe.*\n\nCertifique-se de que se cadastrou corretamente através de nossos links indicados e envie o ID correto novamente para análise."
};

async function getBotConfig(): Promise<BotConfig> {
  try {
    const docRef = doc(db, "system_settings", "telegram_bot");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        iq_link: data.iq_link || DEFAULT_CONFIG.iq_link,
        exnova_link: data.exnova_link || DEFAULT_CONFIG.exnova_link,
        welcome_msg: data.welcome_msg || DEFAULT_CONFIG.welcome_msg,
        approved_msg: data.approved_msg || DEFAULT_CONFIG.approved_msg,
        rejected_msg: data.rejected_msg || DEFAULT_CONFIG.rejected_msg,
        bot_token: data.bot_token || undefined,
        admin_chat_id: data.admin_chat_id || undefined,
      };
    }
  } catch (err) {
    console.error("Error reading bot config from Firestore:", err);
  }
  return DEFAULT_CONFIG;
}

let pollingActive = false;
let lastUpdateId = 0;

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: replyMarkup
      })
    });
    const resData = await response.json();
    console.log("sendTelegramMessage Response:", resData);
    return resData;
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown"
      })
    });
    const resData = await response.json();
    console.log("editTelegramMessage Response:", resData);
    return resData;
  } catch (err) {
    console.error("Error editing Telegram message:", err);
  }
}

async function answerCallbackQuery(callbackQueryId: string) {
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId
      })
    });
  } catch (err) {
    console.error("Error answering callback query:", err);
  }
}

async function processTelegramUpdate(update: any) {
  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text ? update.message.text.trim() : "";
      const fromUser = update.message.from || {};
      const firstName = fromUser.first_name || "Usuário";

      // 1. Check if start or general command
      if (text.startsWith("/start")) {
        const config = await getBotConfig();
        const welcomeMessage = config.welcome_msg
          .replace(/{name}/g, firstName)
          .replace(/{iq_link}/g, config.iq_link)
          .replace(/{exnova_link}/g, config.exnova_link);
        await sendTelegramMessage(chatId, welcomeMessage);
        return;
      }

      // 2. Check if text is a potential ID
      const numericId = text.replace(/\D/g, "");
      if (numericId && numericId.length >= 8) {
        // Confirm received ID to user
        await sendTelegramMessage(
          chatId,
          `⏳ *Obrigado!* Seu ID \`${numericId}\` foi enviado para análise.\nVocê receberá uma notificação aqui assim que seu acesso for liberado!`
        );

        // Forward to Admin
        const config = await getBotConfig();
        const adminChatId = config.admin_chat_id || ADMIN_CHAT_ID;
        const adminText = `📥 *Nova Solicitação de Acesso!*\n\n👤 *Usuário:* [${firstName}](tg://user?id=${chatId})\n🆔 *ID de Usuário:* \`${numericId}\`\n\nEscolha uma opção abaixo para gerenciar o acesso:`;
        
        const inlineKeyboard = {
          inline_keyboard: [
            [
              { text: "Aprovar na IQ Option ✅", callback_data: `appIQ_${numericId}_${chatId}` },
              { text: "Aprovar na Exnova ✅", callback_data: `appEX_${numericId}_${chatId}` }
            ],
            [
              { text: "Recusar ❌", callback_data: `reject_${numericId}_${chatId}` }
            ]
          ]
        };

        await sendTelegramMessage(adminChatId, adminText, inlineKeyboard);
      } else {
        // Fallback for unrecognized messages
        await sendTelegramMessage(
          chatId,
          `⚠️ *Mensagem não reconhecida.*\n\nPor favor, envie apenas o seu **ID de Usuário** (números apenas, mínimo 8 dígitos) para que possamos analisar e liberar seu acesso.`
        );
      }
    } else if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // e.g., "appIQ_12345678_121212"
      const messageId = callbackQuery.message.message_id;
      const callbackQueryId = callbackQuery.id;

      if (data && (data.startsWith("approve_") || data.startsWith("appIQ_") || data.startsWith("appEX_") || data.startsWith("reject_"))) {
        const parts = data.split("_");
        const action = parts[0]; // "approve", "appIQ", "appEX" or "reject"
        const userId = parts[1];
        const userChatId = parts[2];

        // Acknowledge the callback query so Telegram loader stops
        await answerCallbackQuery(callbackQueryId);

        const config = await getBotConfig();
        const adminChatId = config.admin_chat_id || ADMIN_CHAT_ID;

        if (action === "approve" || action === "appIQ" || action === "appEX") {
          const broker = action === "appEX" ? "Exnova" : "IQ Option";
          // Add to Firestore database!
          try {
            await setDoc(doc(db, "approved_ids", userId), {
              active: false,
              broker: broker,
              createdAt: new Date().toISOString()
            });

            // Update Admin Message
            const approvedAdminText = `✅ *ID ${userId} ENVIADO AO PAINEL (DESATIVADO) - CORRETORA: ${broker}!*\n\nO ID foi inserido com sucesso no Firestore como desativado para a corretora *${broker}*. Ative-o manualmente no painel quando necessário.`;
            await editTelegramMessage(adminChatId, messageId, approvedAdminText);

            // Notify User
            const userSuccessText = `🎉 *Seu ID ${userId} da ${broker} foi enviado ao painel de controle!*\n\nSeu ID foi registrado com sucesso, mas a opção está desativada no momento. Ele será ativado assim que o depósito qualificatório for validado. 🚀`;
            await sendTelegramMessage(userChatId, userSuccessText);
          } catch (err) {
            console.error("Failed to write to Firestore:", err);
            await sendTelegramMessage(adminChatId, `❌ Erro ao salvar ID ${userId} no Firestore: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else if (action === "reject") {
          // Update Admin Message
          const rejectedAdminText = `❌ *ID ${userId} RECUSADO!*\n\nSolicitação de acesso recusada pelo Administrador.`;
          await editTelegramMessage(adminChatId, messageId, rejectedAdminText);

          // Notify User
          const userRejectText = config.rejected_msg.replace(/{id}/g, userId);
          await sendTelegramMessage(userChatId, userRejectText);
        }
      }
    }
  } catch (error) {
    console.error("Error processing update:", error);
  }
}

async function startTelegramPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log("Starting Telegram Bot Long Polling...");

  // First delete webhook to make getUpdates work (and clear any stale webhooks)
  try {
    const config = await getBotConfig();
    const token = config.bot_token || TELEGRAM_BOT_TOKEN;
    const delUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
    const response = await fetch(delUrl);
    const resData = await response.json();
    console.log("deleteWebhook response on startup:", resData);
  } catch (err) {
    console.error("Error deleting webhook on startup:", err);
  }

  // Polling loop
  while (pollingActive) {
    try {
      const config = await getBotConfig();
      const token = config.bot_token || TELEGRAM_BOT_TOKEN;
      const pollUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
      const response = await fetch(pollUrl);
      if (!response.ok) {
        console.error(`Telegram API returned non-OK: ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      
      const data = await response.json();
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          console.log("Polled Telegram Update:", JSON.stringify(update));
          lastUpdateId = update.update_id;
          // Process in background asynchronously
          processTelegramUpdate(update);
        }
      }
    } catch (err) {
      console.error("Error in Telegram Polling loop:", err);
      // Wait before retrying to prevent hot loops
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    // A tiny pause before the next poll
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Dummy endpoints for backwards compatibility / health checking
  app.get("/api/setup-telegram-webhook", (req, res) => {
    res.json({ success: true, message: "Long polling is active, webhooks disabled for maximum reliability" });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      pollingActive,
      lastUpdateId
    });
  });

  // Keep endpoint but delegate to common update processor if anything sends posts here
  app.post("/api/telegram-webhook", async (req, res) => {
    try {
      await processTelegramUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error in webhook post handler:", error);
      res.sendStatus(500);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Start background polling
    startTelegramPolling();
  });
}

startServer();
