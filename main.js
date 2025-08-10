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
    notificationText: document.getElementById('notificationText'),
    
    // Модальные окна
    modalOverlay: document.getElementById('modalOverlay'),
    cancelEvent: document.getElementById('cancelEvent'),
    addEvent: document.getElementById('addEvent'),
    okNotification: document.getElementById('okNotification')
};

// --- Функции для работы с попапами ---
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = elements.modalOverlay;
    
    if (modal && overlay) {
        overlay.classList.add('show');
        modal.classList.add('show');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = elements.modalOverlay;
    
    if (modal && overlay) {
        overlay.classList.remove('show');
        modal.classList.remove('show');
    }
}

function showNotification(message, type = 'info') {
    if (elements.notificationText) {
        elements.notificationText.textContent = message;
        
        // Добавляем иконку в зависимости от типа уведомления
        const notificationTitle = elements.notificationModal.querySelector('h3');
        if (notificationTitle) {
            switch (type) {
                case 'success':
                    notificationTitle.innerHTML = '✅ Успешно';
                    break;
                case 'error':
                    notificationTitle.innerHTML = '❌ Ошибка';
                    break;
                case 'warning':
                    notificationTitle.innerHTML = '⚠️ Внимание';
                    break;
                default:
                    notificationTitle.innerHTML = 'ℹ️ Уведомление';
            }
        }
        
        showModal('notificationModal');
    }
}

function showConfirm(message, onConfirm, onCancel) {
    // Создаем временное модальное окно для подтверждения
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <h3>Подтверждение</h3>
            <p>${message}</p>
            <div class="modal-buttons">
                <button class="btn btn-secondary" id="cancelConfirm">Отмена</button>
                <button class="btn btn-primary" id="confirmAction">Подтвердить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Показываем модальное окно
    elements.modalOverlay.classList.add('show');
    confirmModal.classList.add('show');
    
    // Обработчики событий
    const cancelBtn = confirmModal.querySelector('#cancelConfirm');
    const confirmBtn = confirmModal.querySelector('#confirmAction');
    
    const cleanup = () => {
        elements.modalOverlay.classList.remove('show');
        confirmModal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(confirmModal);
        }, 300);
    };
    
    cancelBtn.addEventListener('click', () => {
        cleanup();
        if (onCancel) onCancel();
    });
    
    confirmBtn.addEventListener('click', () => {
        cleanup();
        if (onConfirm) onConfirm();
    });
    
    // Закрытие по клику на оверлей
    elements.modalOverlay.addEventListener('click', cleanup);
}

function showPrompt(message, placeholder = '', onConfirm, onCancel) {
    // Создаем временное модальное окно для ввода
    const promptModal = document.createElement('div');
    promptModal.className = 'modal';
    promptModal.innerHTML = `
        <div class="modal-content">
            <h3>Ввод данных</h3>
            <p>${message}</p>
            <input type="text" id="promptInput" placeholder="${placeholder}" class="event-input" />
            <div class="modal-buttons">
                <button class="btn btn-secondary" id="cancelPrompt">Отмена</button>
                <button class="btn btn-primary" id="confirmPrompt">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(promptModal);
    
    // Показываем модальное окно
    elements.modalOverlay.classList.add('show');
    promptModal.classList.add('show');
    
    // Фокус на поле ввода
    setTimeout(() => {
        const input = promptModal.querySelector('#promptInput');
        if (input) input.focus();
    }, 100);
    
    // Обработчики событий
    const cancelBtn = promptModal.querySelector('#cancelPrompt');
    const confirmBtn = promptModal.querySelector('#confirmPrompt');
    const input = promptModal.querySelector('#promptInput');
    
    const cleanup = () => {
        elements.modalOverlay.classList.remove('show');
        promptModal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(promptModal);
        }, 300);
    };
    
    const handleConfirm = () => {
        const value = input ? input.value.trim() : '';
        cleanup();
        if (onConfirm) onConfirm(value);
    };
    
    cancelBtn.addEventListener('click', () => {
        cleanup();
        if (onCancel) onCancel();
    });
    
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Enter для подтверждения
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    });
    
    // Закрытие по клику на оверлей
    elements.modalOverlay.addEventListener('click', cleanup);
}

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
        console.log(`Запрос переменных для клиента ${clientId} с API ключом ${API_KEY}`);
        
        // Используем правильный endpoint для получения переменных клиента
        const response = await fetch(
            `https://chatter.salebot.pro/api/${API_KEY}/get_variables?client_id=${clientId}`
        );
        
        console.log('HTTP статус ответа:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка HTTP:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Сырой ответ от API:', result);
        return result;
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

