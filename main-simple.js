// Упрощенная версия приложения для тестирования

console.log('Загрузка упрощенной версии приложения...');

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
    console.log('Инициализация Telegram WebApp...');
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram WebApp доступен');
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    } else {
        console.log('Telegram WebApp недоступен, используем заглушку');
    }
}

// --- Загрузка данных пользователя ---
async function loadUserData() {
    console.log('Загрузка данных пользователя...');
    
    // Простая заглушка для данных пользователя
    clientFullName = CLIENT_ID ? `Пользователь ${CLIENT_ID}` : 'Гость';
    clientAvatar = 'https://via.placeholder.com/40x40/cccccc/666666?text=👤';
    
    updateUserInfo();
}

// --- Обновление информации о пользователе ---
function updateUserInfo() {
    console.log('Обновление информации о пользователе...');
    
    if (elements.userAvatar) {
        elements.userAvatar.src = clientAvatar;
        elements.userAvatar.alt = clientFullName;
    }
    
    if (elements.userName) {
        elements.userName.textContent = clientFullName;
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
        
        // Загружаем из файла
        const response = await fetch('promotions.json');
        if (response.ok) {
            promotions = await response.json();
            console.log('Акции загружены из файла:', promotions.length);
        } else {
            console.warn('Файл promotions.json не найден');
            promotions = [];
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
    console.log('Настройка навигации...');
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Найдено кнопок навигации:', navButtons.length);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            console.log('Переключение на страницу:', targetPage);
            switchPage(targetPage);
        });
    });
}

// --- Переключение страниц ---
function switchPage(pageId) {
    console.log('Переключение на страницу:', pageId);
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.error('Страница не найдена:', pageId);
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
            console.log('Загрузка заказов...');
            break;
        case 'dates-page':
            console.log('Загрузка календаря...');
            break;
        case 'admin-page':
            console.log('Загрузка админ панели...');
            break;
    }
}

// --- Настройка событий ---
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Проверяем наличие элементов перед добавлением обработчиков
    if (elements.prevMonth) {
        elements.prevMonth.addEventListener('click', () => {
            console.log('Предыдущий месяц');
        });
    }
    
    if (elements.nextMonth) {
        elements.nextMonth.addEventListener('click', () => {
            console.log('Следующий месяц');
        });
    }
    
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', () => {
            console.log('Сохранение дат...');
            alert('Функция сохранения дат в разработке');
        });
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