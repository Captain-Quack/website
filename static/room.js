var socket;

if (location.pathname.endsWith('/')) {
    location.pathname = location.pathname.substring(0, location.pathname.length - 1);
}

const roomName = location.pathname.substring(13);
var userId;
var username = localStorage.getItem('username');
var validCategories = [];
var validSubcategories = [];

function connectToWebSocket() {
    socket = new WebSocket(location.href.replace('http', 'ws'), roomName);
    socket.onopen = function () {
        socket.send(JSON.stringify({ type: 'join', username: username }));
        console.log('Connected to websocket');
    }

    socket.onmessage = async function (event) {
        let data = JSON.parse(event.data);
        console.log(data);
        switch (data.type) {
            case 'user-id':
                userId = data.userId;
                data.username = username;
                break;
            case 'join':
                logEvent(data.username, `joined the game`);
                createPlayerAccordion(data.userId, data.username);
                break;
            case 'change-username':
                logEvent(data.oldUsername, 'changed their name to ' + data.username);
                document.getElementById('accordion-username-' + data.userId).innerHTML = data.username;
                break;
            case 'set-name':
            case 'packet-number':
                logEvent(data.username, `set the ${data.type} to ${data.value}`);
                document.getElementById(data.type).value = data.value;
                break;
            case 'start':
                if (await start('tossups', data.userId === userId)) {
                    logEvent(data.username, `started the game`);
                }
                break;
            case 'buzz':
                processBuzz(data.userId, data.username);
                document.getElementById('buzz').disabled = true;
                break;
            case 'next':
                logEvent(data.username, `clicked the next button`);
                readQuestion();
                break;
            case 'reading-speed':
                logEvent(data.username, `changed the reading speed to ${data.value}`);
                document.getElementById('reading-speed').value = data.value;
                document.getElementById('reading-speed-display').innerHTML = data.value;
                break;
            case 'update-subcategories':
                validSubcategories = data.value;
                loadCategories(validCategories, validSubcategories);
                break;
            case 'update-categories':
                validCategories = data.value;
                loadCategories(validCategories, validSubcategories);
                break;
            case 'leave':
                logEvent(data.username, `left the game`);
                document.getElementById('accordion-' + data.userId).remove();
                break;
            case 'pause':
                logEvent(data.username, `${paused ? 'un' : ''}paused the game`);
                pause();
                break;
            case 'answer':
                processAnswer(data.userId, data.username, data.givenAnswer, data.score);
        }
    }

    socket.onclose = function () {
        console.log('Disconnected from websocket');
    }
}

function createPlayerAccordion(userId, username, powers = 0, tens = 0, negs = 0, tuh = 0, points = 0) {
    let button = document.createElement('button');
    button.className = 'accordion-button collapsed';
    button.type = 'button';
    button.setAttribute('data-bs-target', '#accordion-body-' + userId);
    button.setAttribute('data-bs-toggle', 'collapse');

    let buttonUsername = document.createElement('span');
    buttonUsername.id = 'accordion-username-' + userId;
    buttonUsername.innerHTML = username;

    button.appendChild(buttonUsername);
    button.innerHTML += '&nbsp;(';

    let buttonPoints = document.createElement('span');
    buttonPoints.id = 'accordion-username-points-' + userId;
    buttonPoints.innerHTML = points;
    button.appendChild(buttonPoints);
    button.innerHTML += '&nbsp;pts)';

    let h2 = document.createElement('h2');
    h2.className = 'accordion-header';
    h2.id = 'heading-' + userId;
    h2.appendChild(button);

    let accordionBody = document.createElement('div');
    accordionBody.className = 'accordion-body';
    // 0/0/0 with 0 tossups seen (0 pts, celerity: 0)

    let powersSpan = document.createElement('span');
    powersSpan.innerHTML = powers;
    powersSpan.id = 'powers-' + userId;
    accordionBody.appendChild(powersSpan);
    accordionBody.innerHTML += '/';

    let tensSpan = document.createElement('span');
    tensSpan.innerHTML = tens;
    tensSpan.id = 'tens-' + userId;
    accordionBody.appendChild(tensSpan);
    accordionBody.innerHTML += '/';

    let negsSpan = document.createElement('span');
    negsSpan.innerHTML = negs;
    negsSpan.id = 'negs-' + userId;
    accordionBody.appendChild(negsSpan);

    accordionBody.innerHTML += ' with '

    let tuhSpan = document.createElement('span');
    tuhSpan.innerHTML = tuh;
    tuhSpan.id = 'tuh-' + userId;
    accordionBody.appendChild(tuhSpan);

    accordionBody.innerHTML += ' tossups seen (';

    let pointsSpan = document.createElement('span');
    pointsSpan.innerHTML = points;
    pointsSpan.id = 'points-' + userId;
    accordionBody.appendChild(pointsSpan);

    accordionBody.innerHTML += ' pts, celerity: 0)';

    let div = document.createElement('div');
    div.className = 'accordion-collapse collapse';
    div.id = 'accordion-body-' + userId;
    div.appendChild(accordionBody);

    let accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item';
    accordionItem.id = 'accordion-' + userId;
    accordionItem.appendChild(h2);
    accordionItem.appendChild(div);
    document.getElementById('player-accordion').appendChild(accordionItem);
}

function logEvent(username, message) {
    let i = document.createElement('i');
    i.innerHTML = `<b>${username}</b> ${message}`;
    let li = document.createElement('li');
    li.appendChild(i);
    document.getElementById('event-log').prepend(li);
}

