// =======================================================
// 1. 設定變數 (請替換 LIFF ID 和 GAS URL)
// =======================================================
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzqW4Ru1mpRyUEaLioTmXMojq2QSw1x5hIelktSv40RvT-4Vm5GpkvoCyQIpQUcvUY/exec'; // *** 請替換成您部署的 GAS 網址 ***
const LIFF_ID = '2008678090-b1Up4o0J'; // *** 請替換成您的 LIFF ID ***

let userId = '未取得 LIFF ID'; // 用於儲存 LIFF 使用者 ID，報名時傳送

// DOM 元素
const eventSubjectInput = document.getElementById('eventSubject');
const eventTimeInput = document.getElementById('eventTime');
const eventLocationInput = document.getElementById('eventLocation');

const userNameInput = document.getElementById('userName');
const attendeesCountSelect = document.getElementById('attendeesCount');
const guestSection = document.getElementById('guestSection');
const guestInputsContainer = document.getElementById('guestInputs');

const submitBtn = document.getElementById('submitBtn');
const modifyBtn = document.getElementById('modifyBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusMessage = document.getElementById('statusMessage');
const showMapBtn = document.getElementById('showMapBtn');

// =======================================================
// 2. 核心函式：活動資料載入 (從 GAS 讀取)
// =======================================================

/**
 * 從 GAS 獲取活動資訊並填充欄位
 */
async function loadEventData() {
    statusMessage.textContent = '正在載入活動資訊...';
    
    // 使用 GET 請求並帶上參數 action=getEvent
    const fetchUrl = `${GAS_WEB_APP_URL}?action=getEvent`;
    
    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (data.error) {
            statusMessage.textContent = `❌ 載入活動資訊失敗: ${data.error}`;
            return;
        }

        // 填充欄位 (假設 GAS 返回的 Key 為 EventSubject, EventTime, EventLocation)
        eventSubjectInput.value = data.EventSubject || 'N/A';
        eventTimeInput.value = data.EventTime || 'N/A';
        eventLocationInput.value = data.EventLocation || 'N/A';
        
        statusMessage.textContent = '活動資訊已載入。';

    } catch (error) {
        console.error('載入活動資料失敗:', error);
        statusMessage.textContent = '💥 無法連接到活動設定服務。';
    }
}


// =======================================================
// 3. 核心函式：LIFF 初始化與 User Profile
// =======================================================

/**
 * 處理 LIFF 初始化、登入並取得使用者資訊
 */
async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            userId = profile.userId;
            
            // 修正點：前端顯示 LINE 名稱，讓使用者易於辨識
            const userNameDisplay = profile.displayName; 
            userNameInput.value = userNameDisplay;

            // 檢查是否已報名 (這裡需要 GAS 的 GET 請求來查詢，但我們目前先簡化按鈕邏輯)
            checkRegistrationStatus(userId);
        }
    } catch (err) {
        console.error('LIFF 初始化失敗', err);
        userNameInput.value = 'LIFF 錯誤：請在 LINE 內開啟';
        statusMessage.textContent = '初始化失敗，請確認 LIFF ID 與網域設定是否正確。';
        statusMessage.style.backgroundColor = '#ffe6e6'; 
        statusMessage.style.borderColor = '#ff4d4d';
        statusMessage.style.color = '#ff4d4d';
    }
}

// =======================================================
// 4. 核心函式：表單邏輯與資料傳輸
// =======================================================

/**
 * 根據報名人數動態生成來賓姓名輸入框
 */
function updateGuestInputs() {
    const totalCount = parseInt(attendeesCountSelect.value, 10);
    const guestCount = totalCount - 1; 
    
    guestInputsContainer.innerHTML = ''; 

    if (guestCount > 0) {
        guestSection.style.display = 'block';
        for (let i = 1; i <= guestCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'guest-name-input';
            input.id = `guestName${i}`;
            input.placeholder = `來賓 ${i} 姓名`;
            input.required = true;
            guestInputsContainer.appendChild(input);
        }
    } else {
        guestSection.style.display = 'none';
    }
}

/**
 * 收集報名表單所有資料
 */
