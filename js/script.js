// ==========================================
// 1. ПОДГРУЗКА HTML-ЧАСТЕЙ (Твой шаблонизатор)
// ==========================================
async function loadParts() {
    const elements = document.querySelectorAll("[data-include]");
    for (const element of elements) {
        const file = element.dataset.include;
        try {
            const response = await fetch(file);
            if (response.ok) {
                element.outerHTML = await response.text();
            }
        } catch (error) {
            console.error("Ошибка загрузки части HTML:", error);
        }
    }
}

// ==========================================
// 2. ИНТЕРАКТИВНЫЙ КАТАЛОГ (Галерея и табы)
// ==========================================

// Функция рендеринга карточек на основе данных из gallery.js
function renderCatalog(categoryFilter = 'all') {
    const gridContainer = document.getElementById('catalogGrid');
    // Проверяем, есть ли контейнер на странице и подключен ли gallery.js
    if (!gridContainer || typeof gallery === 'undefined') return;

    gridContainer.innerHTML = ''; // Очищаем сетку перед новым выводом

    let itemsToRender = [];

    if (categoryFilter === 'all') {
        // Объединяем Живопись, Графику и Иллюстрации в один массив
        Object.keys(gallery).forEach(key => {
            gallery[key].forEach(item => itemsToRender.push(item));
        });
    } else if (gallery[categoryFilter]) {
        itemsToRender = gallery[categoryFilter];
    }

    // Генерируем карточки в стиле скрапбукинга
    itemsToRender.forEach(item => {
        const cardHtml = `
            <article class="art-card">
                <div class="art-card-img-wrapper">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="art-card-info">
                    <h3>${item.title}</h3>
                    <span>2025 · Холст · Масло</span>
                </div>
            </article>
        `;
        gridContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Инициализация кликов по вкладкам (Живопись / Графика / Иллюстрация)
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Убираем класс активной вкладки у всех кнопок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем текущей нажатой кнопке
            e.target.classList.add('active');
            
            // Фильтруем галерею по data-category
            const category = e.target.dataset.category;
            renderCatalog(category);
        });
    });
}

// ==========================================
// 3. ЕДИНАЯ ТОЧКА ЗАПУСКА ПРИ ЗАГРУЗКЕ DOM
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Сначала дожидаемся загрузки всех частей HTML (если они используются)
    await loadParts();
    
    // Затем собираем и запускаем каталог
    renderCatalog('all'); 
    initTabs();           
});