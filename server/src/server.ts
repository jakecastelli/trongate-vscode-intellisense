// @ts-nocheck
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Location,
	SymbolInformation,
	SignatureHelp,
	signatureHelpProvider,
	Hover
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import * as loader from './control'
import { model } from './docs'
import { getTargetLine } from './utils/index'

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. 
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const availableList = {
	'model': model,
}

// Document listen ---------

// --------------- no idea what this junk is..

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

// --------------- no idea what this junk is..

connection.onInitialize((params: InitializeParams) => {
	loader.loader.root = URI.parse(params.rootUri);
	console.log(loader.loader.root)
	//Seems here is the magic starting to happen...
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync:TextDocumentSyncKind.Full,
			// documentSymbolProvider:true,
			// definitionProvider :true,
			hoverProvider : true,
			signatureHelpProvider : {
				triggerCharacters: [ '('],
				retriggerCharacters: [ ',' ]
			},
			completionProvider: {
				resolveProvider: false,
				triggerCharacters:['>', '\''],
				// leave :: for another day
				// triggerCharacters:['>',':']
			},
		}
	}

	// let capabilities = params.capabilities;

	// // Does the client support the `workspace/configuration` request?
	// // If not, we fall back using global settings.
	// hasConfigurationCapability = !!(
	// 	capabilities.workspace && !!capabilities.workspace.configuration
	// );
	// hasWorkspaceFolderCapability = !!(
	// 	capabilities.workspace && !!capabilities.workspace.workspaceFolders
	// );
	// hasDiagnosticRelatedInformationCapability = !!(
	// 	capabilities.textDocument &&
	// 	capabilities.textDocument.publishDiagnostics &&
	// 	capabilities.textDocument.publishDiagnostics.relatedInformation
	// );

	// const result: InitializeResult = {
	// 	capabilities: {
	// 		textDocumentSync: TextDocumentSyncKind.Incremental,
	// 		// Tell the client that this server supports code completion.
	// 		completionProvider: {
	// 			resolveProvider: true
	// 		}
	// 	}
	// };
	// if (hasWorkspaceFolderCapability) {
	// 	result.capabilities.workspace = {
	// 		workspaceFolders: {
	// 			supported: true
	// 		}
	// 	};
	// }
	// return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	// validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.


connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

	/**
	 *  ' or " or > to trigger auto complete 
	 * 	1.  $this->module(')      =>    show all the modules with module's folder (not considering super module at the moment)
	 *									but we would like to include it in the future 
	 * 	2.  $this->xxxx-> 		  =>	show all the puclic functions within this module
	 * 	3.  Module::run(')		  =>	show all the module first, and then when user types / , we display the public functions with this module
	 * 									or we directly concat module and function in the format of xxx/xxx and display to the user
	 */

	// console.log('it is working!')

	// if (_textDocumentPosition.textDocument.uri.indexOf(loader.loader.root.toString())<0) return [];

	// let lines = documents.get(_textDocumentPosition).getText().split('\n');
	// console.log(lines)

	// let targetLine = lines[_textDocumentPosition.position.line]

	// const targetLine = getTargetLine(documents, _textDocumentPosition)
	// console.log(targetLine)

	// console.log('<------------')
	// console.log(targetLine.match(/\s*()\$this\->/))
	// console.log('------------->')
	// if (targetLine.match(/\s*()\$this\->$/)) {
	// 	return Object.keys(availableList).map( item => {
	// 		return {
	// 			label: item,
	// 			kind: CompletionItemKind.Module
	// 		}
	// 	})
	// }

	// This one is for model
	// if (targetLine.match(/\s*()\$this\->model->/)) {

	// 	return model.map( item => {
	// 		return {
	// 			label: item.label,
	// 			kind: CompletionItemKind.Function,
	// 			data: item.data,
	// 			documentation: item.doc,
	// 			detail: item.shortDoc
	// 		}
	// 	})
	// }
	}
);

connection.onSignatureHelp((_textDocumentPosition:TextDocumentPositionParams):SignatureHelp=>{
	let temp;
	
	// Implement logic here

	// let lines = documents.get(_textDocumentPosition.textDocument.uri).getText().split('\n');
	// console.log(lines)
	// let targetLine = lines[_textDocumentPosition.position.line]
	// let targetLine = lines[_textDocumentPosition.position.line]
	const targetLine = getTargetLine(documents, _textDocumentPosition)
	const regexForMatch = /\s*()\$this\->\w*->\w*/
	const match = targetLine.match(regexForMatch)
	if (!match) return null

	// Extract called class name
	const className = match[0].split('->')[1]
	console.log(className)


	if (Object.keys(availableList).find( item => item === className)) {
		// Extract function name
		const functionName = match[0].split('->')[2]
		temp = availableList[className].find( item => item.label === functionName)
	}
	if (!temp) return null


	return {
		signatures: [ {label: temp.signature, documentation: temp.doc} ],
			activeSignature: 0,
			activeParameter: null
	}

	// if (position.textDocument.uri.indexOf(loader.loader.root.toString())<0) return null;
	// else return mLoader.signature(
	// 	position,
	// 	documents.get(position.textDocument.uri).getText());
});

connection.onHover((_textDocumentPosition:TextDocumentPositionParams):Hover=>{

	// If the user hover over the function, then we show them the signature and docs
	let temp;
	
	// Implement logic here

	let lines = documents.get(_textDocumentPosition.textDocument.uri).getText().split('\n');
	console.log(lines)
	let targetLine = lines[_textDocumentPosition.position.line]
	const regexForMatch = /\s*()\$this\->\w*->\w*/
	const match = targetLine.match(regexForMatch)
	if (!match) return null

	// Extract called class name
	const className = match[0].split('->')[1]
	console.log(className)


	if (Object.keys(availableList).find( item => item === className)) {
		// Extract function name
		const functionName = match[0].split('->')[2]
		temp = availableList[className].find( item => item.label === functionName)
	}
	if (!temp) return null

	return {contents: {
		language: 'markdown',
		value: `${temp.signature}\n\n${temp.doc}
		`
	}, }

	// if (position.textDocument.uri.indexOf(loader.loader.root.toString())<0) return null;
})

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