// --- Получение списка заказов клиента ---
async function getClientOrders(clientId, orderStatus = 0) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        console.log(`Запрос заказов для клиента ${clientId} со статусом ${orderStatus}`);

        // Если orderStatus = null, делаем запрос без фильтра по статусу
        const url = orderStatus === null 
            ? `https://chatter.salebot.pro/api/${API_KEY}/get_orders?client_id=${clientId}`
            : `https://chatter.salebot.pro/api/${API_KEY}/get_orders?client_id=${clientId}&order_status=${orderStatus}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка получения заказов: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();
        console.log('Ответ API get_orders:', result);
        console.log('Полный ответ API get_orders:', JSON.stringify(result, null, 2));
        console.log('Тип result.result:', typeof result.result);
        console.log('result.result является массивом?', Array.isArray(result.result));
        console.log('Длина result.result:', result.result ? result.result.length : 'undefined');

        // API возвращает массив ID заказов, а не сами заказы
        if (result.status === 'success' && result.result && Array.isArray(result.result)) {
            console.log(`Найдено ${result.result.length} заказов для статуса ${orderStatus}`);
            // Преобразуем ID заказов в объекты заказов
            const mappedOrders = result.result.map(orderId => ({
                order_id: orderId,
                client_id: clientId,
                order_status: orderStatus || 'unknown', // если статус не указан, помечаем как unknown
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
            console.log('Преобразованные заказы:', mappedOrders);
            return mappedOrders;
        }

        console.log(`Заказы для статуса ${orderStatus} не найдены или API вернул ошибку`);
        return [];
    } catch (error) {
        console.error('Ошибка получения заказов клиента:', error);
        throw error;
    }
}

// --- Получение полных данных заказа ---
async function getOrderDetails(clientId, orderId) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        console.log(`Запрос полных данных для заказа ${orderId} клиента ${clientId}`);

        // Получаем переменные заказа
        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_order_vars`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                order_id: orderId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка получения данных заказа: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();
        console.log(`Данные заказа ${orderId}:`, result);
        console.log(`Полный ответ API для заказа ${orderId}:`, JSON.stringify(result, null, 2));
        console.log(`Тип result:`, typeof result);
        console.log(`Ключи в result:`, Object.keys(result));
        console.log(`result.variables:`, result.variables);
        console.log(`Тип result.variables:`, typeof result.variables);
        if (result.variables) {
            console.log(`Ключи в result.variables:`, Object.keys(result.variables));
        }

        // Возвращаем обогащенные данные заказа
        return {
            order_id: orderId,
            client_id: clientId,
            variables: result.result,
            // Извлекаем нужные поля из result.result
            order_date: result.result['Дата доставки'] || null,
            delivery_address: result.result['Адрес доставки'] || null,
            payment_method: result.result['Способ оплаты'] || null,
            delivery_method: result.result['Способ получения'] || null,
            order_total: result.result['budget'] || null, // бюджет заказа
            order_sum: result.result['budget'] || null, // сумма заказа (то же что и budget)
            order_items: result.result['№ букета'] || result.result['order_name'] || null, // номер букета или название заказа
            order_currency: '₽', // валюта по умолчанию
            order_payment_status: null, // статус оплаты не указан в API
            order_delivery_status: null, // статус доставки не указан в API
            customer_notes: result.result['Оценка'] || result.result['Телефон получателя'] || null, // оценка или телефон
            order_status_name: null // название статуса заказа
        };
    } catch (error) {
        console.error(`Ошибка получения данных заказа ${orderId}:`, error);
        throw error;
    }
}

