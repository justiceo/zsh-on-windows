import { existsSync, createWriteStream, promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import unzipper from 'unzipper';
import fsExtra from 'fs-extra';

/**
 * Main function to install Zsh on Windows.
 */
export async function installZshOnWindows() {
  console.log("Installing Zsh on Windows...");

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
 * @returns {Promise<string>} The path to the downloaded ZIP file.
 */
export async function downloadZsh() {
  const url = 'https://github.com/romkatv/zsh-bin/releases/download/v5.8.1/zsh-v5.8.1-mingw-w64-x86_64.zip';
  const downloadPath = path.join(__dirname, 'zsh.zip');

  return new Promise((resolve, reject) => {
    console.log("Downloading Zsh...");
    const file = createWriteStream(downloadPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(downloadPath));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Unpacks the downloaded Zsh ZIP file.
 * @param {string} zipPath - The path to the ZIP file.
 * @returns {Promise<string>} The path to the unpacked Zsh files.
 */
export async function unpackZsh(zipPath) {
  const extractPath = path.join(__dirname, 'zsh-extract');
  await fsPromises.mkdir(extractPath, { recursive: true });

  return new Promise((resolve, reject) => {
    console.log("Unpacking Zsh...");
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', () => resolve(extractPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Installs Zsh by copying the necessary files to the Git Bash installation directory.
 * @param {string} zshPath - The path to the unpacked Zsh files.
 * @param {string} gitBashPath - The path to the Git Bash installation.
 */
export async function installZsh(zshPath, gitBashPath) {
  const zshBinPath = path.join(zshPath, 'bin');
  const zshSharePath = path.join(zshPath, 'share');
  const zshLibPath = path.join(zshPath, 'lib');

  const gitUsrPath = path.join(gitBashPath, 'usr');

  console.log("Installing Zsh files...");

  // Copy 'bin' folder
  await fsExtra.copy(zshBinPath, path.join(gitUsrPath, 'bin'), { overwrite: true });

  // Copy 'share' folder
  await fsExtra.copy(zshSharePath, path.join(gitUsrPath, 'share'), { overwrite: true });

  // Copy 'lib' folder
  await fsExtra.copy(zshLibPath, path.join(gitUsrPath, 'lib'), { overwrite: true });
}

// Run the installation
installZshOnWindows();
