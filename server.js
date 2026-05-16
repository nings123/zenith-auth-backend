const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 用來儲存當前連線的全局變數
let savedCookies = [];

app.get('/', (req, res) => {
    res.send('🎉 Zenith 2FA 核心已全面啟動！');
});

// 1. 初始化與帳密登入
app.post('/api/auth/login', async (req, res) => {
    try {
        // 第一步：先向 Riot 拿取初始授權工作階段
        const initRes = await axios.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: "play-valorant-web-prod",
            response_type: "token id_token",
            redirect_uri: "https://playvalorant.com/opt_in",
            scope: "openid link ban",
            nonce: "1"
        });

        let currentCookies = initRes.headers['set-cookie'] || [];

        // 第二步：直接帶上 Cookie 提交帳密
        const loginRes = await axios.put('https://auth.riotgames.com/api/v1/authorization', {
            type: "auth",
            username: req.body.username,
            password: req.body.password,
            remember: true
        }, {
            headers: {
                'Cookie': currentCookies.join('; '),
                'Content-Type': 'application/json',
                'User-Agent': 'RiotClient/60.0.6.4870919.4742074 rso-auth (windows)'
            }
        });

        if (loginRes.headers['set-cookie']) {
            savedCookies = loginRes.headers['set-cookie'];
        }

        res.json(loginRes.data);
    } catch (error) {
        // 當觸發 2FA 的時候，Riot 會噴出 400 錯誤，我們要在這裡攔截它
        if (error.response && error.response.data) {
            if (error.response.headers['set-cookie']) {
                savedCookies = error.response.headers['set-cookie'];
            }
            return res.json(error.response.data);
        }
        res.status(500).json({ error: "驗證發生未知錯誤" });
    }
});

// 2. 專門用來送出 6 位數驗證碼的通道
app.post('/api/auth/mfa', async (req, res) => {
    try {
        const mfaRes = await axios.put('https://auth.riotgames.com/api/v1/authorization', {
            type: "mfa",
            code: req.body.code,
            remember: true
        }, {
            headers: {
                'Cookie': savedCookies.join('; '),
                'Content-Type': 'application/json',
                'User-Agent': 'RiotClient/60.0.6.4870919.4742074 rso-auth (windows)'
            }
        });

        res.json(mfaRes.data);
    } catch (error) {
        if (error.response && error.response.data) {
            return res.json(error.response.data);
        }
        res.status(500).json({ error: "驗證碼提交失敗" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