function processBuzz(userId, username) {
    logEvent(username, `buzzed`);

    clearTimeout(timeoutID);

    // Include buzzpoint
    document.getElementById('question').innerHTML += '(#) ';
    document.getElementById('buzz').disabled = true;
    document.getElementById('pause').disabled = true;
}

function processAnswer(userId, username, givenAnswer, score) {
    logEvent(username, `${score > 0 ? '' : 'in'}correctly answered with "${givenAnswer}" for ${score} points`);

    // Update question text and show answer:
    if (score >= 0) {
        document.getElementById('question').innerHTML += questionTextSplit.join(' ');
        document.getElementById('answer').innerHTML = 'ANSWER: ' + questions[currentQuestionNumber]['answer'];
        document.getElementById('buzz').innerHTML = 'Buzz';
        document.getElementById('next').innerHTML = 'Next';
        document.getElementById('buzz').disabled = true;
    } else {
        console.log('bad');
        printWord();
    }

    if (score > 10) {
        document.getElementById('powers-' + userId).innerHTML = parseInt(document.getElementById('powers-' + userId).innerHTML) + 1;
    } else if (score === 10) {
        document.getElementById('tens-' + userId).innerHTML = parseInt(document.getElementById('tens-' + userId).innerHTML) + 1;
    } else if (score < 0) {
        document.getElementById('negs-' + userId).innerHTML = parseInt(document.getElementById('negs-' + userId).innerHTML) + 1;
    }

    document.getElementById('tuh-' + userId).innerHTML = parseInt(document.getElementById('tuh-' + userId).innerHTML) + 1;
    document.getElementById('points-' + userId).innerHTML = parseInt(document.getElementById('points-' + userId).innerHTML) + score;
    document.getElementById('accordion-username-points-' + userId).innerHTML = parseInt(document.getElementById('accordion-username-points-' + userId).innerHTML) + score;
}

document.getElementById('form').addEventListener('submit', function (event) {
    event.preventDefault();

    let answer = document.getElementById('answer-input').value;
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input-group').classList.add('d-none');

    let characterCount = document.getElementById('question').innerHTML.length;
    let celerity = 1 - characterCount / document.getElementById('question').innerHTML.length;

    fetch('/api/give-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            roomName: roomName,
            userId: userId,
            answer: answer,
            celerity: celerity
        })
    }).then((response) => {
        return response.json();
    }).then((data) => {
        socket.send(JSON.stringify({ 'type': 'answer', userId: userId, username: username, givenAnswer: answer, score: data.score }));
    });
});


document.getElementById('username').addEventListener('change', function () {
    socket.send(JSON.stringify({ 'type': 'change-username', userId: userId, oldUsername: username, username: this.value }));
    username = this.value;
    localStorage.setItem('username', username);
});

// Event listeners
document.getElementById('reading-speed').addEventListener('input', function () {
    socket.send(JSON.stringify({ 'type': 'reading-speed', userId: userId, username: username, value: this.value }));
});

document.getElementById('start').addEventListener('click', async function () {
    this.blur();
    socket.send(JSON.stringify({ type: 'start', userId: userId, username: username }));
});

document.getElementById('buzz').addEventListener('click', function () {
    this.blur();
    document.getElementById('answer-input-group').classList.remove('d-none');
    document.getElementById('answer-input').focus();
    socket.send(JSON.stringify({ type: 'buzz', userId: userId, username: username }));
});

document.getElementById('pause').addEventListener('click', function () {
    this.blur();
    socket.send(JSON.stringify({ type: 'pause', userId: userId, username: username }));
});

document.getElementById('next').addEventListener('click', function () {
    this.blur();
    socket.send(JSON.stringify({ type: 'next', userId: userId, username: username }));
});

document.getElementById('toggle-correct').addEventListener('click', function () {
    this.blur();
    toggleCorrect();
});

document.querySelectorAll('#categories input').forEach(input => {
    input.addEventListener('click', function (event) {
        this.blur();
        [validCategories, validSubcategories] = updateCategory(input.id, validCategories, validSubcategories);
        socket.send(JSON.stringify({ type: 'update-categories', username: username, value: validCategories }));
        socket.send(JSON.stringify({ type: 'update-subcategories', username: username, value: validSubcategories }));
    });
});

document.querySelectorAll('#subcategories input').forEach(input => {
    input.addEventListener('click', function (event) {
        this.blur();
        validSubcategories = updateSubcategory(input.id, validSubcategories);
        socket.send(JSON.stringify({ type: 'update-subcategories', username: username, value: validSubcategories }))
    });
});

document.getElementById('set-name').addEventListener('change', function () {
    socket.send(JSON.stringify({ type: 'set-name', username: username, value: this.value }));
});

document.getElementById('packet-number').addEventListener('change', function () {
    socket.send(JSON.stringify({ type: 'packet-number', username: username, value: this.value }));
});

document.getElementById('question-select').addEventListener('change', function () {
    socket.send(JSON.stringify({ type: 'question-number', username: username, value: this.value }));
});

window.onload = () => {
    document.getElementById('username').value = username;
    connectToWebSocket();
    fetch(`/api/get-room?room=${encodeURI(roomName)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('set-name').value = data.setName;
            document.getElementById('packet-number').value = data.packetNumbers;
            validCategories = data.validCategories;
            validSubcategories = data.validSubcategories;
            loadCategories(validCategories, validSubcategories);
            Object.keys(data.players).forEach(player => {
                if (data.players[player].userId === userId) return;
                createPlayerAccordion(data.players[player].userId, data.players[player].username, data.players[player].powers, data.players[player].tens, data.players[player].negs, data.players[player].tuh, data.players[player].points);
            });
        });
}