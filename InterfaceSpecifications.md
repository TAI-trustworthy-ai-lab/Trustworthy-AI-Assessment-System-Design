# 前端介面說明

專案的前端介面主要由幾個核心頁面組成。（只是個人想法可以更改内容!）

### 1. 登陸頁面 (`index.html`)

使用者**未登入時的首頁**。

* **頁面功能**：除了提供**登入按鈕**外，此頁面會詳細介紹 **「TAI 指標」** 的內容、測試目的以及其重要性，讓使用者在登入前就能對測驗有充分的了解。

### 2. 登入與註冊頁面 (`login.html`)

此頁面負責處理所有使用者 **帳號相關** 的操作。

* **頁面功能**：包含**使用者名稱**與**密碼**輸入欄位，並透過與後端 API 的溝通，來處理**登入**及**註冊**的資料傳輸與驗證。

### 3. 使用者主頁 (`home.html`)

這是使用者成功登入後的**主要介面**。

* **頁面功能**：提供不同階段的測驗選項，例如**建模前、中、後**的測驗入口。
* **擴展功能**：**（可選）**考慮在此頁面加入一個**即時 LLM 問答**功能，使用者可以直接向 AI 提問，此功能需要與後端 LLM 服務進行即時資料交換。

### 4. 問卷頁面：分開建模前、中、後頁面 (`question.html`) 

專門用於**測驗問答**的頁面。

* **頁面功能**：呈現一系列問題，並**強制使用者回答所有問題**。完成後，將答案資料打包發送到後端進行處理。

### 5. 結果展示頁面 (`result.html`)

這是測驗的**結果回饋頁面**。

* **頁面功能**：從後端取得處理後的資料，並以**雷達圖**的形式**視覺化**呈現。同時，也會詳細列出**各項指標的分數**，並提供**綜合回饋**與**建議**。

# Front-End Interface Description

The project's front-end interface is comprised of several core pages, each serving a unique function and user experience.

### 1. Landing Page (`index.html`)

This is the **home page for unauthenticated users**.

* **Page Functionality**: Besides providing a clear **login button**, this page offers a detailed introduction to the **"TAI Indicator"**, its purpose, and its significance. This ensures users are well-informed before they log in.

### 2. Login & Sign-Up Page (`login.html`)

This page handles all **user account-related** operations.

* **Page Functionality**: Includes fields for **username** and **password**. It will communicate with the back-end API to handle **login** and **sign-up** data transfer and validation.

### 3. User Dashboard (`home.html`)

This is the **primary interface** after a user has successfully logged in.

* **Page Functionality**: Provides options for different stages of the questionnaire, such as the **pre-modeling, mid-modeling, and post-modeling** tests.
* **Extended Functionality**: **(Optional)** A **real-time LLM Q&A** feature is being considered for this page. Users would be able to ask the AI questions directly, which would require real-time data exchange with a back-end LLM service.

### 4. Questionnaire Page: Seperate Pre-, mid-, post-modeling page (`question.html`)

This page is specifically for **administering the test**.

* **Page Functionality**: Presents a series of questions and **ensures all questions are answered** before submitting the data to the back end for processing.

### 5. Results Display Page (`result.html`)

This is the **feedback page for the test results**.

* **Page Functionality**: Retrieves the processed data from the back end and visualizes it using a **radar chart**. It also provides a detailed breakdown of **each indicator's score** and offers **comprehensive feedback** and **suggestions**.
