const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let riotCookies = [];

app.get('/', (req, res) => {
    res.send('🎉 Zenith 2FA 強效版運作中！');
});

app.post('/api/auth/init', async (req, res) => {
    try {
        const response = await axios.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: "play-valorant-web-prod",
            response_type: "token id_token",
            redirect_uri: "https://playvalorant.com/opt_in",
            scope: "openid link ban",
            nonce: "1"
        });
        if (response.headers['set-cookie']) riotCookies = response.headers['set-cookie'];
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Init Failed" });
    }
});

app.put('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.put('https://auth.riotgames.com/api/v1/authorization', req.body, {
            headers: {
                'Cookie': riotCookies.join('; '),
                'Content-Type': 'application/json',
                'User-Agent': 'RiotClient/60.0.6.4870919.4742074 rso-auth (windows)'
            }
        });
        if (response.headers['set-cookie']) riotCookies = response.headers['set-cookie'];
        res.json(response.data);
    } catch (error) {
        // 關鍵修復：不管是 400 還是 401 只要裡面有 mfa 資訊，就強制把狀態包成正確回應丟回給前端
        if (error.response && error.response.data) {
            if (error.response.headers['set-cookie']) riotCookies = error.response.headers['set-cookie'];
            return res.json({ type: "mfa", ...error.response.data });
        }
        res.status(500).json({ error: "Riot Auth Failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
