// Цветочный магазин — Telegram Mini App (GitHub Pages версия)

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

// Отладочная информация
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
            updateUserInfo(); // Показываем дефолтную информацию
            return;
        }
        
        console.log('Попытка загрузки данных из Salebot...');
        
        // Загружаем переменные пользователя из Salebot
        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_variables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: CLIENT_ID })
        });
        
        console.log('Ответ от Salebot API:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Данные от Salebot:', data);
            
            userVariables = data.variables || {};
            
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
            console.warn('Ошибка ответа от Salebot API:', response.status, response.statusText);
            const errorText = await response.text();
            console.warn('Текст ошибки:', errorText);
        }
        
        // Обновляем информацию о пользователе
        updateUserInfo();
        
    } catch (err) {
        console.error('Ошибка загрузки данных пользователя:', err);
        console.log('Используем дефолтные данные из-за ошибки');
        updateUserInfo(); // Показываем дефолтную информацию
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
    if (clientFullName) {
        elements.userName.textContent = clientFullName;
        elements.userId.textContent = `ID: ${CLIENT_ID}`;
        
        if (clientAvatar) {
            elements.userAvatar.src = clientAvatar;
        } else {
            elements.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(clientFullName)}&background=667eea&color=fff&size=48`;
        }
    } else {
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
            elements.userName.textContent = `${user.first_name} ${user.last_name || ''}`.trim();
            elements.userId.textContent = `ID: ${user.id}`;
            
            if (user.photo_url) {
                elements.userAvatar.src = user.photo_url;
            } else {
                elements.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name)}&background=667eea&color=fff&size=48`;
            }
        } else {
            elements.userName.textContent = 'Гость';
            elements.userId.textContent = CLIENT_ID ? `ID: ${CLIENT_ID}` : '';
            elements.userAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=667eea&color=fff&size=48';
        }
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
            // Пытаемся получить акции из переменных Salebot
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
                console.warn('Файл promotions.json не найден или недоступен');
                promotions = [];
            }
        }
        
        // Фильтруем только действующие акции (дата окончания в будущем)
        const currentDate = new Date();
        const activePromotions = promotions.filter(promo => {
            const endDate = new Date(promo.date);
            return endDate > currentDate;
        });
        
        console.log(`Загружено ${activePromotions.length} действующих акций из ${promotions.length} всего`);
        
        // Рендерим акции
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

