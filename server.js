const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// 允許你的 GitHub 前端跨網域帶上 Cookie 憑證！
app.use(cors({
    origin: "https://nings123.github.io",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('🎉 Zenith 獨立 Session 安全版已啟動！');
});

// 1. 初始化與帳密登入
app.post('/api/auth/login', async (req, res) => {
    try {
        // 先拿取初始授權工作階段
        const initRes = await axios.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: "play-valorant-web-prod",
            response_type: "token id_token",
            redirect_uri: "https://playvalorant.com/opt_in",
            scope: "openid link ban",
            nonce: "1"
        });

        let currentCookies = initRes.headers['set-cookie'] || [];

        // 帶上初始 Cookie 提交帳密
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

        // 將這一次的專屬 Cookie 存在用戶自己的瀏覽器 Cookie 裡，絕不跟別人混淆
        if (loginRes.headers['set-cookie']) {
            res.setHeader('Set-Cookie', loginRes.headers['set-cookie']);
        }

        res.json(loginRes.data);
    } catch (error) {
        if (error.response && error.response.data) {
            if (error.response.headers['set-cookie']) {
                res.setHeader('Set-Cookie', error.response.headers['set-cookie']);
            }
            return res.json(error.response.data);
        }
        res.status(500).json({ error: "驗證發生未知錯誤" });
    }
});

// 2. 獨立的 2FA 驗證碼通道
app.post('/api/auth/mfa', async (req, res) => {
    try {
        // 從使用者的瀏覽器要求中，把剛剛存的 Riot Cookie 還原出來
        const userCookies = req.headers.cookie || '';

        const mfaRes = await axios.put('https://auth.riotgames.com/api/v1/authorization', {
            type: "mfa",
            code: req.body.code,
            remember: true
        }, {
            headers: {
                'Cookie': userCookies,
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
    console.log(`Server is running securely on port ${PORT}`);
});
