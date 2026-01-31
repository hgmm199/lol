// index.js
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, Events, REST, Routes } = require('discord.js');
const { spawn } = require('child_process');

// ================= CẤU HÌNH BOT CHÍNH =================
const TOKEN_BOT_MAIN = 'token'; // <--- Thay Token Bot Discord Developer
const CLIENT_ID = '1421008624817279106';   // <--- Thay ID Bot Discord Developer

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Biến lưu trữ các tiến trình đang chạy để quản lý (Key: ID Kênh)
const runningProcesses = new Map();

// Đăng ký lệnh /token
const commands = [{ name: 'token', description: 'Kích hoạt Auto Chat' }];
const rest = new REST({ version: '10' }).setToken(TOKEN_BOT_MAIN);
(async () => {
    try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); console.log('✅ Đã đăng ký lệnh /token'); } 
    catch (e) { console.error(e); }
})();

client.on(Events.InteractionCreate, async interaction => {
    // 1. Hiện Modal nhập liệu
    if (interaction.isChatInputCommand() && interaction.commandName === 'token') {
        const modal = new ModalBuilder().setCustomId('autoChatModal').setTitle('Cấu hình Bot Groq');
        
        // Ô 1: Token
        const tokenInput = new TextInputBuilder()
            .setCustomId('tokenIn')
            .setLabel("Token Account")
            .setPlaceholder("Dán token vào đây...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Ô 2: ID Kênh (Để bạn tùy chọn kênh muốn chạy)
        const channelInput = new TextInputBuilder()
            .setCustomId('channelIn')
            .setLabel("ID Kênh Discord")
            .setPlaceholder("Ví dụ: 123456789...")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(tokenInput), 
            new ActionRowBuilder().addComponents(channelInput)
        );
        
        await interaction.showModal(modal);
    }

    // 2. Xử lý khi bấm nút "Gửi" -> CHẠY LUÔN
    if (interaction.isModalSubmit() && interaction.customId === 'autoChatModal') {
        const userToken = interaction.fields.getTextInputValue('tokenIn').trim();
        const targetChannelId = interaction.fields.getTextInputValue('channelIn').trim();

        // Kiểm tra xem kênh này đã có bot chạy chưa, nếu có thì tắt cái cũ đi
        if (runningProcesses.has(targetChannelId)) {
            console.log(`--- Đang khởi động lại bot cho kênh ${targetChannelId} ---`);
            const oldProcess = runningProcesses.get(targetChannelId);
            oldProcess.kill(); 
            runningProcesses.delete(targetChannelId);
        }

        console.log(`>>> KÍCH HOẠT WORKER NGAY LẬP TỨC CHO KÊNH: ${targetChannelId}`);

        // --- SPAWN: Chạy file worker.js ngầm ---
        const worker = spawn('node', ['worker.js', userToken, targetChannelId]);

        // Lưu tiến trình vào bộ nhớ để quản lý
        runningProcesses.set(targetChannelId, worker);

        // In log ra console
        worker.stdout.on('data', (data) => console.log(`[Worker ${targetChannelId}]: ${data}`));
        worker.stderr.on('data', (data) => console.error(`[Worker Lỗi]: ${data}`));
        
        worker.on('close', (code) => {
            console.log(`Worker kênh ${targetChannelId} đã dừng.`);
            runningProcesses.delete(targetChannelId);
        });

        // Phản hồi cho người dùng
        await interaction.reply({ 
            content: `✅ **Đã kích hoạt thành công!**\n- Bot đang chạy ngầm cho kênh: \`${targetChannelId}\`\n- Nếu muốn tắt hoặc đổi Token, hãy nhập lại lệnh \`/token\`.`, 
            ephemeral: true 
        });
    }
});

client.login(TOKEN_BOT_MAIN);
