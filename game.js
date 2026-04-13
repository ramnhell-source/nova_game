"use strict";

/**
 * H A V E N - Core Engine (Strict ES5)
 * Targeting: iPad Mini 1 (iOS 9.3.2)
 */

(function() {
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    
    // UI Elements
    var statusText = document.getElementById("game-status");
    var elLevel = document.getElementById("val-level");
    var elGold = document.getElementById("val-gold");
    var barXP = document.getElementById("bar-xp");
    var barHP = document.getElementById("bar-hp");

    var width, height;
    var stars = [];
    var starCount = 80;

    // RPG State
    var gameState = {
        authenticated: false,
        user: null,
        level: 1,
        xp: 0,
        xpNext: 100,
        gold: 0,
        health: 100,
        maxHealth: 100
    };

    // Player State
    var player = {
        id: null,
        x: 0,
        y: 0,
        size: 32,
        speed: 6,
        color: "#4488ff",
        glow: "#00ccff",
        ready: false,
        flip: false,
        img: new Image(),
        chatMsg: "",
        chatTime: 0
    };

    // Multiplayer State
    var otherPlayers = [];
    var maleSpriteImg = new Image();
    var femaleSpriteImg = new Image();
    var spritesLoaded = 0;

    function onSpriteLoad() {
        spritesLoaded++;
        if (spritesLoaded >= 2) player.ready = true;
    }

    maleSpriteImg.onload = onSpriteLoad;
    femaleSpriteImg.onload = onSpriteLoad;
    maleSpriteImg.src = "assets/sprites/SpriteMale.png";
    femaleSpriteImg.src = "assets/sprites/SpriteStand.png"; // Female is current stand

    var keys = {};

    function init() {
        resize();
        createStars();
        
        player.x = width / 2;
        player.y = height / 2;

        setupControls();
        initAuth();
        animate();
        
        updateHUD();
        console.log("haven: systems online");
    }

    function initAuth() {
        var savedUser = localStorage.getItem("haven_remembered_user");
        if (savedUser) {
            try {
                var userData = JSON.parse(savedUser);
                loginSuccess(userData);
            } catch(e) { 
                console.error("Session Corrupt"); 
                showAuth();
            }
        } else {
            showAuth();
        }
    }

    function showAuth() {
        document.getElementById("splash-screen").style.display = "block";
        document.getElementById("rpg-hud").style.display = "none";
        document.getElementById("auth-box").style.display = "block";
    }

    function loginSuccess(user) {
        gameState.authenticated = true;
        gameState.user = user;
        player.id = user.id;
        
        // Stats from DB
        gameState.level = user.level || 1;
        gameState.xp = user.xp || 0;
        gameState.gold = user.gold || 0;

        document.getElementById("auth-box").style.display = "none";
        document.getElementById("game-status").innerHTML = "Welcome back, " + user.name;
        document.getElementById("rpg-hud").style.display = "flex";
        document.getElementById("mobile-controls").style.display = "flex";
        document.getElementById("bottom-ui").style.display = "flex";

        if (document.getElementById("check-remember").checked) {
            localStorage.setItem("haven_remembered_user", JSON.stringify(user));
        }

        setTimeout(function() {
            document.getElementById("splash-screen").style.opacity = "0";
            document.getElementById("splash-screen").style.pointerEvents = "none";
        }, 2000);

        startHeartbeat();
    }

    function logout() {
        gameState.authenticated = false;
        gameState.user = null;
        localStorage.removeItem("haven_remembered_user");
        location.reload();
    }

    function startHeartbeat() {
        if (!gameState.authenticated) return;
        
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/heartbeat", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                var activePlayers = data.players;
                
                // Preserve current positions for interpolation
                for (var i = 0; i < activePlayers.length; i++) {
                    var p = activePlayers[i];
                    var existing = findOtherPlayer(p.id);
                    if (existing) {
                        existing.targetX = p.pos_x;
                        existing.targetY = p.pos_y;
                        existing.name = p.name;
                        existing.gender = p.gender;
                        existing.chatMsg = p.chat_msg;
                        existing.chatTime = p.chat_at ? new Date(p.chat_at).getTime() : 0;
                    } else {
                        p.currentX = p.pos_x;
                        p.currentY = p.pos_y;
                        p.targetX = p.pos_x;
                        p.targetY = p.pos_y;
                        p.chatMsg = p.chat_msg;
                        p.chatTime = p.chat_at ? new Date(p.chat_at).getTime() : 0;
                        otherPlayers.push(p);
                    }
                }

                // Cleanup inactive
                otherPlayers = otherPlayers.filter(function(op) {
                    for (var j = 0; j < activePlayers.length; j++) {
                        if (activePlayers[j].id === op.id) return true;
                    }
                    return false;
                });
            }
        };

        xhr.send(JSON.stringify({
            id: player.id,
            x: Math.floor(player.x),
            y: Math.floor(player.y),
            msg: player.newMsg || null
        }));
        player.newMsg = null; // Clear after sending

        setTimeout(startHeartbeat, 500); // Faster sync: 500ms for "Live" feel
    }

    function findOtherPlayer(id) {
        for (var i = 0; i < otherPlayers.length; i++) {
            if (otherPlayers[i].id === id) return otherPlayers[i];
        }
        return null;
    }

    function setupControls() {
        window.addEventListener("keydown", function(e) {
            if (!gameState.authenticated) {
                if (e.keyCode === 13) {
                    if (document.getElementById("form-login").style.display !== "none") handleLogin();
                    else handleSignup();
                }
                return;
            }
            keys[e.keyCode] = true;
            
            // Movement Direction
            if (e.keyCode === 65) player.flip = true;
            if (e.keyCode === 68) player.flip = false;

            // Chat Toggle
            if (e.keyCode === 13) {
                var input = document.getElementById("chat-input");
                if (document.activeElement === input) {
                    sendChat();
                } else {
                    input.focus();
                }
            }
        });

        window.addEventListener("keyup", function(e) {
            keys[e.keyCode] = false;
        });

        document.getElementById("btn-signup").addEventListener("click", handleSignup);
        document.getElementById("btn-login").addEventListener("click", handleLogin);
        document.getElementById("btn-logout").addEventListener("click", logout);

        document.getElementById("link-to-login").addEventListener("click", function() {
            document.getElementById("form-signup").style.display = "none";
            document.getElementById("form-login").style.display = "block";
        });

        document.getElementById("link-to-signup").addEventListener("click", function() {
            document.getElementById("form-signup").style.display = "block";
            document.getElementById("form-login").style.display = "none";
        });

        // Mobile
        var btnL = document.getElementById("btn-left");
        var btnR = document.getElementById("btn-right");
        function handleBtn(code, state, flip) {
            if (!gameState.authenticated) return;
            keys[code] = state;
            if (state) player.flip = flip;
        }
        btnL.addEventListener("touchstart", function(e) { e.preventDefault(); handleBtn(65, true, true); });
        btnL.addEventListener("touchend", function() { handleBtn(65, false, true); });
        btnR.addEventListener("touchstart", function(e) { e.preventDefault(); handleBtn(68, true, false); });
        btnR.addEventListener("touchend", function() { handleBtn(68, false, false); });
        
        btnL.addEventListener("mousedown", function() { handleBtn(65, true, true); });
        btnL.addEventListener("mouseup", function() { handleBtn(65, false, true); });
        btnR.addEventListener("mousedown", function() { handleBtn(68, true, false); });
        btnR.addEventListener("mouseup", function() { handleBtn(68, false, false); });

        // Chat Input Specifics
        var chatInp = document.getElementById("chat-input");
        chatInp.addEventListener("keydown", function(e) {
            if (e.keyCode === 13) {
                sendChat();
            }
            e.stopPropagation(); // Don't move while typing
        });

        function sendChat() {
            var input = document.getElementById("chat-input");
            var text = input.value.trim();
            if (text) {
                player.chatMsg = text;
                player.chatTime = Date.now();
                player.newMsg = text; // Flag for heartbeat
                input.value = "";
            }
            input.blur();
        }
    }

    function handleLogin() {
        var name = document.getElementById("login-name").value;
        var pin = document.getElementById("login-pin").value;
        if (!name || pin.length !== 4) {
            alert("Enter name and 4-digit PIN.");
            return;
        }
        document.getElementById("game-status").innerHTML = "Authenticating...";
        document.getElementById("btn-login").disabled = true;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/login", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                document.getElementById("btn-login").disabled = false;
                if (xhr.status === 200) loginSuccess(JSON.parse(xhr.responseText));
                else {
                    var err = JSON.parse(xhr.responseText);
                    document.getElementById("game-status").innerHTML = "Error: " + (err.error || "Login Failed");
                }
            }
        };
        xhr.send(JSON.stringify({ name: name, pin: pin }));
    }

    function handleSignup() {
        var name = document.getElementById("reg-name").value;
        var pin = document.getElementById("reg-pin").value;
        var gender = document.getElementById("reg-gender").value;
        if (!name || pin.length !== 4 || !gender) {
            alert("Complete all fields.");
            return;
        }
        document.getElementById("game-status").innerHTML = "Creating account...";
        document.getElementById("btn-signup").disabled = true;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/signup", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                document.getElementById("btn-signup").disabled = false;
                if (xhr.status === 200) loginSuccess(JSON.parse(xhr.responseText));
                else {
                    var err = JSON.parse(xhr.responseText);
                    document.getElementById("game-status").innerHTML = "Error: " + (err.error || "Signup Failed");
                }
            }
        };
        xhr.send(JSON.stringify({ name: name, pin: pin, gender: gender }));
    }

    function updateHUD() {
        elLevel.innerHTML = gameState.level;
        elGold.innerHTML = gameState.gold;
        barXP.style.width = (gameState.xp / gameState.xpNext * 100) + "%";
        barHP.style.width = (gameState.health / gameState.maxHealth * 100) + "%";
    }

    function updateMovement() {
        if (document.activeElement === document.getElementById("chat-input")) return;
        var dx = 0, dy = 0;
        if (keys[87]) dy -= 1; // W
        if (keys[83]) dy += 1; // S
        if (keys[65]) dx -= 1; // A
        if (keys[68]) dx += 1; // D
        if (dx !== 0 && dy !== 0) {
            var len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
        }
        player.x += dx * player.speed;
        player.y += dy * player.speed;
        if (player.x < player.size) player.x = player.size;
        if (player.x > width - player.size) player.x = width - player.size;
        if (player.y < player.size) player.y = player.size;
        if (player.y > height - player.size) player.y = height - player.size;
    }

    function drawSprite(img, x, y, flip, name, gender, chatMsg, chatTime) {
        var drawWidth = 64;
        var drawHeight = (img.height / img.width) * drawWidth;
        
        ctx.save();
        ctx.translate(x, y);

        // Fix: Male sprite in this project is facing left by default
        var activeFlip = flip;
        if (gender === "male") activeFlip = !flip;

        if (activeFlip) ctx.scale(-1, 1);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(0, 204, 255, 0.5)";
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        // Nameplate
        if (name) {
            ctx.fillStyle = "white";
            ctx.font = "10px Helvetica";
            ctx.textAlign = "center";
            ctx.fillText(name, x, y - drawHeight/2 - 10);
        }

        // Chat Bubble
        if (chatMsg && Date.now() - chatTime < 3000) {
            ctx.font = "12px Helvetica";
            var textWidth = ctx.measureText(chatMsg).width;
            var bW = textWidth + 20;
            var bH = 24;
            var bX = x - bW/2;
            var bY = y - drawHeight/2 - 45;

            // Bubble background
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.moveTo(bX + 10, bY);
            ctx.lineTo(bX + bW - 10, bY);
            ctx.quadraticCurveTo(bX + bW, bY, bX + bW, bY + 10);
            ctx.lineTo(bX + bW, bY + bH - 10);
            ctx.quadraticCurveTo(bX + bW, bY + bH, bX + bW - 10, bY + bH);
            ctx.lineTo(x + 5, bY + bH);
            ctx.lineTo(x, bY + bH + 5); // Pointy tip
            ctx.lineTo(x - 5, bY + bH);
            ctx.lineTo(bX + 10, bY + bH);
            ctx.quadraticCurveTo(bX, bY + bH, bX, bY + bH - 10);
            ctx.lineTo(bX, bY + 10);
            ctx.quadraticCurveTo(bX, bY, bX + 10, bY);
            ctx.fill();

            // Bubble text
            ctx.fillStyle = "#000000";
            ctx.fillText(chatMsg, x, bY + 16);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        var gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        gradient.addColorStop(0, "#0a0c1f");
        gradient.addColorStop(1, "#05050a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        drawStars();

        if (gameState.authenticated) {
            updateMovement();
            
            // Draw Others with Interpolation
            for (var i = 0; i < otherPlayers.length; i++) {
                var p = otherPlayers[i];
                
                // Smoothing (Lerp)
                p.currentX += (p.targetX - p.currentX) * 0.1;
                p.currentY += (p.targetY - p.currentY) * 0.1;

                var img = p.gender === "male" ? maleSpriteImg : femaleSpriteImg;
                drawSprite(img, p.currentX, p.currentY, false, p.name, p.gender, p.chatMsg, p.chatTime);
            }

            // Draw Self
            var myImg = gameState.user.gender === "male" ? maleSpriteImg : femaleSpriteImg;
            drawSprite(myImg, player.x, player.y, player.flip, gameState.user.name, gameState.user.gender, player.chatMsg, player.chatTime);
        }
        
        requestAnimationFrame(animate);
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    function createStars() {
        stars = [];
        for (var i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5,
                speed: Math.random() * 0.1 + 0.02,
                opacity: Math.random()
            });
        }
    }

    function drawStars() {
        ctx.fillStyle = "#ffffff";
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            ctx.globalAlpha = s.opacity;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            s.y += s.speed;
            if (s.y > height) s.y = 0;
        }
        ctx.globalAlpha = 1.0;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("load", init);

})();