// --- Получение деталей заказа ---
async function getOrderDetails(orderId, clientId) {
    try {
        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_order_vars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                order_id: orderId,
                variables: ['order_date', 'order_description', 'order_amount', 'order_items']
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.variables) {
                return {
                    date: data.variables.order_date || new Date().toISOString(),
                    description: data.variables.order_description || 'Описание недоступно',
                    amount: data.variables.order_amount || 0,
                    items: data.variables.order_items || 'Товары недоступны'
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения деталей заказа:', error);
        return null;
    }
}

// --- Загрузка истории заказов ---
async function loadOrders() {
    try {
        // Показываем состояние загрузки
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
        
        // Получаем все типы заказов: активные, успешные и проваленные
        const orderTypes = [
            { status: 0, name: 'Активные' },
            { status: 1, name: 'Успешные' },
            { status: 2, name: 'Отмененные' }
        ];
        
        let allOrders = [];
        
        for (const orderType of orderTypes) {
            try {
                const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        client_id: CLIENT_ID,
                        order_status: orderType.status
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.orders) {
                        // Получаем детали для каждого заказа
                        for (const order of data.orders) {
                            const orderDetails = await getOrderDetails(order.order_id, CLIENT_ID);
                            
                            if (orderDetails) {
                                allOrders.push({
                                    id: order.order_id,
                                    date: orderDetails.date,
                                    total: orderDetails.amount,
                                    items: orderDetails.description || orderDetails.items,
                                    status: orderType.name
                                });
                            } else {
                                // Если детали недоступны, используем базовую информацию
                                allOrders.push({
                                    id: order.order_id,
                                    date: order.created_at || new Date().toISOString(),
                                    total: order.total || 0,
                                    items: order.description || 'Описание недоступно',
                                    status: orderType.name
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Ошибка загрузки ${orderType.name.toLowerCase()} заказов:`, error);
            }
        }
        
        // Сортируем заказы по дате (новые сначала)
        orders = allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        renderOrders();
        
    } catch (err) {
        console.error('Ошибка загрузки заказов:', err);
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

// --- Рендер истории заказов ---
function renderOrders() {
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
        // Форматируем дату
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Форматируем сумму
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

// --- Навигация между страницами ---
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
    
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
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

// --- Календарь ---
function renderCalendar() {
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
    
    if (date.getFullYear() < currentYear) return false;
    if (date.getFullYear() === currentYear && date.getMonth() < today.getMonth()) return false;
    if (date.getFullYear() === currentYear && date.getMonth() === today.getMonth() && date.getDate() < today.getDate()) return false;
    
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) return false;
    
    return true;
}

// --- Выбор даты ---
function selectDate(date) {
    if (savedDates.length >= 3) {
        return showNotification('Достигнут максимум дат (3). Удалите одну из существующих дат, чтобы добавить новую.');
    }
    
    const today = new Date();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) {
        return showNotification('Нельзя добавлять даты, до которых меньше 15 дней.');
    }
    
    selectedDate = date;
    elements.selectedDateText.textContent = date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    elements.eventName.value = '';
    showPopup(elements.eventModal);
}

// --- Обновление информации о статусе ---
function updateStatusInfo() {
    if (savedDates.length >= 3) {
        elements.statusInfo.innerHTML = `<strong>Максимум дат достигнут!</strong> У вас уже выбрано 3 памятные даты.`;
        elements.statusInfo.style.background = "#fff3cd";
        elements.statusInfo.style.color = "#856404";
    } else if (savedDates.length === 0) {
        elements.statusInfo.innerHTML = `Выберите до 3 памятных дат, чтобы получать цветочные напоминания 🌸`;
        elements.statusInfo.style.background = "#e1bee7";
        elements.statusInfo.style.color = "#4a148c";
    } else {
        elements.statusInfo.innerHTML = `Выбрано дат: ${savedDates.length}/3. Можно добавлять новые даты.`;
        elements.statusInfo.style.background = "#e1bee7";
        elements.statusInfo.style.color = "#4a148c";
    }
}

// --- Добавить событие ---
function addEvent() {
    const eventName = elements.eventName.value.trim();
    if (!eventName) {
        return showNotification('Пожалуйста, введите название события.');
    }
    if (!selectedDate) {
        return showNotification('Ошибка: дата не выбрана.');
    }
    
    if (savedDates.length >= 3) {
        return showNotification('Достигнут лимит в 3 памятных дат.');
    }
    
    const newIndex = savedDates.length + 1;
    savedDates.push({ 
        date: selectedDate.toISOString().split('T')[0], 
        name: eventName, 
        index: newIndex 
    });
    
    hidePopup(elements.eventModal);
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// --- Удалить дату ---
function removeDate(index) {
    savedDates = savedDates.filter(date => date.index !== index);
    savedDates.forEach((date, i) => { date.index = i + 1; });
    
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// --- Рендер сохранённых дат ---
function renderSavedDates() {
    if (savedDates.length === 0) {
        elements.savedDatesSection.style.display = 'none';
        return;
    }
    
    elements.savedDatesSection.style.display = 'block';
    elements.datesList.innerHTML = '';
    
    savedDates.forEach(date => {
        const dateElement = document.createElement('div');
        dateElement.className = 'date-item';
        const dateObj = new Date(date.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        dateElement.innerHTML = `
            <div class="date-info">
                <div class="date-number">${formattedDate}</div>
                <div class="event-name">${date.name}</div>
            </div>
            <button class="remove-btn" onclick="removeDate(${date.index})">Удалить</button>
        `;
        
        elements.datesList.appendChild(dateElement);
    });
}

// --- Обновление кнопки сохранения ---
function updateSaveButton() {
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
        
        // Подготавливаем переменные для сохранения в профиль клиента
        const clientVariables = {
            'client.memorable_dates_year': currentYear.toString(),
            'client.last_saved_year': currentYear.toString(),
            'client.memorable_dates_count': savedDates.length.toString()
        };
        
        // Добавляем памятные даты в переменные клиента
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
        
        elements.saveBtn.disabled = true;
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохраняем...';
        
        // Сохраняем переменные в профиль клиента
        await saveClientVariables(CLIENT_ID, clientVariables);
        
        // Планируем колбэки для каждой памятной даты
        const scheduledCallbacks = [];
        for (const dateInfo of savedDates) {
            try {
                const eventDate = new Date(dateInfo.date);
                const currentDate = new Date();
                
                // Проверяем, что дата в будущем
                if (eventDate > currentDate) {
                    const message = `🎉 Напоминание о памятной дате!\n\n📅 ${dateInfo.name}\n📆 ${eventDate.toLocaleDateString('ru-RU')}\n\nНе забудьте поздравить близких! 🌸`;
                    
                    // Форматируем дату для API (YYYY-MM-DD HH:MM:SS)
                    const sendTime = eventDate.toISOString().slice(0, 19).replace('T', ' ');
                    
                    await scheduleCallback(CLIENT_ID, message, sendTime);
                    scheduledCallbacks.push(dateInfo.name);
                }
            } catch (callbackError) {
                console.error(`Ошибка планирования колбэка для ${dateInfo.name}:`, callbackError);
            }
        }
        
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохранить даты';
        elements.saveBtn.disabled = false;
        
        // Показываем результат
        let resultMessage = 'Даты успешно сохранены!';
        if (scheduledCallbacks.length > 0) {
            resultMessage += `\n\nНапоминания запланированы для:\n${scheduledCallbacks.map(name => `• ${name}`).join('\n')}`;
        }
        
        showNotification(resultMessage);
        
    } catch (error) {
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохранить даты';
        elements.saveBtn.disabled = false;
        showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`);
    }
}

// --- Модальные окна ---
function showPopup(popup) {
    document.getElementById('modalOverlay').classList.add('show');
    popup.classList.add('show');
}

function hidePopup(popup) {
    document.getElementById('modalOverlay').classList.remove('show');
    popup.classList.remove('show');
}

function showNotification(message) {
    elements.notificationText.textContent = message;
    showPopup(elements.notificationModal);
}

// --- Админ-панель: Загрузка промо-акций для управления ---
async function loadAdminPromotions() {
    try {
        console.log('Загружаем акции для админ-панели...');
        
        elements.adminPromotionsList.innerHTML = '<div class="loading">Загружаем акции...</div>';
        
        // Загружаем все акции из localStorage
        const storedPromotions = localStorage.getItem('cvetosha_promotions');
        if (storedPromotions) {
            promotions = JSON.parse(storedPromotions);
        } else {
            promotions = [];
        }
        
        // Для админа показываем все акции
        promotions = promotions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log(`Загружено ${promotions.length} акций для админа`);
        renderAdminPromotions();
        
    } catch (err) {
        console.error('Ошибка загрузки акций для админа:', err);
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

// --- Админ-панель: Рендер списка акций для управления ---
function renderAdminPromotions() {
    if (promotions.length === 0) {
        elements.adminPromotionsList.innerHTML = '<div class="loading">Акций пока нет</div>';
        return;
    }
    
    elements.adminPromotionsList.innerHTML = promotions.map(promo => `
        <div class="admin-promo-card ${!promo.image ? 'no-image' : ''}">
            ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="admin-promo-image" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');" />` : ''}
            <div class="admin-promo-header">
                <div class="admin-promo-title">${promo.title}</div>
                <div class="admin-promo-actions">
                    <button class="admin-promo-btn edit" onclick="editPromotion(${promo.id})">Изменить</button>
                    <button class="admin-promo-btn delete" onclick="deletePromotion(${promo.id})">Удалить</button>
                </div>
            </div>
            <div class="admin-promo-description">${promo.description}</div>
            <div class="admin-promo-date">До: ${new Date(promo.date).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

// --- Админ-панель: Редактирование акции ---
function editPromotion(promoId) {
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) {
        showNotification('Акция не найдена');
        return;
    }
    
    elements.promoTitle.value = promo.title;
    elements.promoDescription.value = promo.description;
    elements.promoEndDate.value = promo.date;
    
    if (promo.image) {
        elements.imagePreview.innerHTML = `<img src="${promo.image}" alt="Preview">`;
        elements.imagePreview.classList.add('has-image');
    }
    
    switchPage('admin-page');
    showNotification('Заполните форму и нажмите "Опубликовать акцию" для сохранения изменений');
}

// --- Админ-панель: Удаление акции ---
async function deletePromotion(promoId) {
    if (confirm('Вы уверены, что хотите удалить эту акцию?')) {
        promotions = promotions.filter(p => p.id !== promoId);
        savePromotions();
        renderAdminPromotions();
        renderPromotions();
        showNotification('Акция удалена');
    }
}

// --- Админ-панель: Обработка загрузки изображения ---
function setupImagePreview() {
    elements.promoImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                elements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                elements.imagePreview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- Админ-панель: Обработка формы создания акции ---
async function handlePromoFormSubmit(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('У вас нет прав для создания акций');
        return;
    }
    
    const formData = new FormData(e.target);
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    const endDate = formData.get('endDate');
    const imageFile = formData.get('image');
    
    if (!title || !description || !endDate) {
        showNotification('Пожалуйста, заполните обязательные поля (название, описание, дата окончания)');
        return;
    }
    
    try {
        let imageUrl = '';
        if (imageFile && imageFile.size > 0) {
            imageUrl = URL.createObjectURL(imageFile);
        }
        
        const newPromotion = {
            id: Date.now(),
            title: title,
            description: description,
            image: imageUrl,
            date: endDate,
            createdAt: new Date().toISOString()
        };
        
        promotions.unshift(newPromotion);
        savePromotions();
        
        console.log('Новая акция добавлена:', newPromotion);
        
        renderPromotions();
        renderAdminPromotions();
        
        e.target.reset();
        elements.imagePreview.innerHTML = '<span class="upload-text">Выберите изображение (необязательно)</span>';
        elements.imagePreview.classList.remove('has-image');
        
        showNotification('Акция успешно создана!');
        
    } catch (error) {
        console.error('Ошибка создания акции:', error);
        showNotification('Ошибка создания акции. Попробуйте еще раз.');
    }
}

// --- Настройка событий ---
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Проверяем наличие элементов перед добавлением обработчиков
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
    
    const cancelEventBtn = document.getElementById('cancelEvent');
    const addEventBtn = document.getElementById('addEvent');
    const okNotificationBtn = document.getElementById('okNotification');
    
    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', () => {
            hidePopup(elements.eventModal);
        });
    }
    
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            addEvent();
        });
    }
    
    if (okNotificationBtn) {
        okNotificationBtn.addEventListener('click', () => {
            hidePopup(elements.notificationModal);
        });
    }
    
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveDates);
    }
    
    if (elements.eventModal) {
        elements.eventModal.addEventListener('click', (e) => {
            if (e.target === elements.eventModal) hidePopup(elements.eventModal);
        });
    }
    
    if (elements.notificationModal) {
        elements.notificationModal.addEventListener('click', (e) => {
            if (e.target === elements.notificationModal) hidePopup(elements.notificationModal);
        });
    }
    
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            hidePopup(elements.eventModal);
            hidePopup(elements.notificationModal);
        });
    }
    
    if (elements.eventName) {
        elements.eventName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addEvent();
        });
    }
    
    setupImagePreview();
    if (elements.promoForm) {
        elements.promoForm.addEventListener('submit', handlePromoFormSubmit);
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
            'promotions-feed', 'orders-list',
            'currentMonth', 'calendarDays', 'prevMonth', 'nextMonth',
            'statusInfo', 'savedDatesSection', 'datesList', 'saveBtn'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Отсутствуют элементы:', missingElements);
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