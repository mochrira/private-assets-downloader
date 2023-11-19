const fetch = require('node-fetch-commonjs');
const { Octokit } = require('octokit');
const exec = require('child_process').exec;
const fs = require('fs');
const decompress = require('decompress');

function downloadAsset(token, asset, output) {
    return new Promise((resolve, reject) => {
        exec('curl -L ' + 
            '-H "Accept: application/octet-stream" ' + 
            '-H "Authorization: Bearer ' + token + '" ' + 
            '-H "X-GitHub-Api-Version: 2022-11-28" ' + 
            'https://api.github.com/repos/Wajek-Studio/akunting-core/releases/assets/' + asset.id + ' ' +
            '-o ' + output
        , function (e) {
            if(e != null) {
                reject(e); return;
            }
            resolve(e);
        });
    });
}

async function promptToken() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        readline.question('Github Token : ', async (token) => {
            resolve(token);
            readline.close();
        });
    });
}

module.exports = async (options) => {
    let owner = options.owner;
    if(!owner) throw "Undefined owner";

    let repo = options.repo;
    if(!repo) throw "Undefined repository";

    let assetFileName = options.assetFileName;
    if(!assetFileName) throw "Undefined asset file name";

    let tag = options.tag;
    if(!tag) throw "Undefined tag";

    let tmpDir = options.tmpDir;
    if(!tmpDir) throw "Undefined temporary directory";

    let extractDir = options.extractDir;
    if(!extractDir) throw "Undefined extract directory";

    let token = await promptToken();

    console.log("Gathering information...");
    
    const octokit = new Octokit({
        auth: token,
        request: { fetch }
    });

    let release = await octokit.request('GET /repos/Wajek-Studio/akunting-core/releases/' + tag, {
        owner: owner,
        repo: repo,
        headers: {
            'X-Github-Api-Version': '2022-11-28'
        }
    });
    let asset = release.data.assets.filter((asset) => asset.name == assetFileName)[0] ?? null;
    if(asset == null) throw "Release with specified tag and asset filename not found";

    if(fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir);

    let output = tmpDir + '/' + asset.name;
    console.log("Downloading " + asset.name + '...');
    await downloadAsset(token, asset, output);
    if(!fs.existsSync(output)) throw "Output file not detected. It may permission problem";

    if(fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true});
    fs.mkdirSync(extractDir);

    console.log("Extracting " + asset.name + '...');
    await decompress(output, extractDir);
    console.log("Done");
}