// --- Получение переменных заказа (оставляем для обратной совместимости) ---
async function getOrderVariables(clientId, orderId, variables = []) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        console.log(`Запрос переменных для заказа ${orderId} клиента ${clientId}`);

        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_order_vars`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                order_id: orderId
            })
        });
        console.log('Ответ API get_order_vars:', response);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка получения переменных заказа: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();
        console.log('Ответ API get_order_vars:', result);

        return result;
    } catch (error) {
        console.error('Ошибка получения переменных заказа:', error);
        throw error;
    }
}



// --- Получение всех заказов с переменными ---
async function getAllOrdersWithVariables(clientId) {
    try {
        console.log('Загрузка всех заказов клиента с переменными...');
        
        const allOrders = [];
        
        // Получаем заказы по всем статусам
        const statuses = [0, 1, 2]; // активные, успешные, отмененные
        console.log(`Будем искать заказы для статусов:`, statuses);
        
        // Сначала попробуем получить все заказы без фильтра по статусу
        try {
            console.log(`\n=== Пробуем получить все заказы без фильтра ===`);
            const allOrdersUnfiltered = await getClientOrders(clientId, null);
            console.log(`Все заказы без фильтра:`, allOrdersUnfiltered);
            console.log(`Количество заказов без фильтра:`, allOrdersUnfiltered.length);
            
            if (allOrdersUnfiltered.length > 0) {
                console.log(`Найдены заказы без фильтра, обрабатываем их...`);
                for (const order of allOrdersUnfiltered) {
                    try {
                        console.log(`Загружаем данные для заказа ${order.order_id}...`);
                        
                        // Получаем полные данные заказа
                        const orderDetails = await getOrderDetails(clientId, order.order_id);
                        
                        // Объединяем данные заказа с полученными деталями
                        const enrichedOrder = {
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: orderDetails.order_date || order.created_at,
                            total: orderDetails.order_total || 0, // бюджет заказа
                            items: orderDetails.order_items || 'Детали заказа не указаны',
                            delivery_address: orderDetails.delivery_address || 'Адрес не указан',
                            payment_method: orderDetails.payment_method || 'Не указан',
                            delivery_method: orderDetails.delivery_method || 'Не указан',
                            customer_notes: orderDetails.customer_notes || '',
                            currency: orderDetails.order_currency || '₽',
                            payment_status: orderDetails.order_payment_status || '',
                            delivery_status: orderDetails.order_delivery_status || '',
                            variables: orderDetails.variables || {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        };
                        
                        console.log(`Обогащенный заказ ${order.order_id}:`, enrichedOrder);
                        allOrders.push(enrichedOrder);
                        
                    } catch (orderError) {
                        console.warn(`Ошибка получения данных для заказа ${order.order_id}:`, orderError);
                        // Добавляем заказ без переменных
                        allOrders.push({
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: order.created_at,
                            total: 0,
                            items: 'Детали заказа не загружены',
                            delivery_address: 'Не указан',
                            payment_method: 'Не указан',
                            customer_notes: '',
                            currency: '₽',
                            payment_status: '',
                            delivery_status: '',
                            variables: {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        });
                    }
                }
            }
        } catch (unfilteredError) {
            console.warn(`Ошибка получения заказов без фильтра:`, unfilteredError);
        }
        
        // Попробуем получить заказы по всем статусам одновременно
        try {
            console.log(`\n=== Пробуем получить заказы по всем статусам одновременно ===`);
            const allStatusesOrders = await getOrdersByAllStatuses(clientId);
            if (allStatusesOrders && allStatusesOrders.length > 0) {
                console.log(`Найдены заказы по всем статусам:`, allStatusesOrders);
                console.log(`Количество заказов по всем статусам:`, allStatusesOrders.length);
                
                for (const order of allStatusesOrders) {
                    try {
                        console.log(`Загружаем данные для заказа ${order.order_id}...`);
                        
                        // Получаем полные данные заказа
                        const orderDetails = await getOrderDetails(clientId, order.order_id);
                        
                        // Объединяем данные заказа с полученными деталями
                        const enrichedOrder = {
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: orderDetails.order_date || order.created_at,
                            total: orderDetails.order_total || 0, // бюджет заказа
                            items: orderDetails.order_items || 'Детали заказа не указаны',
                            delivery_address: orderDetails.delivery_address || 'Адрес не указан',
                            payment_method: orderDetails.payment_method || 'Не указан',
                            delivery_method: orderDetails.delivery_method || 'Не указан',
                            customer_notes: orderDetails.customer_notes || '',
                            currency: orderDetails.order_currency || '₽',
                            payment_status: orderDetails.order_payment_status || '',
                            delivery_status: orderDetails.order_delivery_status || '',
                            variables: orderDetails.variables || {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        };
                        
                        console.log(`Обогащенный заказ ${order.order_id}:`, enrichedOrder);
                        allOrders.push(enrichedOrder);
                        
                    } catch (orderError) {
                        console.warn(`Ошибка получения данных для заказа ${order.order_id}:`, orderError);
                        // Добавляем заказ без переменных
                        allOrders.push({
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: order.created_at,
                            total: 0,
                            items: 'Детали заказа не загружены',
                            delivery_address: 'Не указан',
                            payment_method: 'Не указан',
                            customer_notes: '',
                            currency: '₽',
                            payment_status: '',
                            delivery_status: '',
                            variables: {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        });
                    }
                }
            }
        } catch (allStatusesError) {
            console.warn(`Ошибка получения заказов по всем статусам:`, allStatusesError);
        }
        
        for (const status of statuses) {
            try {
                console.log(`\n=== Обрабатываем статус ${status} ===`);
                const orders = await getClientOrders(clientId, status);
                console.log(`Заказы со статусом ${status}:`, orders);
                console.log(`Количество заказов со статусом ${status}:`, orders.length);
                
                if (orders.length === 0) {
                    console.log(`Заказов со статусом ${status} не найдено`);
                    continue;
                }
                
                // Для каждого заказа получаем полные данные
                for (const order of orders) {
                    try {
                        console.log(`Загружаем данные для заказа ${order.order_id}...`);
                        
                        // Получаем полные данные заказа
                        const orderDetails = await getOrderDetails(clientId, order.order_id);
                        
                        // Объединяем данные заказа с полученными деталями
                        const enrichedOrder = {
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: orderDetails.order_date || order.created_at,
                            total: orderDetails.order_total || 0, // бюджет заказа
                            items: orderDetails.order_items || 'Детали заказа не указаны',
                            delivery_address: orderDetails.delivery_address || 'Адрес не указан',
                            payment_method: orderDetails.payment_method || 'Не указан',
                            delivery_method: orderDetails.delivery_method || 'Не указан',
                            customer_notes: orderDetails.customer_notes || '',
                            currency: orderDetails.order_currency || '₽',
                            payment_status: orderDetails.order_payment_status || '',
                            delivery_status: orderDetails.order_delivery_status || '',
                            variables: orderDetails.variables || {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        };
                        
                        console.log(`Обогащенный заказ ${order.order_id}:`, enrichedOrder);
                        allOrders.push(enrichedOrder);
                        
                    } catch (orderError) {
                        console.warn(`Ошибка получения данных для заказа ${order.order_id}:`, orderError);
                        // Добавляем заказ без переменных
                        allOrders.push({
                            id: order.order_id,
                            client_id: order.client_id,
                            status: order.order_status,
                            status_name: getStatusName(order.order_status),
                            date: order.created_at,
                            total: 0,
                            items: 'Детали заказа не загружены',
                            delivery_address: 'Не указан',
                            payment_method: 'Не указан',
                            customer_notes: '',
                            currency: '₽',
                            payment_status: '',
                            delivery_status: '',
                            variables: {},
                            created_at: order.created_at,
                            updated_at: order.updated_at
                        });
                    }
                }
                
            } catch (statusError) {
                console.warn(`Ошибка получения заказов со статусом ${status}:`, statusError);
            }
        }
        
        // Сортируем по дате создания (новые сначала)
        allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log(`\n=== ИТОГО ===`);
        console.log(`Всего обработано заказов: ${allOrders.length}`);
        console.log('Все заказы с переменными:', allOrders);
        return allOrders;
        
    } catch (error) {
        console.error('Ошибка получения всех заказов с переменными:', error);
        throw error;
    }
}

// --- Вспомогательная функция для названий статусов ---
function getStatusName(status) {
    const statusNames = {
        0: 'Активный',
        1: 'Успешный', 
        2: 'Отмененный'
    };
    return statusNames[status] || 'Активная сделка';
}

// --- Вспомогательная функция для CSS классов статусов ---
function getStatusClass(status) {
    const statusClasses = {
        0: 'active',
        1: 'success', 
        2: 'failed'
    };
    return statusClasses[status] || 'active';
}

// --- Вспомогательная функция для иконок статусов ---
function getStatusIcon(status) {
    const statusIcons = {
        0: '🔄',
        1: '✅', 
        2: '❌'
    };
    return statusIcons[status] || '🔄';
}

// --- Функция просмотра деталей заказа ---
function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showNotification('Заказ не найден', 'error');
        return;
    }
    
    const orderDate = new Date(order.date || order.created_at);
    const formattedDate = orderDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
            year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const formattedTotal = typeof order.total === 'number' && order.total > 0
        ? `${order.total}₽` 
        : (order.total || 'Не указана');
    
    const statusIcon = getStatusIcon(order.status);
    const statusName = order.status_name || getStatusName(order.status);
    
    // Создаем детальное модальное окно
    const modalHtml = `
        <div class="modal order-details-modal" id="orderDetailsModal">
            <div class="modal-content">
                <h3>${statusIcon} Детали заказа #${order.id}</h3>
                
                <div class="order-details-content">
                    <div class="detail-section">
                        <h4>📋 Основная информация</h4>
                        <div class="detail-row">
                            <span class="detail-label">Статус:</span>
                            <span class="detail-value status-${getStatusClass(order.status)}">${statusName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Дата создания:</span>
                            <span class="detail-value">${formattedDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Сумма:</span>
                            <span class="detail-value">${formattedTotal} ${order.currency || '₽'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>🛍️ Детали заказа</h4>
                        <div class="detail-row">
                            <span class="detail-label">Товары/услуги:</span>
                            <span class="detail-value">${order.items || 'Не указаны'}</span>
                        </div>
                    </div>
                    
                    ${order.delivery_address && order.delivery_address !== 'Адрес не указан' ? `
                        <div class="detail-section">
                            <h4>📍 Доставка</h4>
                            <div class="detail-row">
                                <span class="detail-label">Адрес:</span>
                                <span class="detail-value">${order.delivery_address}</span>
                            </div>
                            ${order.delivery_method && order.delivery_method !== 'Не указан' ? `
                            <div class="detail-row">
                                <span class="detail-label">Способ получения:</span>
                                <span class="detail-value">${order.delivery_method}</span>
                            </div>
                            ` : ''}
                            ${order.date && order.date !== order.created_at ? `
                            <div class="detail-row">
                                <span class="detail-label">Дата доставки:</span>
                                <span class="detail-value">${order.date}</span>
                            </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${order.payment_method && order.payment_method !== 'Не указан' ? `
                        <div class="detail-section">
                            <h4>💳 Оплата</h4>
                            <div class="detail-row">
                                <span class="detail-label">Способ:</span>
                                <span class="detail-value">${order.payment_method}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${order.customer_notes ? `
                        <div class="detail-section">
                            <h4>📝 Примечания</h4>
                            <div class="detail-row">
                                <span class="detail-label">Комментарий:</span>
                                <span class="detail-value">${order.customer_notes}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${Object.keys(order.variables).length > 0 ? `
                        <div class="detail-section">
                            <h4>🔧 Дополнительные переменные</h4>
                            ${Object.entries(order.variables).map(([key, value]) => `
                                <div class="detail-row">
                                    <span class="detail-label">${key}:</span>
                                    <span class="detail-value">${value || 'Не указано'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-buttons">
                    <button class="btn btn-primary" onclick="hideModal('orderDetailsModal')">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем модальное окно в DOM
    if (!document.getElementById('orderDetailsModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Показываем модальное окно
    showModal('orderDetailsModal');
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

        // Извлекаем данные клиента напрямую из ответа API
        if (data && typeof data === 'object') {
            // Пытаемся получить аватар и имя из различных возможных полей
            let avatarUrl = data.avatar || data.client_avatar || data['client.avatar'] || '';
            let name = data.full_name || data.client_full_name || data['client.full_name'] || '';
            
            // Проверяем, что аватар - это валидная ссылка
            if (avatarUrl && typeof avatarUrl === 'string') {
                // Убираем лишние пробелы и проверяем, что это URL
                avatarUrl = avatarUrl.trim();
                if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
                    clientAvatar = avatarUrl;
                    console.log('Аватар найден (URL):', clientAvatar);
                } else {
                    console.warn('Аватар не является валидным URL:', avatarUrl);
                    clientAvatar = '';
                }
            } else {
                clientAvatar = '';
                console.log('Аватар не найден в ответе API');
            }
            
            // Проверяем имя пользователя
            if (name && typeof name === 'string' && name.trim() !== '') {
                clientFullName = name.trim();
                console.log('Имя пользователя найдено:', clientFullName);
            } else {
                clientFullName = '';
                console.log('Имя пользователя не найдено в ответе API');
            }
            
            // Проверяем различные возможные форматы ответа от Salebot
            if (data.success || data.variables || data.data) {
                // Определяем, где находятся переменные
                let variables = null;
                if (data.variables) {
                    variables = data.variables;
                } else if (data.data && data.data.variables) {
                    variables = data.data.variables;
                } else if (data.data && typeof data.data === 'object') {
                    variables = data.data;
                } else if (typeof data === 'object' && !data.success && !data.variables) {
                    // Если data - это объект с переменными напрямую
                    variables = data;
                }
                
                if (variables && typeof variables === 'object') {
                    userVariables = variables;
                    console.log('Переменные успешно загружены:', userVariables);
                    
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
                    
                    // Дополнительно пытаемся получить данные клиента из переменных
                    if (!clientFullName) {
                        clientFullName = userVariables['client.full_name'] || userVariables['full_name'] || '';
                    }
                    if (!clientAvatar) {
                        clientAvatar = userVariables['client.avatar'] || userVariables['avatar'] || '';
                    }
                    
                    console.log('Данные клиента загружены:', { clientFullName, clientAvatar });
                    console.log('Все переменные Salebot:', userVariables);
                } else {
                    console.warn('Не удалось извлечь переменные из ответа Salebot');
                    console.log('Структура ответа:', data);
                    
                    // Инициализируем пустые переменные по умолчанию
                    userVariables = {};
                    savedDates = [];
                    lastSavedYear = null;
                }
            } else {
                console.warn('Не удалось получить переменные от Salebot');
                console.log('Ответ API:', data);
                
                // Инициализируем пустые переменные по умолчанию
                userVariables = {};
                savedDates = [];
                lastSavedYear = null;
            }
        } else {
            console.warn('Не удалось получить данные от Salebot');
            console.log('Ответ API:', data);
            
            // Инициализируем пустые переменные по умолчанию
            userVariables = {};
            savedDates = [];
            lastSavedYear = null;
            clientFullName = '';
            clientAvatar = '';
        }
        
        // Обновляем информацию о пользователе
        updateUserInfo();
        
        // Финальная проверка загруженных данных
        console.log('Финальные данные пользователя:', {
            clientFullName,
            clientAvatar,
            savedDates: savedDates.length,
            lastSavedYear,
            userVariablesKeys: Object.keys(userVariables || {})
        });
        
        // Дополнительная проверка аватара
        if (clientAvatar) {
            console.log('✅ Аватар готов к отображению:', clientAvatar);
            console.log('Тип аватара:', typeof clientAvatar);
            console.log('Длина URL аватара:', clientAvatar.length);
            console.log('Аватар начинается с http:', clientAvatar.startsWith('http'));
            console.log('Аватар начинается с https:', clientAvatar.startsWith('https'));
            
            // Проверяем, что URL валидный
            try {
                new URL(clientAvatar);
                console.log('✅ URL аватара валидный');
            } catch (e) {
                console.error('❌ URL аватара невалидный:', e.message);
            }
        } else {
            console.log('⚠️ Аватар не найден, будет использован placeholder');
            console.log('Проверяем все переменные Salebot на наличие аватара...');
            
            // Ищем аватар во всех переменных
            if (userVariables) {
                const avatarKeys = Object.keys(userVariables).filter(key => 
                    key.toLowerCase().includes('avatar') || 
                    key.toLowerCase().includes('photo') ||
                    key.toLowerCase().includes('image')
                );
                console.log('Ключи, содержащие аватар/фото:', avatarKeys);
                
                avatarKeys.forEach(key => {
                    console.log(`Переменная ${key}:`, userVariables[key]);
                });
            }
        }
        
    } catch (err) {
        console.error('Ошибка загрузки данных пользователя:', err);
        console.log('Используем дефолтные данные из-за ошибки');
        updateUserInfo();
    }
    
    // Дополнительная проверка прав администратора после загрузки всех данных
    setTimeout(() => {
        checkAdminRights();
    }, 100);
}

// --- Проверка прав администратора ---
function checkAdminRights() {
    console.log('=== ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА ===');
    
    // Сначала пытаемся получить ID из Telegram WebApp
    let userId = null;
    if (tg.initDataUnsafe?.user) {
        userId = tg.initDataUnsafe.user.id;
        console.log('ID пользователя из Telegram WebApp:', userId);
    }
    
    // Если нет ID из Telegram, используем CLIENT_ID из URL
    if (!userId && CLIENT_ID) {
        userId = parseInt(CLIENT_ID);
        console.log('ID пользователя из URL параметров:', userId);
    }
    
    if (userId) {
        currentUserId = userId;
        console.log('Текущий ID пользователя:', currentUserId);
        
        // Получаем ID администраторов из переменных Salebot или используем дефолтные
        let adminIds = [1545106315, 749140859]; // Добавляем ваш ID в дефолтные
        
        if (userVariables && userVariables['admin_ids']) {
            try {
                const parsedAdminIds = JSON.parse(userVariables['admin_ids']);
                if (Array.isArray(parsedAdminIds)) {
                    adminIds = parsedAdminIds;
                    console.log('ID администраторов загружены из Salebot:', adminIds);
                } else {
                    console.warn('admin_ids не является массивом:', parsedAdminIds);
                }
            } catch (error) {
                console.error('Ошибка парсинга admin_ids:', error);
                console.log('Используем дефолтные ID администраторов');
            }
        } else {
            console.log('admin_ids не найдены в userVariables, используем дефолтные');
        }
        
        console.log('Все ID администраторов:', adminIds);
        console.log('Проверяем, является ли', userId, 'администратором...');
        
        isAdmin = adminIds.includes(userId);
        console.log('Результат проверки прав:', isAdmin ? 'АДМИНИСТРАТОР' : 'ОБЫЧНЫЙ ПОЛЬЗОВАТЕЛЬ');
        
        // Показываем/скрываем кнопку администратора
        const adminBtn = document.querySelector('.admin-only');
        if (adminBtn) {
            if (isAdmin) {
                adminBtn.style.display = 'flex';
                adminBtn.style.visibility = 'visible';
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.style.display = 'none';
                adminBtn.style.visibility = 'hidden';
                adminBtn.classList.add('hidden');
            }
            console.log('Кнопка администратора:', isAdmin ? 'ПОКАЗАНА' : 'СКРЫТА');
        } else {
            console.warn('Кнопка администратора не найдена в DOM');
        }
        
        // Показываем/скрываем страницу администратора
        const adminPage = document.getElementById('admin-page');
        if (adminPage) {
            if (isAdmin) {
                adminPage.style.display = 'block';
                adminPage.style.visibility = 'visible';
            } else {
                adminPage.style.display = 'none';
                adminPage.style.visibility = 'hidden';
            }
            console.log('Страница администратора:', isAdmin ? 'ДОСТУПНА' : 'СКРЫТА');
        }
        
    } else {
        console.warn('ID пользователя не найден, права администратора не проверены');
        isAdmin = false;
        currentUserId = null;
    }
    
    console.log('=== КОНЕЦ ПРОВЕРКИ ПРАВ ===');
}

// --- Обновление информации о пользователе ---
function updateUserInfo() {
    console.log('Обновление информации о пользователе:', { clientFullName, clientAvatar, CLIENT_ID });
    
    if (elements.userAvatar) {
        const avatarSrc = clientAvatar || 'https://via.placeholder.com/40x40/cccccc/666666?text=👤';
        elements.userAvatar.src = avatarSrc;
        elements.userAvatar.alt = clientFullName || 'Пользователь';
        console.log('Аватар обновлен:', avatarSrc);
        
        // Добавляем обработчики для аватара
        elements.userAvatar.onload = function() {
            console.log('✅ Аватар успешно загружен:', avatarSrc);
        };
        
        elements.userAvatar.onerror = function() {
            console.warn('❌ Ошибка загрузки аватара:', avatarSrc);
            // При ошибке загрузки используем placeholder
            this.src = 'https://via.placeholder.com/40x40/cccccc/666666?text=👤';
            this.alt = 'Ошибка загрузки аватара';
        };
    }
    
    if (elements.userName) {
        const userName = clientFullName || (CLIENT_ID ? `Пользователь ${CLIENT_ID}` : 'Гость');
        elements.userName.textContent = userName;
        console.log('Имя пользователя обновлено:', userName);
    }
    
    if (elements.userId) {
        const userId = CLIENT_ID ? `ID: ${CLIENT_ID}` : '';
        elements.userId.textContent = userId;
        console.log('ID пользователя обновлен:', userId);
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
    
    // Дополнительная проверка видимости кнопки администратора
    const adminBtn = document.querySelector('.admin-only');
    if (adminBtn && !isAdmin) {
        adminBtn.style.display = 'none';
        adminBtn.style.visibility = 'hidden';
        adminBtn.style.opacity = '0';
        adminBtn.style.pointerEvents = 'none';
        adminBtn.classList.add('hidden');
    }
}

// --- Переключение страниц ---
function switchPage(pageId) {
    if (pageId === 'admin-page' && !isAdmin) {
        showNotification('У вас нет доступа к панели администратора', 'warning');
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
    
    // Обновляем видимость кнопки администратора при каждом переключении страницы
    checkAdminRights();
    
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

// --- Загрузка истории заказов ---
async function loadOrders() {
    try {
        if (!elements.ordersList) return;
        
        elements.ordersList.innerHTML = `
            <div class="loading">
                <div class="loading-spinner">⏳</div>
                <div class="loading-text">Загружаем историю заказов...</div>
                <div class="loading-subtext">Это может занять несколько секунд</div>
            </div>
        `;
        
        if (!CLIENT_ID || !API_KEY) {
            elements.ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">
                        <strong>История заказов недоступна</strong><br>
                        Для просмотра заказов необходимо авторизоваться с API ключом
                    </div>
                </div>
            `;
            return;
        }
        
        console.log('Загрузка заказов для клиента:', CLIENT_ID);
        
        // Получаем все заказы с переменными через Salebot API
        orders = await getAllOrdersWithVariables(CLIENT_ID);
        
        console.log('Загруженные заказы:', orders);
        console.log('Количество загруженных заказов:', orders.length);
        
        // Обновляем UI
        renderOrders();
        
    } catch (err) {
        console.error('Ошибка загрузки заказов:', err);
        if (elements.ordersList) {
            elements.ordersList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Ошибка загрузки заказов</strong><br>
                        ${err.message || 'Не удалось получить данные. Попробуйте позже.'}
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
    
    console.log(`renderOrders: получено ${orders.length} заказов для отображения`);
    console.log('Заказы для рендера:', orders);
    
    if (orders.length === 0) {
        console.log('renderOrders: заказов нет, показываем пустое состояние');
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
        const orderDate = new Date(order.date || order.created_at);
        const formattedDate = orderDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const formattedTotal = typeof order.total === 'number' && order.total > 0
            ? `${order.total}₽` 
            : (order.total || 'Не указана');
        
        const statusClass = getStatusClass(order.status);
        const statusIcon = getStatusIcon(order.status);
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-number">Заказ #${order.id}</span>
                    <span class="order-status ${statusClass}">
                        ${statusIcon} ${order.status_name || getStatusName(order.status)}
                    </span>
                </div>
                <div class="order-details">
                    ${order.items && order.items !== 'Детали заказа не указаны' ? `
                        <div class="order-items">${order.items}</div>` : ''}
                    ${order.delivery_address && order.delivery_address !== 'Адрес не указан' ? `
                        <div class="order-address">📍 ${order.delivery_address}</div>` : ''}
                    ${order.delivery_method && order.delivery_method !== 'Не указан' ? `
                        <div class="order-delivery-method">🚚 ${order.delivery_method}</div>` : ''}
                    ${order.payment_method && order.payment_method !== 'Не указан' ? `
                        <div class="order-payment">💳 ${order.payment_method}</div>` : ''}
                    ${order.customer_notes ? `
                        <div class="order-notes">📝 ${order.customer_notes}</div>` : ''}
                </div>
                <div class="order-info">
                    <div class="order-date">📅 ${formattedDate}</div>
                    <div class="order-total">💰 ${formattedTotal} ${order.currency || '₽'}</div>
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
    
    // Показываем модальное окно для ввода названия события
    if (elements.selectedDateText) {
        elements.selectedDateText.textContent = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    if (elements.eventName) {
        elements.eventName.value = '';
        elements.eventName.focus();
    }
    
    showModal('eventModal');
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
    const dateToRemove = savedDates[index];
    showConfirm(`Вы уверены, что хотите удалить событие "${dateToRemove.name}"?`, () => {
        savedDates.splice(index, 1);
        renderCalendar();
        renderSavedDates();
        updateStatusInfo();
        updateSaveButton();
        showNotification('Дата удалена', 'success');
    }, () => {
        // Отмена удаления
    });
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
            showNotification('Для сохранения дат необходимо авторизоваться');
            return;
        }
        
        if (savedDates.length === 0) {
            showNotification('Нет дат для сохранения');
            return;
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
        
        showNotification(resultMessage, 'success');
        
    } catch (error) {
        if (elements.saveBtn) {
            elements.saveBtn.disabled = false;
            const btnText = elements.saveBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Сохранить даты';
        }
        showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`, 'error');
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
    showNotification('Функция редактирования в разработке', 'info');
}

// --- Удаление акции ---
async function deletePromotion(promoId) {
    showConfirm('Вы уверены, что хотите удалить эту акцию?', async () => {
        try {
            promotions = promotions.filter(p => p.id !== promoId);
            await savePromotions();
            
            renderPromotions();
            renderAdminPromotions();
            
                    showNotification('Акция удалена', 'success');
    } catch (error) {
        console.error('Ошибка удаления акции:', error);
        showNotification('Ошибка удаления акции', 'error');
    }
    }, () => {
        // Отмена удаления
    });
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
    
    // Обработчики модальных окон
    if (elements.cancelEvent) {
        elements.cancelEvent.addEventListener('click', () => {
            hideModal('eventModal');
        });
    }
    
    if (elements.addEvent) {
        elements.addEvent.addEventListener('click', () => {
            const eventName = elements.eventName.value.trim();
            if (eventName) {
                if (selectedDate) {
                    const dateString = selectedDate.toISOString().split('T')[0];
                    const existingIndex = savedDates.findIndex(date => date.date === dateString);
                    
                    if (existingIndex !== -1) {
                        savedDates[existingIndex].name = eventName;
                    } else {
                        savedDates.push({
                            date: dateString,
                            name: eventName,
                            index: savedDates.length + 1
                        });
                    }
                    
                    renderCalendar();
                    renderSavedDates();
                    updateStatusInfo();
                    updateSaveButton();
                    
                    hideModal('eventModal');
                    elements.eventName.value = '';
                    showNotification('Событие добавлено!', 'success');
                }
            }
        });
    }
    
    if (elements.okNotification) {
        elements.okNotification.addEventListener('click', () => {
            hideModal('notificationModal');
        });
    }
    
    // Закрытие модальных окон по клику на оверлей
    if (elements.modalOverlay) {
        elements.modalOverlay.addEventListener('click', () => {
            hideModal('eventModal');
            hideModal('notificationModal');
        });
    }
    
    // Закрытие модальных окон по клавише Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal('eventModal');
            hideModal('notificationModal');
        }
    });
}

// --- Глобальные функции для отладки ---
window.debugAvatar = function() {
    console.log('=== ОТЛАДКА АВАТАРА ===');
    console.log('clientAvatar:', clientAvatar);
    console.log('clientFullName:', clientFullName);
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('userVariables:', userVariables);
    
    const avatarElement = document.getElementById('user-avatar');
    if (avatarElement) {
        console.log('Элемент аватара:', avatarElement);
        console.log('Текущий src:', avatarElement.src);
        console.log('Текущий alt:', avatarElement.alt);
        
        // Пробуем установить тестовый аватар
        const testAvatar = 'https://via.placeholder.com/48x48/ff6b6b/ffffff?text=TEST';
        avatarElement.src = testAvatar;
        console.log('Установлен тестовый аватар:', testAvatar);
    } else {
        console.error('Элемент аватара не найден!');
    }
};

window.debugAdmin = function() {
    console.log('=== ОТЛАДКА АДМИНИСТРАТОРА ===');
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('currentUserId:', currentUserId);
    console.log('isAdmin:', isAdmin);
    console.log('userVariables:', userVariables);
    
    if (userVariables && userVariables['admin_ids']) {
        console.log('admin_ids из Salebot:', userVariables['admin_ids']);
        try {
            const parsed = JSON.parse(userVariables['admin_ids']);
            console.log('admin_ids распарсены:', parsed);
            console.log('Тип admin_ids:', typeof parsed);
            console.log('Является ли массивом:', Array.isArray(parsed));
        } catch (e) {
            console.error('Ошибка парсинга admin_ids:', e);
        }
    }
    
    // Проверяем элементы в DOM
    const adminBtn = document.querySelector('.admin-only');
    const adminPage = document.getElementById('admin-page');
    
    console.log('Кнопка администратора в DOM:', adminBtn);
    console.log('Страница администратора в DOM:', adminPage);
    
    if (adminBtn) {
        console.log('Стиль кнопки администратора:', adminBtn.style.display);
    }
    
    if (adminPage) {
        console.log('Стиль страницы администратора:', adminPage.style.display);
    }
    
    console.log('=== КОНЕЦ ОТЛАДКИ АДМИНИСТРАТОРА ===');
};

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
        
        // Финальная проверка прав администратора после всех инициализаций
        setTimeout(() => {
            checkAdminRights();
        }, 200);
        
        console.log('Приложение инициализировано успешно');
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
    }
}

// --- Запуск приложения ---
document.addEventListener('DOMContentLoaded', initApp); 

// --- Получение заказов по всем статусам одновременно ---
async function getOrdersByAllStatuses(clientId) {
    try {
        if (!API_KEY) {
            throw new Error('API ключ Salebot не найден в URL параметрах');
        }

        console.log('Запрос заказов по всем статусам одновременно...');

        // Попробуем получить все заказы без указания статуса
        const response = await fetch(`https://chatter.salebot.pro/api/${API_KEY}/get_orders?client_id=${clientId}&all_statuses=1`);
        
        if (!response.ok) {
            console.log(`API all_statuses не поддерживается (${response.status}), используем поочередные запросы`);
            return null;
        }

        const result = await response.json();
        console.log('Ответ API get_orders с all_statuses:', result);

        if (result.status === 'success' && result.result && Array.isArray(result.result)) {
            console.log(`Найдено ${result.result.length} заказов по всем статусам:`, result.result);
            return result.result.map(orderId => ({
                order_id: orderId,
                client_id: clientId,
                order_status: 'all', // помечаем как полученные по всем статусам
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
        }

        console.log('API не вернул заказы по всем статусам');
        return null;
    } catch (error) {
        console.warn('Ошибка получения заказов по всем статусам:', error);
        return null;
    }
} 