function collectFormData(action) {
    const guests = Array.from(document.querySelectorAll('.guest-name-input')).map(input => input.value);
    
    return {
        action: action, 
        timestamp: new Date().toLocaleString('zh-TW'),
        userId: userId, // *** 傳送原始 User ID 給 GAS 進行轉換和查找 ***
        eventSubject: eventSubjectInput.value,
        eventTime: eventTimeInput.value,
        eventLocation: eventLocationInput.value,
        attendeesCount: attendeesCountSelect.value,
        guestNames: guests.join(', ')
    };
}

/**
 * 發送資料到 Google Apps Script (GAS)
 * @param {string} action - 'submit', 'modify', 或 'cancel'
 */
async function sendDataToGas(action) {
    statusMessage.textContent = `正在處理 ${action} 請求中，請稍候...`;
    
    const formData = collectFormData(action);

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(formData).toString() 
        });

        // 由於 no-cors 模式，我們發送一個成功的 GET 請求來檢查 GAS 的實際回應
        // (注意：這是一個進階的 workaround，用於繞過 no-cors 限制)
        const checkResponse = await fetch(`${GAS_WEB_APP_URL}?action=checkStatus&userId=${userId}`);
        const result = await checkResponse.json(); 

        if (result && result.status === 'error') {
             // GAS 拋出錯誤 (例如重複報名)
             statusMessage.textContent = `🚫 動作失敗: ${result.message}`;
             // 如果是重複報名錯誤，切換到修改模式
             if (result.message.includes('重複報名')) {
                 submitBtn.style.display = 'none';
                 modifyBtn.style.display = 'inline-block';
                 cancelBtn.style.display = 'inline-block';
             }
        } else {
             // 假設成功 (GAS 返回 success 或無 error 訊息)
             if (action === 'submit') {
                 statusMessage.textContent = '✅ 報名成功！感謝您的參與。';
                 submitBtn.style.display = 'none';
                 modifyBtn.style.display = 'inline-block';
                 cancelBtn.style.display = 'inline-block';
             } else if (action === 'modify') {
                 statusMessage.textContent = '✅ 報名資料已成功修改！';
             } else if (action === 'cancel') {
                 statusMessage.textContent = '❌ 報名已成功取消！';
                 submitBtn.style.display = 'inline-block';
                 modifyBtn.style.display = 'none';
                 cancelBtn.style.display = 'none';
             }
        }

    } catch (error) {
        console.error('發送資料到 GAS 失敗:', error);
        statusMessage.textContent = '💥 網路或伺服器錯誤，報名失敗。請稍後再試。';
    }
}

/**
 * 處理按鈕狀態的簡易切換 (這裡簡化，直接假設初次進入為未報名狀態)
 */
function checkRegistrationStatus(currentUserId) {
    // 預設顯示 '確認報名'
    submitBtn.style.display = 'inline-block';
    modifyBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    
    statusMessage.textContent = `歡迎 ${userNameInput.value}！請填寫報名資訊並點擊「確認報名」。`;
}

/**
 * 處理「顯示地圖」按鈕點擊事件 (修正 URL 編碼錯誤)
 */
function handleShowMap() {
    const locationName = eventLocationInput.value;
    // 修正的地圖 URL 結構
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;

    if (liff.isInClient()) {
        liff.openWindow({
            url: mapUrl,
            external: true
        });
    } else {
        window.open(mapUrl, '_blank');
    }
}

// =======================================================
// 5. 事件監聽與啟動
// =======================================================

attendeesCountSelect.addEventListener('change', updateGuestInputs);
submitBtn.addEventListener('click', () => sendDataToGas('submit'));
modifyBtn.addEventListener('click', () => sendDataToGas('modify'));
cancelBtn.addEventListener('click', () => sendDataToGas('cancel'));
showMapBtn.addEventListener('click', handleShowMap);

// 頁面載入時執行
window.onload = () => {
    // 1. 載入活動資料
    loadEventData(); 

    // 2. 執行 LIFF 初始化
    if (typeof liff !== 'undefined') {
        initializeLiff();
    } else {
        statusMessage.textContent = 'LIFF SDK 載入失敗，請檢查網路或腳本。';
    }
    // 3. 初始化來賓輸入框
    updateGuestInputs(); 
};
