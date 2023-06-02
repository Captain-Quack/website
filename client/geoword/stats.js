const packetName = window.location.pathname.split('/').pop();

document.getElementById('packet-name').textContent = packetName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

fetch('/geoword/api/stats?' + new URLSearchParams({ packetName }))
    .then(response => response.json())
    .then(data => {
        const { buzzArray, leaderboard } = data;
        let innerHTML = '<hr>';

        for (const i in buzzArray) {
            innerHTML += `
            <div class="row mb-3">
                <div class="col-6">
                    <div><b>Question #${buzzArray[i].questionNumber}</b></div>
                    <div><b>Answer:</b> ${buzzArray[i].formatted_answer}</div>
                    <div><b>Given answer:</b> ${escapeHTML(buzzArray[i].givenAnswer)}</div>
                    <div><b>Celerity:</b> ${buzzArray[i].celerity.toFixed(3)}</div>
                    <div><b>Points:</b> ${buzzArray[i].points.toFixed(2)}</div>
                </div>
                <div class="col-6">
                    <div><b>Your rank:</b> ${leaderboard[i].rank}</div>
                    <div><b>Best buzz:</b> ${leaderboard[i].bestUsername}</div>
                    <div><b>Best celerity:</b> ${leaderboard[i].bestCelerity.toFixed(3)}</div>
                    <div><b>Average correct celerity:</b> ${leaderboard[i].averageCorrectCelerity.toFixed(3)}</div>
                    <div><b>Average points:</b> ${leaderboard[i].averagePoints.toFixed(2)}</div>
                </div>
            </div>
            <hr>
            `;
        }
        document.getElementById('stats').innerHTML = innerHTML;
    });


function escapeHTML(unsafe) {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#039;');
}
