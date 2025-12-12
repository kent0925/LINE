const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzqW4Ru1mpRyUEaLioTmXMojq2QSw1x5hIelktSv40RvT-4Vm5GpkvoCyQIpQUcvUY/exec'; // *** 請替換成您部署的 GAS 網址 ***
let userId = '未取得 LIFF ID'; // 用於儲存 LIFF 使用者 ID

// DOM 元素
const userNameInput = document.getElementById('userName');
const attendeesCountSelect = document.getElementById('attendeesCount');
const guestSection = document.getElementById('guestSection');
const guestInputsContainer = document.getElementById('guestInputs');
const submitBtn = document.getElementById('submitBtn');
const modifyBtn = document.getElementById('modifyBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusMessage = document.getElementById('statusMessage');
const showMapBtn = document.getElementById('showMapBtn');

/**
 * 處理 LIFF 初始化、登入並取得使用者資訊
 */
async function initializeLiff() {
    try {
        await liff.init({ liffId: '2008678090-b1Up4o0J' }); // *** 請替換成您的 LIFF ID ***

        if (!liff.isLoggedIn()) {
            // 如果未登入，導向登入頁面
            liff.login();
        } else {
            // 取得使用者資訊
            const profile = await liff.getProfile();
            userId = profile.userId;
            userNameInput.value = userId;

            // 檢查是否已報名並更新按鈕狀態 (這是進階功能，需要先從 Sheet 讀取資料)
            checkRegistrationStatus(userId);
        }
    } catch (err) {
        console.error('LIFF 初始化失敗', err);
        userNameInput.value = 'LIFF 錯誤：請在 LINE 內開啟';
        statusMessage.textContent = '初始化失敗，請確認 LIFF ID 設定是否正確。';
        statusMessage.style.backgroundColor = '#ffe6e6'; // 錯誤訊息用紅色
        statusMessage.style.borderColor = '#ff4d4d';
        statusMessage.style.color = '#ff4d4d';
    }
}

/**
 * 根據報名人數動態生成來賓姓名輸入框
 */
function updateGuestInputs() {
    const totalCount = parseInt(attendeesCountSelect.value, 10);
    const guestCount = totalCount - 1; // 來賓數 = 總人數 - 本人
    
    // 清空現有的來賓輸入框
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
 * @returns {Object} 包含所有報名資訊的物件
 */
function collectFormData(action) {
    const guests = Array.from(document.querySelectorAll('.guest-name-input')).map(input => input.value);
    
    return {
        action: action, // 'submit', 'modify', 或 'cancel'
        timestamp: new Date().toLocaleString('zh-TW'),
        userId: userId, // 名字 (使用者 ID)
        eventSubject: document.getElementById('eventSubject').value,
        eventTime: document.getElementById('eventTime').value,
        eventLocation: document.getElementById('eventLocation').value,
        attendeesCount: attendeesCountSelect.value, // 報名人數 (總數)
        guestNames: guests.join(', ') // 來賓姓名 (以逗號分隔)
    };
}

/**
 * 發送資料到 Google Apps Script (GAS)
 * @param {string} action - 'submit', 'modify', 或 'cancel'
 */
async function sendDataToGas(action) {
    statusMessage.textContent = '正在處理中，請稍候...';
    
    const formData = collectFormData(action);

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // 必須設定為 no-cors，因為 GAS 預設沒有 CORS 處理
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            // 將 JS 物件轉為 URL 參數字串
            body: new URLSearchParams(formData).toString() 
        });

        // 由於 no-cors 模式無法讀取 response.json()，我們只能假設成功
        if (action === 'submit') {
            statusMessage.textContent = '✅ 報名成功！感謝您的參與。';
            // 報名成功後，切換按鈕狀態
            submitBtn.style.display = 'none';
            modifyBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
        } else if (action === 'modify') {
            statusMessage.textContent = '✅ 報名資料已成功修改！';
        } else if (action === 'cancel') {
            statusMessage.textContent = '❌ 報名已成功取消！';
            // 取消報名後，切換回報名狀態
            submitBtn.style.display = 'inline-block';
            modifyBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }

    } catch (error) {
        console.error('發送資料到 GAS 失敗:', error);
        statusMessage.textContent = '💥 網路或伺服器錯誤，報名失敗。請稍後再試。';
    }
}

/**
 * 檢查報名狀態 (這部分需要在 GAS 端配合讀取 Google Sheet 才能完成)
 * 為了簡化，前端先不做讀取，直接假設第一次開啟是報名。
 * @param {string} currentUserId 
 */
function checkRegistrationStatus(currentUserId) {
    // 這裡應該呼叫另一個 GAS API 來查詢 Google Sheet 中是否有 currentUserId 的報名紀錄
    // 如果有：
    //   submitBtn.style.display = 'none';
    //   modifyBtn.style.display = 'inline-block';
    //   cancelBtn.style.display = 'inline-block';
    //   (並且從 Sheet 讀取資料來填寫人數/來賓資訊)
    // 如果沒有：
    //   submitBtn.style.display = 'inline-block';
    //   modifyBtn.style.display = 'none';
    //   cancelBtn.style.display = 'none';

    // 目前先預設顯示 '確認報名'
    submitBtn.style.display = 'inline-block';
    modifyBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    statusMessage.textContent = '請填寫報名資訊並點擊「確認報名」。';
}

/**
 * 處理「顯示地圖」按鈕點擊事件 (使用 liff.openWindow)
 */
function handleShowMap() {
    // 假設地點是 '台北市信義區'，我們可以使用 Google Map 查詢網址
    const locationName = document.getElementById('eventLocation').value;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;

    if (liff.isInClient()) {
        // 在 LINE 內部開啟新視窗
        liff.openWindow({
            url: mapUrl,
            external: true
        });
    } else {
        // 在外部瀏覽器直接導向
        window.open(mapUrl, '_blank');
    }
}

// =======================
// 事件監聽
// =======================

// 監聽下拉式選單的變化來更新來賓輸入框
attendeesCountSelect.addEventListener('change', updateGuestInputs);

// 報名/修改/取消按鈕
submitBtn.addEventListener('click', () => sendDataToGas('submit'));
modifyBtn.addEventListener('click', () => sendDataToGas('modify'));
cancelBtn.addEventListener('click', () => sendDataToGas('cancel'));

// 顯示地圖按鈕
showMapBtn.addEventListener('click', handleShowMap);

// 頁面載入時執行 LIFF 初始化
window.onload = () => {
    // 確保在 LIFF 環境中才執行初始化
    if (typeof liff !== 'undefined') {
        initializeLiff();
    } else {
        statusMessage.textContent = 'LIFF SDK 載入失敗，請檢查網路或腳本。';
    }
    // 頁面載入時先執行一次，初始化來賓輸入框
    updateGuestInputs(); 
};
