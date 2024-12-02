// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { parse } from 'node:path';
import test from 'node:test';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld-sample" is now active!?');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json



	const disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		findClassVariableReferencesInFunctions(editor.document, 'A','haha');
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}

interface ReferenceInfo {
	uri: vscode.Uri;
	range: vscode.Range;
}

// 查找某个类成员变量的引用，并确定其在具体函数内的引用位置
async function findClassVariableReferencesInFunctions(document: vscode.TextDocument, className: string,variableName: string): Promise<void> {
    try {
        // 1. 获取文档中的所有符号（类、函数、变量等）
        let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

		// 找到目标类内symbol
		symbols = symbols.filter(symbol => symbol.name === className && symbol.kind === vscode.SymbolKind.Class).map(symbol => {
			return symbol.children || [];
		})[0];

        // 2. 查找其成员变量的位置
        const targetVariableSymbol = parseVariableSymbols(symbols, variableName);
        if (!targetVariableSymbol) {
            vscode.window.showErrorMessage(`Variable "${variableName}" not found in class.`);
            return;
        }

		const functionSymbols = parseFunctionSymbols(symbols);



		// 4. 找到变量在类内被使用的所有函数位置
		// 这里用vscode.executeReferenceProvider，只能知道reference被使用的位置，找到准确函数可以用tree-sitter代替
		// 这里为了方便直接用函数查找
		const targetVariableReferences = await vscode.commands.executeCommand<ReferenceInfo[]>(
			'vscode.executeReferenceProvider',
			document.uri,  // 目标文档
			targetVariableSymbol.selectionRange.end // cpp一定要用selectionRange.end
		);

		const targetFunctionSymbols = functionSymbols.filter(functionSymbol => variableUseByFunction(functionSymbol, targetVariableReferences));

		console.log('test');


		// // 5. 查找函数的call hierarchy
		for (const reference of targetFunctionSymbols) {
			// 文件是当前打开的文件
			const uri = document.uri;

			// 这里需要用tree sitter找到函数名字的具体位置，这里为了演示方便，直接用void func()这种形式
			// 找不到类的初始化函数，只能找到类的成员函数。这里换vscode.executeReferenceProvider会不会更好点
			const start = new vscode.Position(reference.range.start.line, reference.range.start.character + 5);

			const targetCallHierarchy = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
				'vscode.prepareCallHierarchy',
				uri,
				start);
			
			// 这里要一层层找到所有的调用关系
			for (const item  of targetCallHierarchy) {
				const callHierarchy = await vscode.commands.executeCommand(
					'vscode.provideIncomingCalls',
					item);
				console.log(callHierarchy);	
			}

		
			
		}
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error finding variable references: ${String(error)}`);
    }
}




// 查找目标变量符号
function parseVariableSymbols(symbols: vscode.DocumentSymbol[], symbolName: string): vscode.DocumentSymbol|undefined {
    for (const symbol of symbols) {
        console.log(`Symbol: ${symbol.name == symbol.name}, Kind: ${symbol.kind == vscode.SymbolKind.Field}`);
		if (symbol.name == symbolName && symbol.kind == vscode.SymbolKind.Field) {
			return symbol;
		}
        // 如果该符号有子符号，递归解析
        if (symbol.children && symbol.children.length > 0) {
            console.log(`Parsing children of ${symbol.name}`);
            return parseVariableSymbols(symbol.children, symbolName);  // 递归调用解析子符号
        }
    }
	return undefined;
}

function parseFunctionSymbols (symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
	const functions: vscode.DocumentSymbol[] = [];
	for (const symbol of symbols) {
		if (symbol.kind === vscode.SymbolKind.Method) {
			functions.push(symbol);
		}
	}
	return functions;
}


function variableUseByFunction(functionSymbol: vscode.DocumentSymbol, variableReferences: ReferenceInfo[]): boolean {
	return variableReferences.some(ref => {
		return ref.range.start.line >= functionSymbol.range.start.line && ref.range.end.line <= functionSymbol.range.end.line;
	});
}

