const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const PROMOTIONS_FILE = 'promotions.json';

// Функции для работы с акциями
async function loadPromotions() {
    try {
        const data = await fs.promises.readFile(PROMOTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Файл акций не найден, создаем новый');
        return [];
    }
}

async function savePromotions(promotions) {
    await fs.promises.writeFile(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
}

// Обработка API запросов для акций
async function handlePromotionsAPI(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    try {
        if (req.method === 'GET') {
            // Получение всех акций
            const promotions = await loadPromotions();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(promotions));
            
        } else if (req.method === 'POST') {
            // Создание новой акции
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const newPromotion = JSON.parse(body);
                    const promotions = await loadPromotions();
                    
                    // Добавляем ID и дату создания
                    newPromotion.id = Date.now();
                    newPromotion.createdAt = new Date().toISOString();
                    
                    promotions.push(newPromotion);
                    await savePromotions(promotions);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(newPromotion));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Неверный формат данных' }));
                }
            });
            
        } else if (req.method === 'PUT') {
            // Обновление акции
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const updatedPromotion = JSON.parse(body);
                    const promotions = await loadPromotions();
                    
                    const index = promotions.findIndex(p => p.id === updatedPromotion.id);
                    if (index !== -1) {
                        promotions[index] = { ...promotions[index], ...updatedPromotion };
                        await savePromotions(promotions);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(promotions[index]));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: 'Акция не найдена' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Неверный формат данных' }));
                }
            });
            
        } else if (req.method === 'DELETE') {
            // Удаление акции
            const urlParts = url.parse(req.url, true);
            const id = parseInt(urlParts.query.id);
            
            if (!id) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'ID акции не указан' }));
                return;
            }
            
            const promotions = await loadPromotions();
            const index = promotions.findIndex(p => p.id === id);
            
            if (index !== -1) {
                const deletedPromotion = promotions.splice(index, 1)[0];
                await savePromotions(promotions);
                
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(deletedPromotion));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Акция не найдена' }));
            }
            
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Метод не поддерживается' }));
        }
    } catch (error) {
        console.error('Ошибка API акций:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
    }
}

// MIME типы для разных расширений файлов
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    // Парсим URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Убираем trailing slash
    if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
    }
    
    // API эндпоинты для акций
    if (pathname === '/api/promotions') {
        handlePromotionsAPI(req, res);
        return;
    }
    
    // Если запрос к корню, показываем index.html
    if (pathname === '' || pathname === '/') {
        pathname = '/index.html';
    }
    
    // Получаем расширение файла
    const ext = path.parse(pathname).ext;
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Путь к файлу
    const filePath = path.join(__dirname, pathname);
    
    // Проверяем, существует ли файл
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Файл не найден
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - Страница не найдена</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #e74c3c; font-size: 72px; margin-bottom: 20px; }
                        .message { font-size: 24px; margin-bottom: 20px; }
                        .back { color: #3498db; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="error">404</div>
                    <div class="message">Страница не найдена</div>
                    <a href="/" class="back">Вернуться на главную</a>
                </body>
                </html>
            `);
            return;
        }
        
        // Читаем файл
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('Ошибка сервера');
                return;
            }
            
            // Устанавливаем заголовки
            res.writeHead(200, { 
                'Content-Type': mimeType + (mimeType.startsWith('text/') ? '; charset=utf-8' : ''),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            
            // Отправляем данные
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Приложение доступно по адресу: http://localhost:${PORT}`);
    console.log(`🔗 Для тестирования с параметрами: http://localhost:${PORT}?id=123&api_key=your_api_key`);
    console.log(`\n📋 Доступные файлы:`);
    console.log(`   - index.html - Главная страница`);
    console.log(`   - main.js - Основная логика`);
    console.log(`   - styles.css - Стили`);
    console.log(`   - admin-bot.js - Telegram бот`);
    console.log(`\n⏹️  Для остановки сервера нажмите Ctrl+C`);
});

// Обработка ошибок
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} уже занят. Попробуйте другой порт.`);
    } else {
        console.error('❌ Ошибка сервера:', err);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка сервера...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
}); 