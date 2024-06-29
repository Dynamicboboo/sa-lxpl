const addressInput = document.getElementById('address-input');
const queryBtn = document.getElementById('query-btn');
const resultDiv = document.getElementById('result');
const exportBtn = document.getElementById('export-btn');
let currentResults = []; // Store results for export

function maskAddress(address) {
    return address.slice(0, 4) + '****' + address.slice(-4);
}

function downloadCSV(data, filename) {
    const csvContent = 'data:text/csv;charset=utf-8,' + data.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function getLXP(address) {
    const response = await fetch('https://rpc.linea.build/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "method": "eth_call",
            "params": [{"to": "0x70a08231000000000000000000000000",
                        "data": "0x70a08231000000000000000000000000" + address.slice(2)}, "latest"],
            "id": 48,
            "jsonrpc": "2.0"
        })
    });
    const data = await response.json();
    const lxp = parseInt(data.result, 16) / 10 ** 18;
    return Math.round(lxp * 100) / 100;
}

async function getLXPL(address) {
    const response = await fetch(`https://kx58j6x5me.execute-api.us-east-1.amazonaws.com/linea/getUserPointsSearch?user=${address}`);
    const data = await response.json();
    const lxpl = data[0].xp;
    const rank = data[0].rank_xp;
    return { lxpl, rank };
}

queryBtn.addEventListener('click', async function() {
    let addresses = addressInput.value.split('\n').filter(address => address.trim() !== '' && address.startsWith('0x'));
    addresses = addresses.map(address => address.toLowerCase());

    currentResults = [];

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        let result = { index: i, address: address };
        try {
            result.lxp = await getLXP(address);
        } catch {
            result.lxp = "Error";
        }
        try {
            const lxplData = await getLXPL(address);
            result.lxpl = lxplData.lxpl;
            result.rank = lxplData.rank;
        } catch {
            result.lxpl = "0";
            result.rank = "0";
        }
        currentResults.push(result);
    }

    const walletCount = currentResults.length;
    const lxplTotal = currentResults.reduce((sum, result) => sum + parseFloat(result.lxpl), 0);

    resultDiv.innerHTML = '<h3>查询结果：</h3>';
    resultDiv.innerHTML += `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>地址</th>
                    <th>LXPL</th>
                    <th>排名</th>
                </tr>
            </thead>
            <tbody id="results-body">
            </tbody>
        </table>
    `;

    const resultsBody = document.getElementById('results-body');
    currentResults.forEach((result, index) => {
        resultsBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${maskAddress(result.address)}</td>
                <td>${result.lxpl}</td>
                <td>${result.rank}</td>
            </tr>
        `;
    });

    resultDiv.innerHTML += `
        <div class="summary">
            <p>钱包总数：${walletCount} 个       -      LXPL总计：${lxplTotal}</p>
        </div>
    `;
    exportBtn.disabled = false; // Enable export button
});

exportBtn.addEventListener('click', function() {
    if (currentResults.length > 0) {
        const csvData = currentResults.map(result => [result.address, result.lxpl, result.rank]);
        csvData.unshift(['地址', 'LXPL', '排名']); // Add headers
        downloadCSV(csvData, '查询结果.csv');
    }
});
