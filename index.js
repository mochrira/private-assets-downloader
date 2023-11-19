const fetch = require('node-fetch-commonjs');
const { Octokit } = require('octokit');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});
const exec = require('child_process').exec;
const fs = require('fs');
const decompress = require('decompress');

function downloadAsset(token, asset) {
    return new Promise((resolve, reject) => {
        exec('curl -L ' + 
            '-H "Accept: application/octet-stream" ' + 
            '-H "Authorization: Bearer ' + token + '" ' + 
            '-H "X-GitHub-Api-Version: 2022-11-28" ' + 
            'https://api.github.com/repos/Wajek-Studio/akunting-core/releases/assets/' + asset.id + ' ' +
            '-o .packages/' + asset.name
        , function (e) {
            if(e != null) {
                reject(e); return;
            }
            resolve(e);
        });
    });
}

function unzip(file, dest) {
    return new Promise((resolve) => {
        decompress(file, dest).then(files => {
            resolve(true);
        });
    });
}


readline.question('Github Token : ', async (token) => {
    let path = './.packages';
    if(fs.existsSync(path)) fs.rmSync(path, { recursive: true });
    fs.mkdirSync(path);

    console.log("Gathering information...");
    const octokit = new Octokit({
        auth: token,
        request: { fetch }
    });

    let latest = await octokit.request('GET /repos/Wajek-Studio/akunting-core/releases/latest', {
        owner: 'Wajek-Studio',
        repo: 'akunting-core',
        headers: {
            'X-Github-Api-Version': '2022-11-28'
        }
    });

    let asset = latest.data.assets.filter((asset) => asset.name == 'akunting-core.zip')[0] ?? null;
    if(asset != null) {
        let filePath = path + '/' + asset.name;
        console.log("Downloading " + asset.name + '...');
        await downloadAsset(token, asset);

        if(fs.existsSync(filePath)) {
            console.log("Extracting " + asset.name + '...');
            let extractPath = path + '/akunting-core';
            await unzip(filePath, extractPath);
        }
    }
    readline.close();
});