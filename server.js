const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// 允許你的 GitHub 前端網頁跨網域抓取這個後端
app.use(cors());
app.use(express.json());

// 基礎測試路由，用來檢查伺服器有沒有活著
app.get('/', (req, res) => {
    res.send('🎉 Zenith 後端伺服器運作正常！');
});

// 轉接 Riot 登入初始化
app.post('/api/auth/init', async (req, res) => {
    try {
        const response = await axios.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: "play-valorant-web-prod",
            response_type: "token id_token",
            redirect_uri: "https://playvalorant.com/opt_in",
            scope: "openid link ban",
            nonce: "1"
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Riot 初始化失敗", details: error.message });
    }
});

// 轉接 Riot 帳密提交與 2FA 驗證
app.put('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.put('https://auth.riotgames.com/api/v1/authorization', req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Riot 驗證失敗", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`後端伺服器已在連接埠 ${PORT} 順利啟動！`);
});
