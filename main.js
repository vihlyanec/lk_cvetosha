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
const CLIENT_ID = urlParams.get('id') || '749140859';
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

// --- Функции для работы с API Salebot через прокси ---
async function saveClientVariables(clientId, variables) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`/api/salebot/${API_KEY}/save_variables`, {
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
    fetch(
        `https://chatter.salebot.pro/api/${API_KEY}/get_variables?client_id=${clientId}`
      ).then((body) => body.json());
    }
// --- Планирование колбэка ---
async function scheduleCallback(clientId, message, sendTime) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`/api/salebot/${API_KEY}/callback`, {
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

// --- Получение деталей заказа ---
async function getOrderDetails(orderId, clientId) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        const response = await fetch(`/api/salebot/${API_KEY}/get_order_vars`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                client_id: clientId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка получения деталей заказа: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка получения деталей заказа:', error);
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

// --- Загрузка акций ---
async function loadPromotions() {
    try {
        // Сначала пытаемся загрузить из Salebot
        if (userVariables && (userVariables['promotions'] || userVariables['client.promotions'])) {
            const promotionsData = userVariables['promotions'] || userVariables['client.promotions'];
            try {
                promotions = JSON.parse(promotionsData);
                console.log('Акции загружены из Salebot:', promotions);
            } catch (e) {
                console.error('Ошибка парсинга акций из Salebot:', e);
                promotions = [];
            }
        } else {
            // Fallback: загружаем из локального файла
            try {
                const response = await fetch('/api/promotions');
                if (response.ok) {
                    promotions = await response.json();
                    console.log('Акции загружены из локального API:', promotions);
                } else {
                    console.error('Не удалось загрузить акции из локального API');
                    promotions = [];
                }
            } catch (error) {
                console.error('Ошибка загрузки акций:', error);
                promotions = [];
            }
        }
        
        renderPromotions();
        
    } catch (error) {
        console.error('Ошибка в loadPromotions:', error);
        promotions = [];
        renderPromotions();
    }
}

// --- Сохранение акций ---
async function savePromotions() {
    try {
        // Сохраняем локально как backup
        localStorage.setItem('promotions', JSON.stringify(promotions));
        
        // Сохраняем в Salebot если есть CLIENT_ID
        if (CLIENT_ID) {
            await saveClientVariables(CLIENT_ID, { 'client.promotions': JSON.stringify(promotions) });
        }
        
        showNotification('Акции успешно сохранены!');
        
    } catch (error) {
        console.error('Ошибка сохранения акций:', error);
        showNotification('Ошибка при сохранении акций', 'error');
    }
}

// --- Рендер акций ---
function renderPromotions() {
    if (!elements.promotionsFeed) return;
    
    if (promotions.length === 0) {
        elements.promotionsFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <div class="empty-text">
                    <strong>Акций пока нет</strong><br>
                    Здесь будут отображаться текущие акции и спецпредложения
                </div>
            </div>
        `;
        return;
    }
    
    // Фильтруем только активные акции
    const activePromotions = promotions.filter(promo => promo.isActive);
    
    if (activePromotions.length === 0) {
        elements.promotionsFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏰</div>
                <div class="empty-text">
                    <strong>Активных акций нет</strong><br>
                    Следите за обновлениями!
                </div>
            </div>
        `;
        return;
    }
    
    elements.promotionsFeed.innerHTML = activePromotions.map(promo => `
        <div class="promo-card">
            ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="promo-image" />` : ''}
            <div class="promo-content">
                <h3 class="promo-title">${promo.title}</h3>
                <p class="promo-description">${promo.description}</p>
                ${promo.endDate ? `<div class="promo-end-date">До ${promo.endDate}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// --- Навигация ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            if (targetPage) {
                switchPage(targetPage);
            }
        });
    });
}

function switchPage(pageId) {
    // Скрываем все страницы
    Object.values(elements).forEach(element => {
        if (element && element.classList && element.classList.contains('page')) {
            element.classList.remove('active');
        }
    });
    
    // Убираем активный класс у всех кнопок навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем нужную страницу
    const targetPage = elements[pageId];
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Активируем соответствующую кнопку навигации
    const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Обновляем текущую страницу
    currentPage = pageId;
    
    // Загружаем данные для страницы
    switch (pageId) {
        case 'orders-page':
            loadOrders();
            break;
        case 'dates-page':
            renderCalendar();
            renderSavedDates();
            break;
        case 'admin-page':
            if (isAdmin) {
                loadAdminPromotions();
            }
            break;
    }
}

// --- Уведомления ---
function showNotification(message, type = 'success') {
    if (elements.notificationModal) {
        elements.notificationText.textContent = message;
        elements.notificationModal.classList.add('active');
        
        setTimeout(() => {
            elements.notificationModal.classList.remove('active');
        }, 3000);
    }
}

// --- Загрузка заказов ---
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
    
    const endDate = new Date(year, month + 1, 0);
    const lastDate = new Date(endDate);
    lastDate.setDate(lastDate.getDate() + (6 - endDate.getDay()));
    
    let currentDateObj = new Date(startDate);
    
    while (currentDateObj <= lastDate) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dateString = currentDateObj.toISOString().split('T')[0];
        const isCurrentMonth = currentDateObj.getMonth() === month;
        const isToday = dateString === new Date().toISOString().split('T')[0];
        const isHoliday = holidays2025.includes(dateString);
        const isSelected = selectedDate && selectedDate.toDateString() === currentDateObj.toDateString();
        const hasEvent = savedDates.some(date => date.date === dateString);
        
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }
        if (isToday) {
            dayElement.classList.add('today');
        }
        if (isHoliday) {
            dayElement.classList.add('holiday');
        }
        if (isSelected) {
            dayElement.classList.add('selected');
        }
        if (hasEvent) {
            dayElement.classList.add('has-event');
        }
        
        dayElement.textContent = currentDateObj.getDate();
        dayElement.addEventListener('click', () => selectDate(currentDateObj));
        
        elements.calendarDays.appendChild(dayElement);
        
        currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    updateStatusInfo();
}

// --- Проверка возможности выбора даты ---
function canSelectDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

// --- Выбор даты ---
function selectDate(date) {
    if (!canSelectDate(date)) {
        showNotification('Нельзя выбрать прошедшую дату');
        return;
    }
    
    selectedDate = date;
    
    // Обновляем выделение в календаре
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    const dateString = date.toISOString().split('T')[0];
    const dayElement = document.querySelector(`.calendar-day[data-date="${dateString}"]`);
    if (dayElement) {
        dayElement.classList.add('selected');
    }
    
    // Показываем модальное окно для добавления события
    if (elements.eventModal) {
        elements.selectedDateText.textContent = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        elements.eventModal.classList.add('active');
    }
    
    updateStatusInfo();
}

// --- Обновление информации о статусе ---
function updateStatusInfo() {
    if (!elements.statusInfo) return;
    
    const currentYear = currentDate.getFullYear();
    const yearDates = savedDates.filter(date => {
        const dateYear = new Date(date.date).getFullYear();
        return dateYear === currentYear;
    });
    
    if (yearDates.length === 0) {
        elements.statusInfo.innerHTML = `
            <div class="status-empty">
                <div class="status-icon">📅</div>
                <div class="status-text">
                    <strong>В этом году памятных дат нет</strong><br>
                    Добавьте важные даты, чтобы не забыть о них
                </div>
            </div>
        `;
    } else {
        elements.statusInfo.innerHTML = `
            <div class="status-info">
                <div class="status-icon">✅</div>
                <div class="status-text">
                    <strong>В этом году: ${yearDates.length} памятных дат</strong><br>
                    Последнее обновление: ${lastSavedYear === currentYear ? 'сегодня' : 'недавно'}
                </div>
            </div>
        `;
    }
}

// --- Удаление даты ---
function removeDate(index) {
    savedDates.splice(index, 1);
    renderSavedDates();
    renderCalendar();
    updateSaveButton();
}

// --- Рендер сохраненных дат ---
function renderSavedDates() {
    if (!elements.datesList) return;
    
    if (savedDates.length === 0) {
        elements.datesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-text">
                    <strong>Памятных дат нет</strong><br>
                    Выберите дату в календаре и добавьте событие
                </div>
            </div>
        `;
        return;
    }
    
    elements.datesList.innerHTML = savedDates.map((date, index) => {
        const dateObj = new Date(date.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <div class="date-item">
                <div class="date-info">
                    <div class="date-name">${date.name}</div>
                    <div class="date-date">📅 ${formattedDate}</div>
                </div>
                <button class="remove-date-btn" onclick="removeDate(${index})">🗑️</button>
            </div>
        `;
    }).join('');
}

// --- Обновление кнопки сохранения ---
function updateSaveButton() {
    if (!elements.saveBtn) return;
    
    const hasChanges = savedDates.length > 0;
    elements.saveBtn.disabled = !hasChanges;
    
    const btnText = elements.saveBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = hasChanges ? 'Сохранить даты' : 'Нет изменений';
    }
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
        const response = await fetch('/api/promotions');
        if (response.ok) {
            promotions = await response.json();
        } else {
            promotions = [];
        }
        
        renderAdminPromotions();
        
    } catch (error) {
        console.error('Ошибка загрузки акций для админа:', error);
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
                <div class="empty-icon">🎉</div>
                <div class="empty-text">
                    <strong>Акций нет</strong><br>
                    Добавьте первую акцию
                </div>
            </div>
        `;
        return;
    }
    
    elements.adminPromotionsList.innerHTML = promotions.map((promo, index) => `
        <div class="admin-promo-item">
            <div class="promo-preview">
                ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="promo-preview-image" />` : ''}
                <div class="promo-preview-content">
                    <h4>${promo.title}</h4>
                    <p>${promo.description}</p>
                    <div class="promo-status ${promo.isActive ? 'active' : 'inactive'}">
                        ${promo.isActive ? 'Активна' : 'Неактивна'}
                    </div>
                </div>
            </div>
            <div class="promo-actions">
                <button class="edit-btn" onclick="editPromotion(${index})">✏️</button>
                <button class="delete-btn" onclick="deletePromotion(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// --- Редактирование акции ---
function editPromotion(promoId) {
    // Заполняем форму данными акции
    const promo = promotions[promoId];
    elements.promoTitle.value = promo.title;
    elements.promoDescription.value = promo.description;
    elements.promoImage.value = promo.image || '';
    elements.promoEndDate.value = promo.endDate || '';
    
    // Показываем превью изображения
    if (promo.image) {
        elements.imagePreview.src = promo.image;
        elements.imagePreview.style.display = 'block';
    } else {
        elements.imagePreview.style.display = 'none';
    }
    
    // Переключаемся на страницу админа
    switchPage('admin-page');
}

// --- Удаление акции ---
async function deletePromotion(promoId) {
    if (confirm('Вы уверены, что хотите удалить эту акцию?')) {
        promotions.splice(promoId, 1);
        await savePromotions();
        renderAdminPromotions();
        showNotification('Акция удалена');
    }
}

// --- Настройка обработчиков событий ---
function setupEventListeners() {
    // Навигация по месяцам
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
    
    // Модальные окна
    if (elements.eventModal) {
        elements.eventModal.addEventListener('click', (e) => {
            if (e.target === elements.eventModal) {
                elements.eventModal.classList.remove('active');
            }
        });
    }
    
    if (elements.notificationModal) {
        elements.notificationModal.addEventListener('click', (e) => {
            if (e.target === elements.notificationModal) {
                elements.notificationModal.classList.remove('active');
            }
        });
    }
    
    // Форма добавления события
    if (elements.eventName) {
        elements.eventName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addEvent();
            }
        });
    }
    
    // Форма добавления акции
    if (elements.promoForm) {
        elements.promoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addPromotion();
        });
    }
}

// --- Инициализация приложения ---
async function initApp() {
    try {
        console.log('Инициализация приложения...');
        
        // Проверяем наличие критических элементов
        if (!elements.mainPage) {
            console.error('Главная страница не найдена');
            return;
        }
        
        // Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Загружаем данные пользователя
        await loadUserData();
        
        // Показываем главную страницу
        switchPage('main-page');
        
        console.log('Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
    }
}

// --- Запуск приложения ---
document.addEventListener('DOMContentLoaded', initApp); 
