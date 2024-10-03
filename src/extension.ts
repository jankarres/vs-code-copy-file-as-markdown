import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.copyActiveFileAsMarkdown', copyActiveFileAsMarkdown),
        vscode.commands.registerCommand('extension.copyExplorerSelectedFilesAsMarkdown', copyExplorerSelectedFilesAsMarkdown)
    );
}

async function copyActiveFileAsMarkdown() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    const document = editor.document;
    const relativePath = vscode.workspace.asRelativePath(document.uri);
    const content = document.getText();

    const markdownText = createMarkdownForFile(relativePath, content);
    await copyToClipboard(markdownText, 'Active file exported to clipboard as markdown.');
}

async function copyExplorerSelectedFilesAsMarkdown(lastSelectedFile: vscode.Uri, files: vscode.Uri[]) {
    if (!files || files.length === 0) {
        vscode.window.showErrorMessage('No files or folders selected.');
        return;
    }

    const allFiles = await getAllFiles(files);

    if (allFiles.length === 0) {
        vscode.window.showErrorMessage('No files found in the selected folders.');
        return;
    }

    const markdownText = await createMarkdownForFiles(allFiles);
    await copyToClipboard(markdownText, 'Files exported to clipboard as markdown.');
}

async function getAllFiles(items: vscode.Uri[]): Promise<vscode.Uri[]> {
    const allFiles: vscode.Uri[] = [];

    for (const item of items) {
        if ((await vscode.workspace.fs.stat(item)).type === vscode.FileType.Directory) {
            allFiles.push(...await getFilesFromFolder(item));
        } else {
            allFiles.push(item);
        }
    }

    return allFiles;
}

async function getFilesFromFolder(folder: vscode.Uri): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    const entries = await vscode.workspace.fs.readDirectory(folder);

    for (const [name, type] of entries) {
        const fullPath = vscode.Uri.joinPath(folder, name);
        if (type === vscode.FileType.Directory) {
            files.push(...await getFilesFromFolder(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function createMarkdownForFile(relativePath: string, content: string): string {
    const escapedContent = escapeContent(content);
    return `File: \`${relativePath}\`\n\`\`\`\n${escapedContent}\n\`\`\`\n\n`;
}

async function createMarkdownForFiles(files: vscode.Uri[]): Promise<string> {
    let markdownText = '';

    for (const file of files) {
        const relativePath = vscode.workspace.asRelativePath(file);
        try {
            const content = (await vscode.workspace.fs.readFile(file)).toString();
            markdownText += createMarkdownForFile(relativePath, content);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read file '${path.basename(file.fsPath)}'.`);
            console.error('File read error:', error);
        }
    }

    return markdownText;
}

function escapeContent(content: string): string {
    return content
        .replace(/\`/g, '\\`') // Escape backticks
        .replace(/[\r\n]+$/, ''); // Remove trailing empty lines
}

async function copyToClipboard(text: string, successMessage: string) {
    try {
        await vscode.env.clipboard.writeText(text);
        vscode.window.setStatusBarMessage(successMessage, 5000);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to write to clipboard.');
        console.error('Clipboard error:', error);
    }
}

export function deactivate() {}