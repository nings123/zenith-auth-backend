const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let riotCookies = [];

app.get('/', (req, res) => {
    res.send('🎉 Zenith 基礎轉接橋樑運作中！');
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
        const response = await axios.put('https://auth.riotgames.com/api/v1/authorization', {
            type: "auth",
            username: req.body.username,
            password: req.body.password,
            remember: true
        }, {
            headers: {
                'Cookie': riotCookies.join('; '),
                'Content-Type': 'application/json',
                'User-Agent': 'RiotClient/60.0.6.4870919.4742074 rso-auth (windows)'
            }
        });
        res.json(response.data);
    } catch (error) {
        if (error.response && error.response.data) {
            return res.status(400).json(error.response.data);
        }
        res.status(500).json({ error: "Riot Auth Failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
