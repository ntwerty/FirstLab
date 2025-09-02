 // Инициализация игры
        document.addEventListener('DOMContentLoaded', () => {
            // Конфигурация игры
            const config = {
                ballRadius: 10,
                paddleHeight: 15,
                paddleWidth: 100,
                brickRowCount: 6,
                brickColumnCount: 10,
                brickWidth: 70,
                brickHeight: 20,
                brickPadding: 12,
                brickOffsetTop: 60,
                brickOffsetLeft: 30,
                bonusTypes: {
                    extendPaddle: { color: '#4CAF50', duration: 10000, text: 'Удлиненная платформа' },
                    extraBalls: { color: '#FF9800', text: 'Дополнительные шарики' },
                    speedUp: { color: '#F44336', duration: 8000, text: 'Ускоренный шарик' },
                    explosion: { color: '#9C27B0', text: 'Взрывная волна' }
                },
                difficultySettings: {
                    easy: { ballSpeed: 5, paddleWidth: 120, timePerLevel: 90 },
                    medium: { ballSpeed: 7, paddleWidth: 100, timePerLevel: 60 },
                    hard: { ballSpeed: 9, paddleWidth: 80, timePerLevel: 45 }
                }
            };
            
            // Элементы интерфейса
            const elements = {
                canvas: document.getElementById('gameCanvas'),
                scoreValue: document.getElementById('scoreValue'),
                levelValue: document.getElementById('levelValue'),
                timeValue: document.getElementById('timeValue'),
                startScreen: document.getElementById('startScreen'),
                levelCompleteScreen: document.getElementById('levelCompleteScreen'),
                gameOverScreen: document.getElementById('gameOverScreen'),
                startButton: document.getElementById('startButton'),
                nextLevelButton: document.getElementById('nextLevelButton'),
                restartButton: document.getElementById('restartButton'),
                pauseButton: document.getElementById('pauseButton'),
                soundToggle: document.getElementById('soundToggle'),
                bonusIndicator: document.getElementById('bonusIndicator'),
                bonusIcon: document.getElementById('bonusIcon'),
                bonusText: document.getElementById('bonusText'),
                completedLevel: document.getElementById('completedLevel'),
                completedScore: document.getElementById('completedScore'),
                finalScore: document.getElementById('finalScore'),
                finalLevel: document.getElementById('finalLevel')
            };
            
            const ctx = elements.canvas.getContext('2d');
            let gameState = {
                score: 0,
                level: 1,
                lives: 3,
                timeLeft: 60,
                gameActive: false,
                gamePaused: false,
                ballLaunched: false,
                difficulty: 'medium',
                soundEnabled: true,
                activeBonuses: {},
                secretUnlocked: false,
                easterEggActive: false,
                easterEggSequence: []
            };
            
            // Игровые объекты
            let paddle = {
                x: elements.canvas.width / 2 - config.paddleWidth / 2,
                y: elements.canvas.height - config.paddleHeight - 10,
                width: config.paddleWidth,
                height: config.paddleHeight,
                dx: 8,
                originalWidth: config.paddleWidth
            };
            
            let ball = {
                x: elements.canvas.width / 2,
                y: paddle.y - config.ballRadius,
                dx: 0,
                dy: 0,
                radius: config.ballRadius,
                speed: config.difficultySettings[gameState.difficulty].ballSpeed,
                originalSpeed: config.difficultySettings[gameState.difficulty].ballSpeed
            };
            
            let bricks = [];
            let bonuses = [];
            let particles = [];
            
            // Звуковые эффекты
            const sounds = {
                hit: new Howl({ src: ['sounds/ball.mp3'] }),
                brick: new Howl({ src: ['sounds/brick.mp3'] }),
                bonus: new Howl({ src: ['sounds/bonus.mp3'] }),
                levelComplete: new Howl({ src: ['sounds/complete.mp3'] }),
                gameOver: new Howl({ src: ['sounds/gameover.mp3'] }),
                background: new Howl({ 
                    src: ['sounds/background.mp3'],
                    loop: true,
                    volume: 0.3
                })
            };
            
            // Инициализация игры
            function initGame() {
                // Показать стартовый экран
                elements.startScreen.classList.add('active');
                
                // Загрузить сохраненный прогресс
                loadProgress();
                
                // Установить обработчики событий
                setupEventListeners();
                
                // Начать игровой цикл
                requestAnimationFrame(gameLoop);
            }
            
            // Настройка обработчиков событий
            function setupEventListeners() {
                // Кнопки управления
                elements.startButton.addEventListener('click', startGame);
                elements.nextLevelButton.addEventListener('click', nextLevel);
                elements.restartButton.addEventListener('click', restartGame);
                elements.pauseButton.addEventListener('click', togglePause);
                elements.soundToggle.addEventListener('click', toggleSound);
                
                // Кнопки сложности
                document.querySelectorAll('.difficulty-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.querySelector('.difficulty-btn.active').classList.remove('active');
                        btn.classList.add('active');
                        gameState.difficulty = btn.dataset.difficulty;
                        updateDifficulty();
                    });
                });
                
                // Управление с клавиатуры
                document.addEventListener('keydown', (e) => {
                    // Пауза
                    if (e.key === 'p' || e.key === 'P') {
                        togglePause();
                    }
                    
                    // Запуск шарика
                    if (e.key === ' ' && gameState.gameActive && !gameState.gamePaused && !gameState.ballLaunched) {
                        launchBall();
                    }
                    
                    // Секретная пасхалка
                    if (e.key === 's' || e.key === 'S') gameState.easterEggSequence.push('s');
                    if (e.key === 'p' || e.key === 'P') gameState.easterEggSequence.push('p');
                    if (e.key === 'a' || e.key === 'A') gameState.easterEggSequence.push('a');
                    if (e.key === 'm' || e.key === 'M') gameState.easterEggSequence.push('m');
                    
                    if (gameState.easterEggSequence.join('') === 'spam') {
                        activateEasterEgg();
                        gameState.easterEggSequence = [];
                    }
                    
                    // Ограничение длины последовательности
                    if (gameState.easterEggSequence.length > 4) {
                        gameState.easterEggSequence.shift();
                    }
                });
                
                // Управление платформой
                document.addEventListener('mousemove', (e) => {
                    if (!gameState.gameActive || gameState.gamePaused) return;
                    
                    const relativeX = e.clientX - elements.canvas.getBoundingClientRect().left;
                    if (relativeX > 0 && relativeX < elements.canvas.width) {
                        paddle.x = relativeX - paddle.width / 2;
                    }
                });
                
                // Для мобильных устройств
                elements.canvas.addEventListener('touchmove', (e) => {
                    if (!gameState.gameActive || gameState.gamePaused) return;
                    e.preventDefault();
                    
                    const relativeX = e.touches[0].clientX - elements.canvas.getBoundingClientRect().left;
                    if (relativeX > 0 && relativeX < elements.canvas.width) {
                        paddle.x = relativeX - paddle.width / 2;
                    }
                });
                
                // Запуск шарика по клику/тапу
                elements.canvas.addEventListener('click', () => {
                    if (gameState.gameActive && !gameState.gamePaused && !gameState.ballLaunched) {
                        launchBall();
                    }
                });
                
                elements.canvas.addEventListener('touchend', () => {
                    if (gameState.gameActive && !gameState.gamePaused && !gameState.ballLaunched) {
                        launchBall();
                    }
                });
            }
            
            // Запуск игры
            function startGame() {
                elements.startScreen.classList.remove('active');
                gameState.gameActive = true;
                gameState.ballLaunched = false;
                resetBall();
                createBricks();
                
                // Запустить таймер
                gameState.timeLeft = config.difficultySettings[gameState.difficulty].timePerLevel;
                elements.timeValue.textContent = gameState.timeLeft;
                
                // Запустить фоновую музыку
                if (gameState.soundEnabled) {
                    sounds.background.play();
                }
            }
            
            // Переход на следующий уровень
            function nextLevel() {
                elements.levelCompleteScreen.classList.remove('active');
                gameState.level++;
                elements.levelValue.textContent = gameState.level;
                gameState.ballLaunched = false;
                resetBall();
                createBricks();
                
                // Увеличить сложность
                if (gameState.level % 3 === 0) {
                    config.brickRowCount++;
                    if (config.brickColumnCount < 14) config.brickColumnCount++;
                }
                
                // Сбросить таймер
                gameState.timeLeft = config.difficultySettings[gameState.difficulty].timePerLevel;
                elements.timeValue.textContent = gameState.timeLeft;
                
                // Сохранить прогресс
                saveProgress();
            }
            
            // Перезапуск игры
            function restartGame() {
                elements.gameOverScreen.classList.remove('active');
                gameState.score = 0;
                gameState.level = 1;
                gameState.lives = 3;
                gameState.secretUnlocked = false;
                elements.scoreValue.textContent = gameState.score;
                elements.levelValue.textContent = gameState.level;
                
                startGame();
            }
            
            // Переключение паузы
            function togglePause() {
                gameState.gamePaused = !gameState.gamePaused;
                elements.pauseButton.textContent = gameState.gamePaused ? 'Продолжить' : 'Пауза';
            }
            
            // Переключение звука
            function toggleSound() {
                gameState.soundEnabled = !gameState.soundEnabled;
                elements.soundToggle.textContent = gameState.soundEnabled ? 'Звук: Вкл' : 'Звук: Выкл';
                
                if (gameState.soundEnabled) {
                    sounds.background.play();
                } else {
                    sounds.background.pause();
                }
            }
            
            // Обновление сложности
            function updateDifficulty() {
                const settings = config.difficultySettings[gameState.difficulty];
                ball.speed = settings.ballSpeed;
                ball.originalSpeed = settings.ballSpeed;
                paddle.originalWidth = settings.paddleWidth;
                paddle.width = settings.paddleWidth;
                
                // Сбросить активные бонусы
                gameState.activeBonuses = {};
                
                if (gameState.gameActive) {
                    gameState.timeLeft = settings.timePerLevel;
                    elements.timeValue.textContent = gameState.timeLeft;
                }
            }
            
            // Создание кирпичей
            function createBricks() {
                bricks = [];
                const colors = ['#FF5252', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];
                
                for (let c = 0; c < config.brickColumnCount; c++) {
                    for (let r = 0; r < config.brickRowCount; r++) {
                        const brickX = c * (config.brickWidth + config.brickPadding) + config.brickOffsetLeft;
                        const brickY = r * (config.brickHeight + config.brickPadding) + config.brickOffsetTop;
                        const colorIndex = Math.floor(r / 2) % colors.length;
                        
                        bricks.push({
                            x: brickX,
                            y: brickY,
                            width: config.brickWidth,
                            height: config.brickHeight,
                            color: colors[colorIndex],
                            status: 1,
                            bonus: Math.random() < 0.2 ? getRandomBonus() : null
                        });
                    }
                }
            }
            
            // Получение случайного бонуса
            function getRandomBonus() {
                const bonusKeys = Object.keys(config.bonusTypes);
                const randomBonus = bonusKeys[Math.floor(Math.random() * bonusKeys.length)];
                return randomBonus;
            }
            
            // Запуск шарика
            function launchBall() {
                if (!gameState.ballLaunched) {
                    ball.dx = Math.random() > 0.5 ? ball.speed : -ball.speed;
                    ball.dy = -ball.speed;
                    gameState.ballLaunched = true;
                }
            }
            
            // Сброс шарика
            function resetBall() {
                ball.x = paddle.x + paddle.width / 2;
                ball.y = paddle.y - ball.radius;
                ball.dx = 0;
                ball.dy = 0;
                gameState.ballLaunched = false;
            }
            
            // Обновление состояния игры
            function update() {
                if (!gameState.gameActive || gameState.gamePaused) return;
                
                // Обновление времени
                gameState.timeLeft -= 1/60;
                elements.timeValue.textContent = Math.ceil(gameState.timeLeft);
                
                // Проверка таймера
                if (gameState.timeLeft <= 0) {
                    gameOver();
                    return;
                }
                
                // Обновление позиции шарика
                ball.x += ball.dx;
                ball.y += ball.dy;
                
                // Коллизия с левой и правой стенами
                if (ball.x + ball.dx > elements.canvas.width - ball.radius || 
                    ball.x + ball.dx < ball.radius) {
                    ball.dx = -ball.dx;
                    if (gameState.soundEnabled) sounds.hit.play();
                }
                
                // Коллизия с верхней стеной
                if (ball.y + ball.dy < ball.radius) {
                    ball.dy = -ball.dy;
                    if (gameState.soundEnabled) sounds.hit.play();
                }
                
                // Коллизия с нижней стеной (потеря жизни)
                if (ball.y + ball.dy > elements.canvas.height - ball.radius) {
                    gameState.lives--;
                    
                    if (gameState.lives <= 0) {
                        gameOver();
                    } else {
                        resetBall();
                    }
                }
                
                // Коллизия с платформой
                if (
                    ball.y + ball.dy > paddle.y - ball.radius &&
                    ball.x > paddle.x &&
                    ball.x < paddle.x + paddle.width
                ) {
                    // Изменение угла отскока в зависимости от места удара
                    const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
                    ball.dx = hitPoint * ball.speed;
                    ball.dy = -Math.abs(ball.dy);
                    
                    if (gameState.soundEnabled) sounds.hit.play();
                }
                
                // Коллизия с кирпичами
                for (let i = 0; i < bricks.length; i++) {
                    const brick = bricks[i];
                    
                    if (brick.status === 1) {
                        if (
                            ball.x > brick.x &&
                            ball.x < brick.x + brick.width &&
                            ball.y > brick.y &&
                            ball.y < brick.y + brick.height
                        ) {
                            ball.dy = -ball.dy;
                            brick.status = 0;
                            
                            // Добавление очков
                            gameState.score += 10 * gameState.level;
                            elements.scoreValue.textContent = gameState.score;
                            
                            // Проверка на бонус
                            if (brick.bonus) {
                                createBonus(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.bonus);
                            }
                            
                            if (gameState.soundEnabled) sounds.brick.play();
                            
                            // Проверка на завершение уровня
                            if (bricks.every(b => b.status === 0)) {
                                levelComplete();
                            }
                            
                            // Проверка на секретный бонус
                            if (gameState.score >= 10000 && !gameState.secretUnlocked) {
                                activateSecretBonus();
                                gameState.secretUnlocked = true;
                            }
                        }
                    }
                }
                
                // Обновление бонусов
                updateBonuses();
                
                // Обновление частиц
                updateParticles();
            }
            
            // Создание бонуса
            function createBonus(x, y, type) {
                bonuses.push({
                    x: x,
                    y: y,
                    width: 20,
                    height: 20,
                    type: type,
                    color: config.bonusTypes[type].color,
                    speed: 3
                });
            }
            
            // Обновление бонусов
            function updateBonuses() {
                for (let i = bonuses.length - 1; i >= 0; i--) {
                    const bonus = bonuses[i];
                    
                    // Движение вниз
                    bonus.y += bonus.speed;
                    
                    // Коллизия с платформой
                    if (
                        bonus.y + bonus.height > paddle.y &&
                        bonus.x > paddle.x &&
                        bonus.x < paddle.x + paddle.width
                    ) {
                        // Активация бонуса
                        activateBonus(bonus.type);
                        bonuses.splice(i, 1);
                        continue;
                    }
                    
                    // Удаление вышедших за пределы экрана
                    if (bonus.y > elements.canvas.height) {
                        bonuses.splice(i, 1);
                    }
                }
            }
            
            // Активация бонуса
            function activateBonus(type) {
                const bonusConfig = config.bonusTypes[type];
                
                // Показать индикатор бонуса
                elements.bonusIcon.style.backgroundColor = bonusConfig.color;
                elements.bonusText.textContent = bonusConfig.text;
                elements.bonusIndicator.style.opacity = '1';
                
                // Скрыть индикатор через 2 секунды
                setTimeout(() => {
                    elements.bonusIndicator.style.opacity = '0';
                }, 2000);
                
                // Активация эффекта бонуса
                switch (type) {
                    case 'extendPaddle':
                        paddle.width = paddle.originalWidth * 1.5;
                        gameState.activeBonuses[type] = {
                            type: type,
                            startTime: Date.now(),
                            duration: bonusConfig.duration
                        };
                        break;
                        
                    case 'extraBalls':
                        // Создание 2 дополнительных шариков
                        for (let i = 0; i < 2; i++) {
                            setTimeout(() => {
                                createExtraBall();
                            }, i * 300);
                        }
                        break;
                        
                    case 'speedUp':
                        ball.speed *= 1.5;
                        ball.dx *= 1.5;
                        ball.dy *= 1.5;
                        gameState.activeBonuses[type] = {
                            type: type,
                            startTime: Date.now(),
                            duration: bonusConfig.duration
                        };
                        break;
                        
                    case 'explosion':
                        // Уничтожение всех кирпичей в радиусе
                        const explosionRadius = 150;
                        for (let i = bricks.length - 1; i >= 0; i--) {
                            const brick = bricks[i];
                            const dx = brick.x + brick.width/2 - ball.x;
                            const dy = brick.y + brick.height/2 - ball.y;
                            const distance = Math.sqrt(dx*dx + dy*dy);
                            
                            if (distance < explosionRadius && brick.status === 1) {
                                brick.status = 0;
                                gameState.score += 10 * gameState.level;
                                elements.scoreValue.textContent = gameState.score;
                                
                                // Эффект взрыва
                                createExplosion(brick.x + brick.width/2, brick.y + brick.height/2);
                            }
                        }
                        break;
                }
                
                if (gameState.soundEnabled) sounds.bonus.play();
                
                // Проверка на завершение уровня
                if (bricks.every(b => b.status === 0)) {
                    levelComplete();
                }
            }
            
            // Создание дополнительного шарика
            function createExtraBall() {
                const extraBall = {
                    x: ball.x,
                    y: ball.y,
                    dx: Math.random() > 0.5 ? ball.speed : -ball.speed,
                    dy: -ball.speed,
                    radius: ball.radius,
                    speed: ball.speed
                };
                
                
                createExplosion(extraBall.x, extraBall.y, '#FF9800');
            }
            
            // Активация секретного бонуса
            function activateSecretBonus() {
                // Создаем эффект "звездопада"
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => {
                        createParticle(
                            Math.random() * elements.canvas.width,
                            Math.random() * elements.canvas.height,
                            '#FFEB3B',
                            5
                        );
                    }, i * 50);
                }
                
                // Добавляем очки
                gameState.score += 5000;
                elements.scoreValue.textContent = gameState.score;
                
                // Показываем сообщение
                elements.bonusIcon.style.backgroundColor = '#FFEB3B';
                elements.bonusText.textContent = 'Секретный бонус: 5000 очков!';
                elements.bonusIndicator.style.opacity = '1';
                
                setTimeout(() => {
                    elements.bonusIndicator.style.opacity = '0';
                }, 3000);
            }
            
            // Активация пасхалки
            function activateEasterEgg() {
                gameState.easterEggActive = true;
                gameState.easterEggTimeout = setTimeout(() => {
                    gameState.easterEggActive = false;
                }, 10000);
                
                // Показываем сообщение
                elements.bonusIcon.style.backgroundColor = '#9C27B0';
                elements.bonusText.textContent = 'Пасхалка активирована!';
                elements.bonusIndicator.style.opacity = '1';
                
                setTimeout(() => {
                    elements.bonusIndicator.style.opacity = '0';
                }, 3000);
            }
            
            // Создание взрыва
            function createExplosion(x, y, color = '#FF5722') {
                for (let i = 0; i < 20; i++) {
                    createParticle(x, y, color, 3);
                }
            }
            
            // Создание частицы
            function createParticle(x, y, color, size) {
                particles.push({
                    x: x,
                    y: y,
                    size: size,
                    color: color,
                    speed: Math.random() * 3 + 1,
                    angle: Math.random() * Math.PI * 2,
                    life: 1.0,
                    decay: 0.02 + Math.random() * 0.02
                });
            }
            
            // Обновление частиц
            function updateParticles() {
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    
                    p.x += Math.cos(p.angle) * p.speed;
                    p.y += Math.sin(p.angle) * p.speed;
                    p.life -= p.decay;
                    
                    if (p.life <= 0) {
                        particles.splice(i, 1);
                    }
                }
            }
            
            // Завершение уровня
            function levelComplete() {
                gameState.gameActive = false;
                elements.levelCompleteScreen.classList.add('active');
                elements.completedLevel.textContent = gameState.level;
                elements.completedScore.textContent = gameState.score;
                
                // Сохранить прогресс
                saveProgress();
                
                if (gameState.soundEnabled) {
                    sounds.background.stop();
                    sounds.levelComplete.play();
                }
            }
            
            // Завершение игры
            function gameOver() {
                gameState.gameActive = false;
                elements.gameOverScreen.classList.add('active');
                elements.finalScore.textContent = gameState.score;
                elements.finalLevel.textContent = gameState.level - 1;
                
                if (gameState.soundEnabled) {
                    sounds.background.stop();
                    sounds.gameOver.play();
                }
            }
            
            // Сохранение прогресса
            function saveProgress() {
                localStorage.setItem('arkanoid_score', gameState.score);
                localStorage.setItem('arkanoid_level', gameState.level);
                localStorage.setItem('arkanoid_difficulty', gameState.difficulty);
                localStorage.setItem('arkanoid_sound', gameState.soundEnabled ? '1' : '0');
            }
            
            // Загрузка прогресса
            function loadProgress() {
                const savedScore = localStorage.getItem('arkanoid_score');
                const savedLevel = localStorage.getItem('arkanoid_level');
                const savedDifficulty = localStorage.getItem('arkanoid_difficulty');
                const savedSound = localStorage.getItem('arkanoid_sound');
                
                if (savedScore) gameState.score = parseInt(savedScore);
                if (savedLevel) gameState.level = parseInt(savedLevel);
                if (savedDifficulty) gameState.difficulty = savedDifficulty;
                if (savedSound) gameState.soundEnabled = savedSound === '1';
                
                // Обновление UI
                elements.scoreValue.textContent = gameState.score;
                elements.levelValue.textContent = gameState.level;
                elements.soundToggle.textContent = gameState.soundEnabled ? 'Звук: Вкл' : 'Звук: Выкл';
                
                // Установка сложности
                document.querySelectorAll('.difficulty-btn').forEach(btn => {
                    if (btn.dataset.difficulty === gameState.difficulty) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                
                updateDifficulty();
            }
            
            // Отрисовка игры
            function draw() {
                // Очистка холста
                ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
                
                // Рисование фона
                drawBackground();
                
                // Рисование платформы
                ctx.beginPath();
                ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
                ctx.fillStyle = '#4a9fff';
                ctx.fill();
                ctx.closePath();
                
                // Рисование шарика
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.closePath();
                
                // Рисование кирпичей
                bricks.forEach(brick => {
                    if (brick.status === 1) {
                        ctx.beginPath();
                        ctx.rect(brick.x, brick.y, brick.width, brick.height);
                        ctx.fillStyle = brick.color;
                        ctx.fill();
                        
                        // Стиль для кирпичей
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.closePath();
                    }
                });
                
                // Рисование бонусов
                bonuses.forEach(bonus => {
                    ctx.beginPath();
                    ctx.rect(bonus.x, bonus.y, bonus.width, bonus.height);
                    ctx.fillStyle = bonus.color;
                    ctx.fill();
                    ctx.closePath();
                    
                    // Анимация бонуса
                    ctx.beginPath();
                    ctx.arc(bonus.x + bonus.width/2, bonus.y + bonus.height/2, bonus.width/2, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();
                });
                
                // Рисование частиц
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${parseInt(p.color.slice(1,3), 16)}, ${parseInt(p.color.slice(3,5), 16)}, ${parseInt(p.color.slice(5,7), 16)}, ${p.life})`;
                    ctx.fill();
                    ctx.closePath();
                });
                
                // Рисование пасхалки (если активна)
                if (gameState.easterEggActive) {
                    ctx.fillStyle = 'rgba(156, 39, 176, 0.3)';
                    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
                    
                    ctx.font = '30px Arial';
                    ctx.fillStyle = '#FFEB3B';
                    ctx.textAlign = 'center';
                    ctx.fillText('SPAM', elements.canvas.width / 2, elements.canvas.height / 2);
                }
            }
            
            // Рисование фона
            function drawBackground() {
                // Звездное небо
                ctx.fillStyle = 'rgba(0, 10, 30, 0.9)';
                ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
                
                // Звезды
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                for (let i = 0; i < 50; i++) {
                    const x = (i * 73) % elements.canvas.width;
                    const y = (i * 57) % elements.canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Эффект сетки
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
                ctx.lineWidth = 1;
                
                for (let x = 0; x < elements.canvas.width; x += 30) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, elements.canvas.height);
                    ctx.stroke();
                }
                
                for (let y = 0; y < elements.canvas.height; y += 30) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(elements.canvas.width, y);
                    ctx.stroke();
                }
            }
            
            // Игровой цикл
            function gameLoop() {
                update();
                draw();
                requestAnimationFrame(gameLoop);
            }
            
            // Запуск инициализации
            initGame();
        });