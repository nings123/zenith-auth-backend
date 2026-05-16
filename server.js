const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 全域記憶 Cookie 容器，用來騙過 Riot 官方的安全檢查
let riotCookies = [];

app.get('/', (req, res) => {
    res.send('🎉 Zenith 後端強效版運作正常！');
});

// 1. 初始化授權
app.post('/api/auth/init', async (req, res) => {
    try {
        const response = await axios.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: "play-valorant-web-prod",
            response_type: "token id_token",
            redirect_uri: "https://playvalorant.com/opt_in",
            scope: "openid link ban",
            nonce: "1"
        });
        
        // 牢牢記住 Riot 吐回來的初始 Cookie
        if (response.headers['set-cookie']) {
            riotCookies = response.headers['set-cookie'];
        }
        
        res.json(response.data);
    } catch (error) {
        console.error("Init Error:", error.message);
        res.status(500).json({ error: "Riot 初始化失敗", details: error.message });
    }
});

// 2. 提交帳密 與 提交 2FA 驗證碼
app.put('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.put('https://auth.riotgames.com/api/v1/authorization', req.body, {
            headers: {
                // 把上一關記住的 Cookie 原封不動帶過去，證明我們是同一個人！
                'Cookie': riotCookies.join('; '),
                'Content-Type': 'application/json',
                'User-Agent': 'RiotClient/60.0.6.4870919.4742074 rso-auth (windows)'
            }
        });

        // 如果這一步驟 Riot 有更新 Cookie，繼續更新它
        if (response.headers['set-cookie']) {
            riotCookies = response.headers['set-cookie'];
        }

        res.json(response.data);
    } catch (error) {
        // 如果 Riot 回傳 400 錯誤，通常就是 2FA 觸發了，要把裡面的真實狀態原封不動吐給網頁
        if (error.response) {
            if (error.response.data && error.response.data.type === "mfa") {
                if (error.response.headers['set-cookie']) {
                    riotCookies = error.response.headers['set-cookie'];
                }
                return res.json(error.response.data);
            }
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: "Riot 驗證崩潰", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`強效後端已在連接埠 ${PORT} 順利啟動！`);
});
