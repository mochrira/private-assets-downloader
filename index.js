const fetch = require('node-fetch-commonjs');
const { Octokit } = require('octokit');
const exec = require('child_process').exec;
const fs = require('fs');
const decompress = require('decompress');
const path = require('path');
const { program } = require('commander');

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

async function main() {
    try {
        program
        .name('private-assets-downloader')
        .description('CLI to download private .zip assets from github repository then extract it')
        .requiredOption('-o, --owner <char>', 'Owner of repository')
        .requiredOption('-r, --repository <char>', 'Repository name')
        .requiredOption('-a, --asset <char>', 'Asset filename')
        .requiredOption('-d, --dest <char>', 'Destination directory')
        .option('-v, --version <char>', 'Version, default: latest, Example: tags/1.7.3', 'latest')
        .option('-t, --tmp <char>', 'Tmp directory, default: .tmp', '.tmp');

        program.parse();

        let owner = program.opts().owner;
        let repository = program.opts().repository;
        let asset = program.opts().asset;
        let tmp = program.opts().tmp;
        let version = program.opts().version;

        let dest = program.opts().dest;
        let extractDir = path.resolve(process.cwd(), dest);
        if(!fs.existsSync(extractDir)) throw "Destination directory not exists";

        let token = await promptToken();
        console.log("Gathering information...");
        
        const octokit = new Octokit({
            auth: token,
            request: { fetch }
        });

        let release = await octokit.request('GET /repos/' + owner + '/' + repository + '/releases/' + version, {
            owner: owner,
            repo: repository,
            headers: {
                'X-Github-Api-Version': '2022-11-28'
            }
        });

        let assetDetails = release.data.assets.filter((a) => a.name == asset)[0] ?? null;
        if(assetDetails == null) throw asset + " not found on speficied version (" + version + ")";

        let tmpDir = path.resolve(process.cwd(), tmp);
        if(fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
        fs.mkdirSync(tmpDir);

        let output = path.resolve(tmpDir, assetDetails.name);
        console.log("Downloading " + assetDetails.name + '...');
        await downloadAsset(token, assetDetails, output);
        if(!fs.existsSync(output)) throw "Output file not created. It may permission problem";

        console.log("Extracting " + assetDetails.name + '...');
        await decompress(output, extractDir);

        fs.rmSync(tmpDir, {recursive: true});
        console.log("Done");
    } catch(e) {
        console.log(e);
    }
};

main();