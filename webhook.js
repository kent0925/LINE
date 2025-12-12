const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
const axios = require("axios");

const app = express();
app.use(express.json());

// LINE Bot 設定
const config = {
  channelAccessToken: "xyK21DZagVjkZEI6m0JK9Rxoi9t8wtw2v6xmdqFqER+/imzAQLP21d+efXNV6KVSnuOkVhK2T8WOlpXnncjc09IT0Ve5TJAj58/HSDB+Ykben/WygCD6vUiRvk1iWT8lBZTs8dEYQouFqlHxpLM1BwdB04t89/1O/w1cDnyilFU=",
  channelSecret: "4776f36d52a0e49ea2ee273839d82f8a"
};

const client = new Client(config);

// Google Apps Script Web App URL
const googleUrl = "https://script.google.com/macros/s/AKfycbyB5FAS4gzZJKpEoubiHgR-R76fcDtK1Q0TmOsDpj-8HdCbuHrd4iTYVJ388xgonXBm/exec";

// ========== Webhook ==========
app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message") {
      const userId = event.source.userId;
      const text = event.message.text;

      // 傳去 Google Sheet
      await axios.post(googleUrl, {
        userId: userId,
        message: text
      });

      // 回覆使用者
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "資料已記錄到 Google Sheet！"
      });
    }
  }

  res.status(200).send("OK");
});

// 啟動 server
app.listen(3000, () => console.log("LINE Bot 伺服器啟動！"));
