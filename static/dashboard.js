document.addEventListener('DOMContentLoaded', function() {
    // 检查必要的DOM元素是否存在
    const currentTimeElement = document.getElementById('currentTime');
    const currentDateElement = document.getElementById('currentDate');
    const calendarElement = document.getElementById('calendar');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarTitleElement = document.getElementById('calendarTitle');
    
    // 只有当所有必要元素都存在时才初始化
    if (currentTimeElement && currentDateElement) {
        updateTime();
        // 每秒更新时间
        setInterval(updateTime, 1000);
    }
    
    // 只有当日历相关元素都存在时才初始化日历
    if (calendarElement && prevMonthBtn && nextMonthBtn && calendarTitleElement) {
        updateCalendar();
        // 绑定日历导航事件
        prevMonthBtn.addEventListener('click', () => navigateCalendar(-1));
        nextMonthBtn.addEventListener('click', () => navigateCalendar(1));
    }
});

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    // 检查元素是否存在
    if (!timeElement || !dateElement) {
        console.warn('Time or date elements not found');
        return;
    }
    
    // 格式化时间 HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    
    // 格式化日期 YYYY年MM月DD日 星期X
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[now.getDay()];
    
    dateElement.textContent = `${year}年${month}月${day}日 星期${weekday}`;
}

function updateCalendar() {
    const calendarElement = document.getElementById('calendar');
    const titleElement = document.getElementById('calendarTitle');
    
    // 检查元素是否存在
    if (!calendarElement || !titleElement) {
        console.warn('Calendar elements not found');
        return;
    }
    
    // 设置标题
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                       '七月', '八月', '九月', '十月', '十一月', '十二月'];
    titleElement.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;
    
    // 清空日历
    calendarElement.innerHTML = '';
    
    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekdays';
        dayElement.textContent = day;
        calendarElement.appendChild(dayElement);
    });
    
    // 获取当月第一天是星期几
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // 获取当月天数
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // 获取上个月天数
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // 添加上个月的日期
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day other-month';
        dayElement.textContent = daysInPrevMonth - i;
        calendarElement.appendChild(dayElement);
    }
    
    // 添加本月日期
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.textContent = i;
        
        // 标记今天
        if (currentYear === today.getFullYear() && 
            currentMonth === today.getMonth() && 
            i === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        calendarElement.appendChild(dayElement);
    }
    
    // 计算需要补充的下个月日期
    const totalCells = 42; // 6行7列
    const remainingCells = totalCells - (firstDay + daysInMonth);
    
    // 添加下个月的日期
    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day other-month';
        dayElement.textContent = i;
        calendarElement.appendChild(dayElement);
    }
}

function navigateCalendar(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendar();
}

// 为禁用的功能卡片添加提示
document.querySelectorAll('.function-card.disabled').forEach(card => {
    card.addEventListener('click', function(e) {
        e.preventDefault();
        alert('此功能即将上线，敬请期待！');
    });
});