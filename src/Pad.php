<?php 

namespace Selvi;

use Selvi\Output\Response;
use Console_CommandLine;

class Pad {

    private static function getReleaseInfo($token, $owner, $repository, $version, $email) {
        echo "Gathering information...\n";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.github.com/repos/'.$owner.'/'.$repository.'/releases/'.$version);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: '.$email,
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $token,
            'X-GitHub-Api-Version: 2022-11-28'
        ]);
        $json = curl_exec($ch);
        curl_close($ch);
        return json_decode($json, true);
    }

    private static function rmdir($dirPath) {
        if (is_dir($dirPath)) {
            $files = scandir($dirPath);
            foreach ($files as $file) {
               if ($file !== '.' && $file !== '..') {
                  $filePath = $dirPath . '/' . $file;
                  if (is_dir($filePath)) {
                     self::rmdir($filePath);
                  } else {
                     unlink($filePath);
                  }
               }
            }
            rmdir($dirPath);
         }
    }

    public static function run() {
        $parser = new Console_CommandLine([
            'description' => 'zip given files using the php zip module.'
        ]);

        $parser->addOption('owner', [
            'short_name' => '-o',
            'long_name' => '--owner',
            'description' => 'Owner of repository',
            'action' => 'StoreString'
        ]);

        $parser->addOption('repository', [
            'short_name' => '-r',
            'long_name' => '--repository',
            'description' => 'Repository name',
            'action' => 'StoreString'
        ]);

        $parser->addOption('asset', [
            'short_name' => '-a',
            'long_name' => '--asset',
            'description' => 'Asset filename',
            'action' => 'StoreString'
        ]);

        $parser->addOption('dest', [
            'short_name' => '-d',
            'long_name' => '--dest',
            'description' => 'Destination directory',
            'action' => 'StoreString'
        ]);

        $parser->addOption('version', [
            'short_name' => '-v',
            'long_name' => '--version',
            'description' => 'Version, default:latest, Example: tags/1.7.3',
            'action' => 'StoreString',
            'default' => 'latest'
        ]);

        $parser->addOption('tmp', [
            'short_name' => '-t',
            'long_name' => '--tmp',
            'description' => 'Temporary directory, default: .tmp',
            'action' => 'StoreString',
            'default' => '.tmp'
        ]);

        $parser->addOption('email', [
            'short_name' => '-e',
            'long_name' => '--email',
            'description' => 'Email of account',
            'action' => 'StoreString',
            'default' => null
        ]);

        $parser->addOption('credential', [
            'short_name' => '-c',
            'long_name' => '--credential',
            'description' => 'Credential file path',
            'action' => 'StoreString',
            'default' => null
        ]);

        try {
            $options = $parser->parse()->options;
            if(!isset($options['owner'])) throw new \Exception("Owner not specified");
            if(!isset($options['repository'])) throw new \Exception("Repository name not specified");
            if(!isset($options['asset'])) throw new \Exception("Asset filename not specified");
            if(!isset($options['dest'])) throw new \Exception("Destination directory not specified");

            $owner = $options['owner'];
            $repository = $options['repository'];
            $asset = $options['asset'];
            $tmp = $options['tmp'];
            $version = $options['version'];
            $email = $options['email'];

            $extractDir = getcwd().'/'.$options['dest'];
            if(!is_dir($extractDir)) throw new \Exception("Destination directory not exists");

            if(!isset($email)) $email = readline('Your email : ');

            if(isset($options['credential'])) {
                if(!is_file($options['credential'])) throw new \Exception("Credential file not found");
                $token = file_get_contents($options['credential']);
            } else {
                $token = readline('Github Token : ');
            }
            $release = self::getReleaseInfo($token, $owner, $repository, $version, $email);

            $assetDetails = array_values(array_filter($release['assets'], function ($v) use ($asset) { return $v['name'] == $asset; }))[0] ?? null;
            if(!isset($assetDetails)) throw new \Exception($asset." not found on specified version (".$version.")");

            $tmpDir = getcwd().'/'.$tmp;
            if(is_dir($tmpDir)) self::rmdir($tmpDir);
            mkdir($tmpDir, 0755, true);

            $output = $tmpDir.'/'.$assetDetails['name'];
            echo "Downloading ".$assetDetails['name']."...\n";
            $fh = fopen($output, 'w+');
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://api.github.com/repos/Wajek-Studio/akunting-core/releases/assets/'.$assetDetails['id']);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
            curl_setopt($ch, CURLOPT_FILE, $fh);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'User-Agent: mochrira@gmail.com',
                'Accept: application/octet-stream',
                'Authorization: Bearer ' . $token,
                'X-GitHub-Api-Version: 2022-11-28'
            ]);
            curl_exec($ch);
            curl_close($ch);
            fclose($fh);
            if(!is_file($output)) throw new \Exception("Output file not created. It may permission problem on tmp directory");

            echo "Extracting ".$assetDetails['name']."...\n";
            $zip = new \ZipArchive();
            $res = $zip->open($output);
            if($res === true) {
                self::rmdir($extractDir);
                mkdir($extractDir);
                $zip->extractTo($extractDir);
                $zip->close();
            }

            self::rmdir($tmpDir);
            return new Response('Done.');
        } catch(\Exception $e) {
            $parser->displayError($e->getMessage());
        }
    }

}