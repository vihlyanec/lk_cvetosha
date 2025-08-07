// Цветочный магазин — Telegram Mini App (Финальная версия)

// --- Telegram WebApp API ---
let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : { 
    close: () => {}, 
    initData: '', 
    initDataUnsafe: { user: null }
};

// --- Глобальные переменные ---
let currentDate = new Date();
let selectedDate = null;
let savedDates = [];
let userVariables = {};
let lastSavedYear = null;
let currentPage = 'main-page';
let promotions = [];
let orders = [];
let isAdmin = false;
let currentUserId = null;

// --- Получение параметров из URL ---
const urlParams = new URLSearchParams(window.location.search);
const CLIENT_ID = urlParams.get('id');
const API_KEY = urlParams.get('api_key');

console.log('URL параметры:', { CLIENT_ID, API_KEY });

// --- Глобальные переменные клиента ---
let clientFullName = '';
let clientAvatar = '';

// --- Праздники РФ (2025) ---
const holidays2025 = [
    '2025-01-01','2025-01-02','2025-01-03','2025-01-04','2025-01-05','2025-01-06','2025-01-07','2025-01-08',
    '2025-02-23','2025-03-08','2025-05-01','2025-05-09','2025-06-12','2025-11-04'
];

// --- DOM элементы ---
const elements = {
    mainPage: document.getElementById('main-page'),
    ordersPage: document.getElementById('orders-page'),
    datesPage: document.getElementById('dates-page'),
    adminPage: document.getElementById('admin-page'),
    
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userId: document.getElementById('user-id'),
    
    promotionsFeed: document.getElementById('promotions-feed'),
    ordersList: document.getElementById('orders-list'),
    
    currentMonth: document.getElementById('currentMonth'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    statusInfo: document.getElementById('statusInfo'),
    savedDatesSection: document.getElementById('savedDatesSection'),
    datesList: document.getElementById('datesList'),
    saveBtn: document.getElementById('saveBtn'),
    
    promoForm: document.getElementById('promoForm'),
    promoTitle: document.getElementById('promoTitle'),
    promoDescription: document.getElementById('promoDescription'),
    promoImage: document.getElementById('promoImage'),
    promoEndDate: document.getElementById('promoEndDate'),
    imagePreview: document.getElementById('imagePreview'),
    adminPromotionsList: document.getElementById('adminPromotionsList'),
    
    eventModal: document.getElementById('eventModal'),
    notificationModal: document.getElementById('notificationModal'),
    selectedDateText: document.getElementById('selectedDateText'),
    eventName: document.getElementById('eventName'),
    notificationText: document.getElementById('notificationText')
};

// --- Инициализация Telegram WebApp ---
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }
}

// --- Функции для работы с API Salebot ---
async function saveClientVariables(clientId, variables) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/save_variables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                variables: variables
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка сохранения переменных: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка сохранения переменных клиента:', error);
        throw error;
    }
}

async function getClientVariables(clientId) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_variables?client_id=${clientId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка получения переменных: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка получения переменных клиента:', error);
        throw error;
    }
}

// --- Планирование колбэка ---
async function scheduleCallback(clientId, message, sendTime) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                message: message,
                send_time: sendTime,
                resume_bot: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка планирования колбэка: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка планирования колбэка:', error);
        throw error;
    }
}

// --- Загрузка данных пользователя ---
async function loadUserData() {
    try {
        console.log('Загрузка данных пользователя...');
        
        // Проверяем наличие API ключа и CLIENT_ID
        if (!API_KEY || !CLIENT_ID) {
            console.warn('API ключ или CLIENT_ID не найдены в URL параметрах');
            console.log('Используем дефолтные данные');
            updateUserInfo();
            return;
        }
        
        console.log('Попытка загрузки данных из Salebot...');
        
        // Загружаем переменные пользователя из Salebot
        const data = await getClientVariables(CLIENT_ID);
        console.log('Данные от Salebot:', data);
        
        if (data.success && data.variables) {
            userVariables = data.variables;
            
            // Загружаем сохраненные даты из переменных клиента
            savedDates = [];
            for (let i = 1; i <= 3; i++) {
                const key = `client.memorable_date_${i}`;
                if (userVariables[key] && userVariables[key].trim() !== '') {
                    try {
                        const parsed = JSON.parse(userVariables[key]);
                        savedDates.push({ date: parsed.date, name: parsed.name, index: i });
                    } catch (parseError) {
                        console.error(`Ошибка парсинга даты ${i}:`, parseError);
                    }
                }
            }
            
            // Загружаем год последнего сохранения
            lastSavedYear = userVariables['client.last_saved_year'] ? parseInt(userVariables['client.last_saved_year']) : null;
            console.log('lastSavedYear загружен:', lastSavedYear);
            
            // Извлекаем данные клиента из переменных Salebot
            clientFullName = userVariables['client.full_name'] || userVariables['full_name'] || '';
            clientAvatar = userVariables['client.avatar'] || userVariables['avatar'] || '';
            
            console.log('Данные клиента загружены:', { clientFullName, clientAvatar });
            console.log('Все переменные Salebot:', userVariables);
        } else {
            console.warn('Не удалось получить переменные от Salebot');
        }
        
        // Обновляем информацию о пользователе
        updateUserInfo();
        
    } catch (err) {
        console.error('Ошибка загрузки данных пользователя:', err);
        console.log('Используем дефолтные данные из-за ошибки');
        updateUserInfo();
    }
}

