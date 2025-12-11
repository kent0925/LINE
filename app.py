# app.py 核心結構
from flask import Flask, request, abort, jsonify
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TemplateSendMessage, ButtonsTemplate, UriAction
from sheet_handler import get_activity_info, write_registration_to_sheet # 假設已匯入

app = Flask(__name__)

# --- LINE BOT 設定 ---
LINE_BOT_API = LineBotApi('YOUR_CHANNEL_ACCESS_TOKEN')
HANDLER = WebhookHandler('YOUR_CHANNEL_SECRET')
LIFF_REGISTRATION_URL = 'YOUR_LIFF_REGISTRATION_URL' # 例如: https://liff.line.me/16xxxxxxxx-xxxxxxx/register

# --- 1. LINE Webhook 接收點 ---
@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)
    try:
        HANDLER.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return 'OK'

# --- 2. LINE 訊息處理 ---
@HANDLER.add(MessageEvent, message=TextMessage)
def handle_message(event):
    text = event.message.text
    
    if text == "報名" or text == "我要報名":
        # 發送包含 LIFF 報名連結的按鈕訊息
        info = get_activity_info() # 讀取活動資訊，用於顯示標題
        
        template = ButtonsTemplate(
            title=f"活動報名：{info['TITLE']}",
            text='請點擊下方按鈕填寫表單，您的 LINE ID 將自動帶入。',
            actions=[
                UriAction(label='📝 立即報名 (LIFF)', uri=LIFF_REGISTRATION_URL)
            ]
        )
        message = TemplateSendMessage(alt_text='報名表單連結', template=template)
        LINE_BOT_API.reply_message(event.reply_token, message)
        
    elif text == "查詢" or text == "取消報名":
        # 發送包含 LIFF 查詢/取消連結的按鈕訊息
        # 實務上會是另一個 LIFF URL，這裡簡化為同一個 URL 加上參數
        template = ButtonsTemplate(
            title="報名查詢與管理",
            text='點擊按鈕查詢您的報名狀態或進行取消。',
            actions=[
                UriAction(label='🔍 查詢/取消 (LIFF)', uri=f"{LIFF_REGISTRATION_URL}?mode=status")
            ]
        )
        message = TemplateSendMessage(alt_text='查詢連結', template=template)
        LINE_BOT_API.reply_message(event.reply_token, message)
        
    else:
        # 其他回應
        LINE_BOT_API.reply_message(event.reply_token, TextMessage(text="請輸入 '報名' 或 '查詢'。"))


# --- 3. LIFF API 接收點：報名提交 ---
@app.route('/register', methods=['POST'])
def handle_liff_submission():
    try:
        data = request.get_json()
        
        # 取得資料並寫入 Sheet
        user_id = data.get('line_user_id')
        user_name = data.get('name')
        participants = data.get('participants')
        guest_name = data.get('guest_name', '')

        if write_registration_to_sheet(user_id, user_name, participants, guest_name):
            return jsonify({"success": True, "message": "報名成功！"})
        else:
            return jsonify({"success": False, "message": "報名失敗，伺服器錯誤。"}), 500

    except Exception as e:
        app.logger.error(f"LIFF 提交錯誤: {e}")
        return jsonify({"success": False, "message": "系統例外錯誤。"}), 500

# --- 4. LIFF API 接收點：取消報名 ---
@app.route('/cancel', methods=['POST'])
def handle_liff_cancellation():
    try:
        data = request.get_json()
        user_id = data.get('line_user_id')
        
        if cancel_registration(user_id):
            return jsonify({"success": True, "message": "您的報名已成功取消！"})
        else:
            return jsonify({"success": False, "message": "取消失敗，可能找不到有效的報名。"}), 400
            
    except Exception as e:
        app.logger.error(f"LIFF 取消錯誤: {e}")
        return jsonify({"success": False, "message": "系統例外錯誤。"}), 500


if __name__ == "__main__":
    app.run(port=80) # 實務上請使用 HTTPS 和適合的 Port
