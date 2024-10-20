import { existsSync, createWriteStream, promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import followRedirects from 'follow-redirects';
import * as tar from 'tar';
import fsExtra from 'fs-extra';
import { execSync } from 'child_process';

const { https } = followRedirects;
// Define __dirname for compatibility
const __dirname = path.resolve();

/**
 * Main function to install Zsh on Windows.
 */
export async function installZshOnWindows() {
  console.log("Installing Zsh on Windows...");

  if (!isRunningAsAdmin()) {
    console.log("Not running as admin. Attempting to relaunch as admin...");
    relaunchAsAdmin();
    return;
  }

  const gitBashPath = await isGitBashInstalled();
  if (!gitBashPath) {
    console.log("Git Bash is not installed. Please install it first.");
    return;
  }
  console.log("Git Bash found at:", gitBashPath);

  try {
    const zipPath = await downloadZsh();
    console.log("Downloaded Zsh to:", zipPath);

    const zshPath = await unpackZsh(zipPath);
    console.log("Unpacked Zsh to:", zshPath);

    await installZsh(zshPath, gitBashPath);
    console.log('Zsh installed successfully.');
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

/**
 * Checks if the script is running with administrative privileges.
 * @returns {boolean} True if running as admin, otherwise false.
 */
function isRunningAsAdmin() {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Relaunches the current script with administrative privileges.
 */
function relaunchAsAdmin() {
  const scriptPath = process.argv[1];
  const args = process.argv.slice(2).join(' ');
  execSync(`powershell -Command "Start-Process 'node' -ArgumentList '${scriptPath} ${args}' -Verb RunAs"`, { stdio: 'ignore' });
}

/**
 * Checks if Git Bash is installed by looking for 'git-bash.exe' in common locations.
 * @returns {string|null} The path to Git Bash if installed, otherwise null.
 */
export async function isGitBashInstalled() {
  const gitBashPaths = [
    'C:\\Program Files\\Git',
    'C:\\Program Files (x86)\\Git',
    process.env['GIT_INSTALL_ROOT'],
  ].filter(Boolean);

  for (const gitPath of gitBashPaths) {
    if (existsSync(path.join(gitPath, 'git-bash.exe'))) {
      return gitPath;
    }
  }
  return null;
}

/**
 * Downloads the precompiled Zsh binaries for Windows.
 * @returns {Promise<string>} The path to the downloaded tar.gz file.
 */
export async function downloadZsh() {
  const url = 'https://github.com/romkatv/zsh-bin/releases/download/v6.1.1/zsh-5.8-cygwin_nt-10.0-x86_64.tar.gz';
  const downloadPath = path.join(__dirname, 'zsh.tar.gz');

  return new Promise((resolve, reject) => {
    console.log("Downloading Zsh...");
    const file = createWriteStream(downloadPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file. HTTP Status Code: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', async () => {
        file.close();
        try {
          const stats = await fsPromises.stat(downloadPath);
          if (stats.size > 1024 * 1024) { // Check if size > 1MB
            resolve(downloadPath);
          } else {
            reject(new Error('Downloaded file is too small, download may have failed.'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      fs.unlink(downloadPath, () => reject(err)); // Delete the file asynchronously
    });
  });
}

/**
 * Unpacks the downloaded Zsh tar.gz file.
 * @param {string} tarGzPath - The path to the tar.gz file.
 * @returns {Promise<string>} The path to the unpacked Zsh files.
 */
export async function unpackZsh(tarGzPath) {
  const extractPath = path.join(__dirname, 'zsh-extract');
  await fsPromises.mkdir(extractPath, { recursive: true });

  console.log("Unpacking Zsh...");
  try {
    await tar.x({
      file: tarGzPath,
      cwd: extractPath,
    });
    return extractPath;
  } catch (err) {
    throw err;
  }
}

/**
 * Installs Zsh by copying the necessary files to the Git Bash installation directory.
 * @param {string} zshPath - The path to the unpacked Zsh files.
 * @param {string} gitBashPath - The path to the Git Bash installation.
 */
export async function installZsh(zshPath, gitBashPath) {
  const zshBinPath = path.join(zshPath, 'bin');
  const zshSharePath = path.join(zshPath, 'share');

  const gitUsrPath = path.join(gitBashPath, 'usr');

  console.log("Installing Zsh files...");

  // Copy 'bin' folder
  await fsExtra.copy(zshBinPath, path.join(gitUsrPath, 'bin'), { overwrite: true });

  // Copy 'share' folder
  await fsExtra.copy(zshSharePath, path.join(gitUsrPath, 'share'), { overwrite: true });
}