// --- Проверка прав администратора ---
function checkAdminRights() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        currentUserId = user.id;
        
        // Получаем ID администраторов из переменных Salebot или используем дефолтные
        let adminIds = [1545106315]; // Дефолтные ID
        
        if (userVariables && userVariables['admin_ids']) {
            try {
                adminIds = JSON.parse(userVariables['admin_ids']);
            } catch (error) {
                console.error('Ошибка парсинга admin_ids:', error);
            }
        }
        
        isAdmin = adminIds.includes(user.id);
        
        const adminBtn = document.querySelector('.admin-only');
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'flex' : 'none';
        }
    }
}

// --- Обновление информации о пользователе ---
function updateUserInfo() {
    if (elements.userAvatar) {
        elements.userAvatar.src = clientAvatar || 'https://via.placeholder.com/40x40/cccccc/666666?text=👤';
        elements.userAvatar.alt = clientFullName || 'Пользователь';
    }
    
    if (elements.userName) {
        elements.userName.textContent = clientFullName || (CLIENT_ID ? `Пользователь ${CLIENT_ID}` : 'Гость');
    }
    
    if (elements.userId) {
        elements.userId.textContent = CLIENT_ID ? `ID: ${CLIENT_ID}` : '';
    }
}

// --- Загрузка промо-постов ---
async function loadPromotions() {
    try {
        console.log('Загружаем акции...');
        
        if (!elements.promotionsFeed) {
            console.error('Элемент promotions-feed не найден');
            return;
        }
        
        elements.promotionsFeed.innerHTML = '<div class="loading">Загружаем акции...</div>';
        
        // Если есть API ключ, пытаемся загрузить акции из Salebot
        if (API_KEY && userVariables) {
            console.log('Попытка загрузки акций из Salebot...');
            const storedPromotions = userVariables['promotions'] || userVariables['client.promotions'];
            if (storedPromotions) {
                try {
                    promotions = JSON.parse(storedPromotions);
                    console.log('Акции загружены из Salebot:', promotions.length);
                } catch (error) {
                    console.error('Ошибка парсинга акций из Salebot:', error);
                }
            }
        }
        
        // Если акции не загружены из Salebot, загружаем из файла
        if (!promotions || promotions.length === 0) {
            console.log('Загружаем акции из файла promotions.json...');
            const response = await fetch('promotions.json');
            if (response.ok) {
                promotions = await response.json();
                console.log('Акции загружены из файла:', promotions.length);
            } else {
                console.warn('Файл promotions.json не найден');
                promotions = [];
            }
        }
        
        // Фильтруем только действующие акции
        const currentDate = new Date();
        const activePromotions = promotions.filter(promo => {
            const endDate = new Date(promo.date);
            return endDate > currentDate;
        });
        
        console.log(`Загружено ${activePromotions.length} действующих акций из ${promotions.length} всего`);
        
        renderPromotions();
        
    } catch (err) {
        console.error('Ошибка загрузки промо-постов:', err);
        if (elements.promotionsFeed) {
            elements.promotionsFeed.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Ошибка загрузки акций</strong><br>
                        Не удалось получить данные. Попробуйте позже.
                    </div>
                    <button class="retry-btn" onclick="loadPromotions()">Повторить</button>
                </div>
            `;
        }
    }
}

// --- Сохранение акций ---
async function savePromotions() {
    try {
        // Сохраняем в localStorage как резервную копию
        localStorage.setItem('cvetosha_promotions', JSON.stringify(promotions));
        
        // Если есть API ключ, сохраняем в Salebot
        if (API_KEY && CLIENT_ID) {
            await saveClientVariables(CLIENT_ID, {
                'client.promotions': JSON.stringify(promotions)
            });
        }
    } catch (error) {
        console.error('Ошибка сохранения акций:', error);
    }
}

// --- Рендер промо-постов ---
function renderPromotions() {
    console.log('renderPromotions вызвана, количество акций:', promotions.length);
    
    if (!elements.promotionsFeed) {
        console.error('Элемент promotions-feed не найден для рендера');
        return;
    }
    
    if (promotions.length === 0) {
        elements.promotionsFeed.innerHTML = `
            <div class="coming-soon">
                <div class="coming-soon-icon">🎉</div>
                <h3>Скоро здесь будут акции!</h3>
                <p>Мы готовим для вас специальные предложения и скидки на цветы. Следите за обновлениями!</p>
            </div>
        `;
        return;
    }
    
    elements.promotionsFeed.innerHTML = promotions.map(promo => `
        <div class="promo-card ${!promo.image ? 'no-image' : ''}">
            ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="promo-image" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');" />` : ''}
            <div class="promo-content">
                <h3 class="promo-title">${promo.title}</h3>
                <p class="promo-description">${promo.description}</p>
                <div class="promo-date">
                    <span class="promo-date-icon">📅</span>
                    До ${new Date(promo.date).toLocaleDateString('ru-RU')}
                </div>
            </div>
        </div>
    `).join('');
}

// --- Настройка навигации ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            switchPage(targetPage);
        });
    });
}

// --- Переключение страниц ---
function switchPage(pageId) {
    if (pageId === 'admin-page' && !isAdmin) {
        showNotification('У вас нет доступа к панели администратора');
        return;
    }
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    currentPage = pageId;
    
    switch (pageId) {
        case 'main-page':
            loadPromotions();
            break;
        case 'orders-page':
            loadOrders();
            break;
        case 'dates-page':
            renderCalendar();
            renderSavedDates();
            updateStatusInfo();
            updateSaveButton();
            break;
        case 'admin-page':
            loadAdminPromotions();
            break;
    }
}

// --- Показ уведомлений ---
function showNotification(message) {
    alert(message); // Простая заглушка для уведомлений
}

// --- Загрузка истории заказов ---
async function loadOrders() {
    try {
        if (!elements.ordersList) return;
        
        elements.ordersList.innerHTML = '<div class="loading">Загружаем историю заказов...</div>';
        
        if (!CLIENT_ID) {
            elements.ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">
                        <strong>История заказов недоступна</strong><br>
                        Для просмотра заказов необходимо авторизоваться
                    </div>
                </div>
            `;
            return;
        }
        
        // Заглушка для заказов
        orders = [];
        renderOrders();
        
    } catch (err) {
        console.error('Ошибка загрузки заказов:', err);
        if (elements.ordersList) {
            elements.ordersList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Ошибка загрузки заказов</strong><br>
                        Не удалось получить данные. Попробуйте позже.
                    </div>
                    <button class="retry-btn" onclick="loadOrders()">Повторить</button>
                </div>
            `;
        }
    }
}

// --- Рендер истории заказов ---
function renderOrders() {
    if (!elements.ordersList) return;
    
    if (orders.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">
                    <strong>Заказов пока нет</strong><br>
                    Здесь будут отображаться ваши заказы
                </div>
            </div>
        `;
        return;
    }
    
    elements.ordersList.innerHTML = orders.map(order => {
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const formattedTotal = typeof order.total === 'number' 
            ? `${order.total}₽` 
            : order.total;
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-number">${order.id}</span>
                    <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="order-details">${order.items}</div>
                <div class="order-info">
                    <div class="order-date">📅 ${formattedDate}</div>
                    <div class="order-total">💰 ${formattedTotal}</div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Календарь ---
function renderCalendar() {
    if (!elements.currentMonth || !elements.calendarDays) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    
    elements.currentMonth.textContent = `${monthNames[month]} ${year}`;
    elements.calendarDays.innerHTML = '';
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        if (date.getMonth() !== month) {
            dayElement.classList.add('other-month');
        } else {
            const dateString = date.toISOString().split('T')[0];
            
            if (holidays2025.includes(dateString)) {
                dayElement.classList.add('holiday');
            } else {
                const isSaved = savedDates.some(saved => saved.date === dateString);
                if (isSaved) {
                    dayElement.classList.add('saved');
                } else if (!canSelectDate(date)) {
                    dayElement.classList.add('disabled');
                } else {
                    dayElement.addEventListener('click', () => selectDate(date));
                }
            }
        }
        
        elements.calendarDays.appendChild(dayElement);
    }
}

// --- Проверка возможности выбора даты ---
function canSelectDate(date) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentYear = today.getFullYear();
    
    return date >= today && date.getFullYear() === currentYear && savedDates.length < 3;
}

// --- Выбор даты ---
function selectDate(date) {
    if (!canSelectDate(date)) return;
    
    selectedDate = date;
    const eventName = prompt('Введите название события:');
    if (eventName && eventName.trim()) {
        const dateString = date.toISOString().split('T')[0];
        const existingIndex = savedDates.findIndex(date => date.date === dateString);
        
        if (existingIndex !== -1) {
            savedDates[existingIndex].name = eventName.trim();
        } else {
            savedDates.push({
                date: dateString,
                name: eventName.trim(),
                index: savedDates.length + 1
            });
        }
        
        renderCalendar();
        renderSavedDates();
        updateStatusInfo();
        updateSaveButton();
        
        showNotification('Событие добавлено!');
    }
}

// --- Обновление информации о статусе ---
function updateStatusInfo() {
    if (!elements.statusInfo) return;
    
    const count = savedDates.length;
    const maxCount = 3;
    
    if (count === 0) {
        elements.statusInfo.textContent = 'Выберите до 3 памятных дат, чтобы получать цветочные напоминания 🌸';
    } else if (count < maxCount) {
        elements.statusInfo.textContent = `Выбрано ${count} из ${maxCount} дат. Можно добавить еще ${maxCount - count} 🌸`;
    } else {
        elements.statusInfo.textContent = 'Достигнут лимит памятных дат. Можно удалить одну из существующих 🌸';
    }
}

// --- Удаление даты ---
function removeDate(index) {
    savedDates.splice(index, 1);
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
    showNotification('Дата удалена');
}

// --- Рендер сохраненных дат ---
function renderSavedDates() {
    if (!elements.savedDatesSection || !elements.datesList) return;
    
    if (savedDates.length === 0) {
        elements.savedDatesSection.style.display = 'none';
        return;
    }
    
    elements.savedDatesSection.style.display = 'block';
    elements.datesList.innerHTML = savedDates.map((date, index) => {
        const dateObj = new Date(date.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
        
        return `
            <div class="date-item">
                <div class="date-info">
                    <div class="date-number">${formattedDate}</div>
                    <div class="event-name">${date.name}</div>
                </div>
                <button class="remove-btn" onclick="removeDate(${index})">✕</button>
            </div>
        `;
    }).join('');
}

// --- Обновление кнопки сохранения ---
function updateSaveButton() {
    if (!elements.saveBtn) return;
    
    const btnText = elements.saveBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = savedDates.length > 0 ? 'Сохранить даты' : 'Нет дат для сохранения';
    }
    
    elements.saveBtn.disabled = savedDates.length === 0;
}

// --- Сохранение дат ---
async function saveDates() {
    try {
        if (!CLIENT_ID) {
            return showNotification('Для сохранения дат необходимо авторизоваться');
        }
        
        if (savedDates.length === 0) {
            return showNotification('Нет дат для сохранения');
        }
        
        const currentYear = new Date().getFullYear();
        
        // Подготавливаем переменные для сохранения
        const clientVariables = {
            'client.memorable_dates_year': currentYear.toString(),
            'client.last_saved_year': currentYear.toString(),
            'client.memorable_dates_count': savedDates.length.toString()
        };
        
        // Добавляем памятные даты
        savedDates.forEach((date, index) => {
            clientVariables[`client.memorable_date_${index + 1}`] = JSON.stringify({ 
                date: date.date, 
                name: date.name 
            });
        });
        
        // Очищаем оставшиеся переменные дат
        for (let i = savedDates.length + 1; i <= 3; i++) {
            clientVariables[`client.memorable_date_${i}`] = '';
        }
        
        if (elements.saveBtn) {
            elements.saveBtn.disabled = true;
            const btnText = elements.saveBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Сохраняем...';
        }
        
        // Сохраняем переменные в профиль клиента
        await saveClientVariables(CLIENT_ID, clientVariables);
        
        // Планируем колбэки для каждой памятной даты
        const scheduledCallbacks = [];
        for (const dateInfo of savedDates) {
            try {
                const eventDate = new Date(dateInfo.date);
                const currentDate = new Date();
                
                if (eventDate > currentDate) {
                    const message = `🎉 Напоминание о памятной дате!\n\n📅 ${dateInfo.name}\n📆 ${eventDate.toLocaleDateString('ru-RU')}\n\nНе забудьте поздравить близких! 🌸`;
                    const sendTime = eventDate.toISOString().slice(0, 19).replace('T', ' ');
                    
                    await scheduleCallback(CLIENT_ID, message, sendTime);
                    scheduledCallbacks.push(dateInfo.name);
                }
            } catch (callbackError) {
                console.error(`Ошибка планирования колбэка для ${dateInfo.name}:`, callbackError);
            }
        }
        
        if (elements.saveBtn) {
            elements.saveBtn.disabled = false;
            const btnText = elements.saveBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Сохранить даты';
        }
        
        // Показываем результат
        let resultMessage = 'Даты успешно сохранены!';
        if (scheduledCallbacks.length > 0) {
            resultMessage += `\n\nНапоминания запланированы для:\n${scheduledCallbacks.map(name => `• ${name}`).join('\n')}`;
        }
        
        showNotification(resultMessage);
        
    } catch (error) {
        if (elements.saveBtn) {
            elements.saveBtn.disabled = false;
            const btnText = elements.saveBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Сохранить даты';
        }
        showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`);
    }
}

// --- Загрузка акций для админа ---
async function loadAdminPromotions() {
    try {
        if (!elements.adminPromotionsList) return;
        
        elements.adminPromotionsList.innerHTML = '<div class="loading">Загружаем акции...</div>';
        
        // Загружаем все акции (включая неактивные)
        const response = await fetch('promotions.json');
        if (response.ok) {
            promotions = await response.json();
        } else {
            promotions = [];
        }
        
        renderAdminPromotions();
        
    } catch (err) {
        console.error('Ошибка загрузки акций для админа:', err);
        if (elements.adminPromotionsList) {
            elements.adminPromotionsList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Ошибка загрузки акций</strong><br>
                        Не удалось получить данные. Попробуйте позже.
                    </div>
                    <button class="retry-btn" onclick="loadAdminPromotions()">Повторить</button>
                </div>
            `;
        }
    }
}

// --- Рендер акций для админа ---
function renderAdminPromotions() {
    if (!elements.adminPromotionsList) return;
    
    if (promotions.length === 0) {
        elements.adminPromotionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">
                    <strong>Акций пока нет</strong><br>
                    Создайте первую акцию
                </div>
            </div>
        `;
        return;
    }
    
    elements.adminPromotionsList.innerHTML = promotions.map(promo => `
        <div class="admin-promo-card ${!promo.image ? 'no-image' : ''}">
            <div class="admin-promo-header">
                <h3 class="admin-promo-title">${promo.title}</h3>
                <div class="admin-promo-actions">
                    <button class="admin-promo-btn edit" onclick="editPromotion(${promo.id})">✏️</button>
                    <button class="admin-promo-btn delete" onclick="deletePromotion(${promo.id})">🗑️</button>
                </div>
            </div>
            <p class="admin-promo-description">${promo.description}</p>
            <div class="admin-promo-date">До ${new Date(promo.date).toLocaleDateString('ru-RU')}</div>
            ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="admin-promo-image" loading="lazy" />` : ''}
        </div>
    `).join('');
}

// --- Редактирование акции ---
function editPromotion(promoId) {
    showNotification('Функция редактирования в разработке');
}

// --- Удаление акции ---
async function deletePromotion(promoId) {
    if (!confirm('Вы уверены, что хотите удалить эту акцию?')) return;
    
    try {
        promotions = promotions.filter(p => p.id !== promoId);
        await savePromotions();
        
        renderPromotions();
        renderAdminPromotions();
        
        showNotification('Акция удалена');
    } catch (error) {
        console.error('Ошибка удаления акции:', error);
        showNotification('Ошибка удаления акции');
    }
}

// --- Настройка событий ---
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Календарь
    if (elements.prevMonth) {
        elements.prevMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (elements.nextMonth) {
        elements.nextMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Кнопка сохранения
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveDates);
    }
}

// --- Инициализация приложения ---
async function initApp() {
    try {
        console.log('Инициализация приложения...');
        
        // Проверяем наличие всех необходимых элементов
        const requiredElements = [
            'main-page', 'orders-page', 'dates-page', 'admin-page',
            'user-avatar', 'user-name', 'user-id',
            'promotions-feed', 'orders-list'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Отсутствуют элементы:', missingElements);
        } else {
            console.log('Все необходимые элементы найдены');
        }
        
        initTelegramWebApp();
        await loadUserData();
        checkAdminRights();
        setupNavigation();
        setupEventListeners();
        
        loadPromotions();
        
        console.log('Приложение инициализировано успешно');
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
    }
}

// --- Запуск приложения ---
document.addEventListener('DOMContentLoaded', initApp); 
