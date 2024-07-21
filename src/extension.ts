import * as vscode from 'vscode';
import * as path from 'path';

async function getFilesFromFolder(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
    let files: vscode.Uri[] = [];

    async function readDir(dirUri: vscode.Uri) {
        const dirContents = await vscode.workspace.fs.readDirectory(dirUri);

        for (const [name, type] of dirContents) {
            const uri = vscode.Uri.joinPath(dirUri, name);
            if (type === vscode.FileType.Directory) {
                await readDir(uri); // Recursively read subdirectories
            } else if (type === vscode.FileType.File) {
                files.push(uri);
            }
        }
    }

    await readDir(folderUri);
    return files;
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.copyAsMarkdown', async (lastSelectedFile: vscode.Uri, files: vscode.Uri[]) => {
        console.log("lastSelectedFile", lastSelectedFile);
        console.log("files", files);
        if (!files || files.length === 0) {
            vscode.window.showInformationMessage('No files or folders selected.');
            return;
        }

        let allFiles: vscode.Uri[] = [];

        // Process each item in the selection
        for (const file of files) {
            if ((await vscode.workspace.fs.stat(file)).type === vscode.FileType.Directory) {
                // If it's a folder, get all files inside it recursively
                allFiles.push(...await getFilesFromFolder(file));
            } else {
                // Otherwise, just add the file
                allFiles.push(file);
            }
        }

        if (allFiles.length === 0) {
            vscode.window.showInformationMessage('No files found in the selected folders.');
            return;
        }

        let markdownText = '';

        // Process each file
        for (const file of allFiles) {
            const relativePath = path.relative(vscode.workspace.rootPath || '', file.fsPath);
            const fileName = path.basename(file.fsPath); // Extract filename

            try {
                const content = (await vscode.workspace.fs.readFile(file)).toString();
                const escapedContent = content
                    .replace(/\\`/g, '\\\\`') // Escape backticks
                    .replace(/[\r\n]+$/, ''); // Remove trailing empty lines

                    markdownText += `File: \`${relativePath}\`\n\`\`\`\n${escapedContent}\n\`\`\`\n\n`;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to read file '${fileName}'.`);
                console.error('File read error:', error);
                return;
            }
        }

        try {
            await vscode.env.clipboard.writeText(markdownText);
            vscode.window.showInformationMessage(`Files exported to clipboard as markdown.`);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to write to clipboard.');
            console.error('Clipboard error:', error);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
