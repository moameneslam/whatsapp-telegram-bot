import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async qr => {
    console.log('Scan this QR to log in to WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    try {
        // Generate QR code as image and send to Telegram
        const qrImage = await QRCode.toBuffer(qr, { width: 500 });
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', qrImage, { filename: 'whatsapp-qr.png' });
        formData.append('caption', '📱 Scan this QR code with WhatsApp to connect the bot');

        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, formData, {
            headers: formData.getHeaders(),
        });
        
        console.log('✅ QR code sent to Telegram');
    } catch (err) {
        console.error('Error sending QR to Telegram:', err.message);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp is connected and ready!');
});

client.on('message', async msg => {
    try {
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            const buffer = Buffer.from(media.data, 'base64');

            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('document', buffer, { filename: `${msg.timestamp}.${media.mimetype.split('/')[1]}` });

            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, formData, {
                headers: formData.getHeaders(),
            });

            console.log('📤 File forwarded to Telegram');
        } else {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: msg.body || '(empty message)',
            });
            console.log('💬 Message forwarded to Telegram');
        }
    } catch (err) {
        console.error('Error forwarding message:', err.message);
    }
});

client.initialize();
