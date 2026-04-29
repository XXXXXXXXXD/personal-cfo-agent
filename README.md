# Personal CFO Agent

這是一個全方位的個人財務管理儀表板，支援股票即時報價、消費歷史追蹤、資產負債分析，並且支援跨平台手機 PWA 安裝。

---

## 1. 取得你專屬的 Firebase 資料庫

為了確保每個使用者的財務資料是各自獨立的，你需要註冊自己的 Firebase 帳號。

### 步驟：
1. 前往 [Firebase Console](https://console.firebase.google.com/) 並登入 Google 帳號。
2. 點擊 **"建立專案 (Create Project)"**，填寫專案名稱。
3. 在左側選單選擇 **"Build" -> "Firestore Database"**。
4. 點擊 **"Create Database"**，地區選擇 `asia-east1` (台灣) 或預設值即可，**模式請先選擇「Test mode (測試模式)」**以方便初步開發。
5. **註冊網頁應用程式**：在左側導覽列點選齒輪圖示 (Project Overview) -> 選擇 `</>` (Web 圖示) 新增應用程式。
6. 完成後，Firebase 會顯示一段包含 `firebaseConfig` 的程式碼。請複製以下這個區塊的 JSON 格式內容：

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "your-app.firebaseapp.com",
  "projectId": "your-app",
  "storageBucket": "your-app.appspot.com",
  "messagingSenderId": "12345678",
  "appId": "1:123456:web:abcd"
}
```

7. 回到部署好的 Personal CFO 網頁，點擊右上角的 **"Settings"** 頁籤，將這段 JSON 貼上並點擊 **Save**。你的應用程式就成功連線到你的私有資料庫了！

*(安全建議：正式使用時，請記得回到 Firebase Firestore 的 Rules 標籤，設定嚴謹的安全規則。)*

---

## 2. 部署到 Vercel (讓所有人都能存取)

將這個網頁發布上線是完全免費的，且未來只要更新程式碼就會自動更新網頁。

### 步驟：
1. 確保你已經將這個專案的原始碼上傳到了你個人的 **GitHub 儲存庫 (Repository)**。
2. 前往 [Vercel 官網](https://vercel.com/)，使用 GitHub 帳號登入/註冊。
3. 點擊右上角的 **"Add New" -> "Project"**。
4. 授權 Vercel 存取你的 GitHub，找到這個 `personal-cfo-agent` 的 Repo 並點擊 **"Import"**。
5. 在 Framework Preset 欄位確認顯示的是 **Vite**。
6. 點擊 **"Deploy"**。
7. 等待約 30 秒，Vercel 就會給你一組永久免費的專屬網址（例如 `https://your-cfo-agent.vercel.app`），你現在可以把這個網址分享給其他人使用了！

---

## 3. 在手機上安裝為 App (PWA)

這套系統內建了 Progressive Web App (PWA) 支援，可以像原生 App 一樣安裝在手機桌面。

### iOS (iPhone / iPad) 安裝步驟：
1. 打開內建的 **Safari** 瀏覽器。
2. 輸入並前往你在 Vercel 部署好的專屬網址。
3. 點擊畫面下方中央的 **「分享」圖示** (一個朝上的箭頭方塊)。
4. 往下滑動，選擇 **「加入主畫面 (Add to Home Screen)」**。
5. 點擊右上角的「新增」。
6. 回到手機桌面，你會看到 Personal CFO 的 App 圖示！點開後它會是全螢幕運作，沒有瀏覽器的網址列。

### Android 安裝步驟：
1. 打開 **Chrome** 瀏覽器。
2. 前往你的專屬網址。
3. 畫面上方或下方通常會自動彈出 **「將 Personal CFO 加入主畫面」** 的提示，直接點擊安裝。
4. 若無跳出提示，可點擊右上角的「三個點」選單，選擇 **「安裝應用程式」** 或 **「加到主畫面」**。
5. 安裝完成後即可在桌面與應用程式抽屜中找到它。
