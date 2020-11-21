// @ts-nocheck
import { verify } from 'crypto';
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
	Hover,
	Position
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import * as loader from './control'
import { model } from './docs'
import { getTargetLine, getAllTheModuleFolders, checkIsTrongateProject, getViewFiles, isFalseLine, parseModule, extractFunctions, hasLoadedModule } from './utils/index'

let GLOBAL_SETTINGS = {
	allModules: [],
	isTrongateProject: false,
	projectLocation: null,
	parser: null,
	reader: null
}

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
	console.log('======================================')
	console.log(params)
	console.log('======================================')
	// let projectPath = params.workspaceFolders[0].uri.fsPath

	const engine = require("php-parser");

	const DocParser = require('doc-parser');
	const reader = new DocParser();

	const parser = new engine({
		parser: {
			extractDoc: true,
			php7: true,
		},
		ast: {
			withPositions: true,
		},
	});

	let projectPath = params.rootPath
	if (checkIsTrongateProject(projectPath)) {
		// Update GLOBAL_SETTINGS
		GLOBAL_SETTINGS.projectLocation = projectPath
		GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(projectPath)]
		GLOBAL_SETTINGS.parser = parser;
		GLOBAL_SETTINGS.reader = reader;
	}
	loader.loader.root = URI.parse(params.rootUri);
	console.log(loader.loader.root)
	//Seems here is the magic starting to happen...
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: TextDocumentSyncKind.Full,
			// documentSymbolProvider:true,
			definitionProvider :true,
			hoverProvider: true,
			signatureHelpProvider: {
				triggerCharacters: ['(', '\'', '"'],
				retriggerCharacters: [',']
			},
			completionProvider: {
				resolveProvider: false,
				triggerCharacters: ['>', '\'', '"'],
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
});

// This handler provides the initial list of the completion items.


connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

		console.log('--------------------------------------')
		console.log(GLOBAL_SETTINGS.allModules)
		console.log('--------------------------------------')

		/** ROAD MAP
		 * 
		 *  ' or " or > to trigger auto complete 
		 * 	1.  $this->module(')      =>    show all the modules with module's folder (not considering super module at the moment)
		 *									but we would like to include it in the future 
			1&.						  =>	show view files if possible..
		 * 	2.  $this->xxxx-> 		  =>	show all the puclic functions within this module
		 * 	3.  Modules::run(')		  =>	show all the module first, and then when user types / , we display the public functions with this module
		 * 	Modules:run('xxxx/xxxxx')
		 * 
		 * 
		 */


		/**
		 * if it is not a Trongate project then don't do anything,
		 * if there is no module within the modules folder then don't do anything
		 */
		if (!GLOBAL_SETTINGS.projectLocation) return
		if (GLOBAL_SETTINGS.allModules.length === 0) return

		// ===> Load up module names from the modules folder <===
		const targetLineNumber = _textDocumentPosition.position.line
		const documentURI = _textDocumentPosition.textDocument.uri
		const targetLine = getTargetLine(documents, targetLineNumber, documentURI)
		if (isFalseLine(targetLine)) return 	// We do not active intellisense on a comment line

		const loadModuleMatch = /\$this->module\((''|"")\)/
		const loadViewModuleMatch = /\$data\[('view_module'|"view_module")\]\s*=\s*(''|"")/
		if (targetLine.match(loadModuleMatch) || targetLine?.match(loadViewModuleMatch)) {
			GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(GLOBAL_SETTINGS.projectLocation)]
			return GLOBAL_SETTINGS.allModules.map(item => {
				return {
					label: item,
					kind: CompletionItemKind.Module
				}
			})
		}

		// ===> Load up view files <===
		const viewFileMatch = /\$data\[('view_file'|"view_file")\]\s*=\s*(''|"")/
		// const viewFileMatch = /(\$data\[('view_file'|"view_file")\]\s*=\s*(''|""))|\$this->view\((''|"")\)/

		if (targetLine?.match(viewFileMatch)) {
			// look up line by line til end or find the module name
			const viewFiles = getViewFiles(documents, targetLineNumber, GLOBAL_SETTINGS.projectLocation, documentURI)
			if (viewFiles) {
				return viewFiles.map(item => {
					return {
						label: item,
						kind: CompletionItemKind.File
					}
				})
			}
		}

		// ===> Load up functions and properties from another module if user does -> <===
		const loadUpFunctionMatch = /\$this->\w+->/
		/** ==> Issue with loadUpFunctionMatch (Fixed) <==
		 * The match has to be exactly the same pattern
		 * otherwise it would cause some issue, so,
		 * to solve it, we check if there is anything after the second ->
		 */

		if (targetLine?.match(loadUpFunctionMatch) && targetLine.split('->')[2] === '') {

			/**
			 * When there is a regex match, we first look up to find $this->module('xxxxx') to see if
			 * the user has already loaded another module or not
			 * as $this->module('') is equivlent to require_once
			 */
			const verifyingModuleName = targetLine.split('->')[1];
			if (!hasLoadedModule(documents, targetLineNumber, documentURI, verifyingModuleName)) return

			// update the modules first to see if there is any change
			GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(GLOBAL_SETTINGS.projectLocation)]
			const match = targetLine.match(loadUpFunctionMatch)[0]
			const result = parseModule(match, GLOBAL_SETTINGS)

			if (result) {
				console.log('oh yeah!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
				console.log(result)
				console.log('oh yeah!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
				// return the result if there is any match
				return result.map(item => {
					if (item.length === 0) return []

					return {
						label: item.funcNames,
						kind: CompletionItemKind.Function,
						documentation: item.docs,
						// detail: item.shortDoc,
						detail: item.params
					}
				})
			}
		}
	}
);

connection.onSignatureHelp((_textDocumentPosition: TextDocumentPositionParams): SignatureHelp => {

	if (!GLOBAL_SETTINGS.projectLocation) return
	if (GLOBAL_SETTINGS.allModules.length === 0) return

	try {
		const targetLine = getTargetLine(documents, _textDocumentPosition.position.line, _textDocumentPosition.textDocument.uri)
		const regexForMatch = /\s*()\$this\->\w+->\w+/

		if (isFalseLine(targetLine)) return 	// We do not active intellisense on a comment line

		const match = targetLine.match(regexForMatch)[0]
		if (!match) return null

		const result = parseModule(match, GLOBAL_SETTINGS)

		if (result) {

			const functionName = match.split('->')[2]
			// console.log('############')
			// console.log(functionName)
			// console.log('############')
			const functionSignature = result.filter(item => item.funcNames === functionName)[0]

			if (functionSignature) {
				return {
					signatures: [{ label: functionSignature.params, documentation: functionSignature.docs }],
					activeSignature: 0,
					activeParameter: null
				}
			}
		}

		return
	} catch (error) {
		console.log(error)
	}
});

connection.onHover((_textDocumentPosition: TextDocumentPositionParams): Hover => {

	// console.log('=====================================')
	// console.log(_textDocumentPosition)
	// console.log('=====================================')

	try {
		if (!GLOBAL_SETTINGS.projectLocation) return
		if (GLOBAL_SETTINGS.allModules.length === 0) return

		const targetLineNumber = _textDocumentPosition.position.line
		const documentURI = _textDocumentPosition.textDocument.uri
		const targetChar = _textDocumentPosition.position.character
		const targetLine = getTargetLine(documents, targetLineNumber, documentURI)
		const regexMatch = /\$this\->\w+->\w+/
		const match = targetLine.match(regexMatch)
		if (!match) return

		const verifyingModuleName = targetLine?.split('->')[1]
		// if it can match the pattern, let's check if the module has been loaded before
		if (!hasLoadedModule(documents, targetLineNumber, documentURI, verifyingModuleName)) return
		// const loadedUpModule = match[0]

		// update the modules first to see if there is any change
		GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(GLOBAL_SETTINGS.projectLocation)]

		const allFunctions = parseModule(targetLine, GLOBAL_SETTINGS)
		const callingFuncMatch = /\$this\->\w+->(\w+\1)/
		const onHovering = targetLine?.match(callingFuncMatch)[1] // get the function name eg: $this->store_items->index(), this will get index

		const findPositionMatch = /->\w*\(/
		const startPos = targetLine?.match(findPositionMatch).index + 2
		const endPos = startPos + onHovering?.length

		if (targetChar >= startPos && targetChar <= endPos) {
			const onHoverResult = allFunctions.filter(item => item.funcNames === onHovering)

			if (onHoverResult.length > 0) {
				return {
					contents: {
						language: 'markdown',
						value: `${onHoverResult[0].shortDocs}\n\n${onHoverResult[0].docs}`
					}
				}
			}
		}
	} catch (error) {
		console.log(error)
	}
})

/**
 * Jump to defination
 */
connection.onDefinition((_textDocumentPosition:TextDocumentPositionParams):Location=>{

	try {
		if (!GLOBAL_SETTINGS.projectLocation) return
		if (GLOBAL_SETTINGS.allModules.length === 0) return
	
		const targetLineNumber = _textDocumentPosition.position.line
		const documentURI = _textDocumentPosition.textDocument.uri
		const targetChar = _textDocumentPosition.position.character
		const targetLine = getTargetLine(documents, targetLineNumber, documentURI)
		const regexMatch = /\$this\->\w+->\w+/
		const match = targetLine.match(regexMatch)
		if (!match) return

		const verifyingModuleName = targetLine?.split('->')[1]
		// if it can match the pattern, let's check if the module has been loaded before
		if (!hasLoadedModule(documents, targetLineNumber, documentURI, verifyingModuleName)) return
		// const loadedUpModule = match[0]

		// update the modules first to see if there is any change
		GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(GLOBAL_SETTINGS.projectLocation)]

		const allFunctions = parseModule(targetLine, GLOBAL_SETTINGS)
		// const documentPosition = URI.parse(allFunctions.document_uri)
		const documentPosition = encodeURI(allFunctions.document_uri)

		console.log('===================')
		console.log(documentPosition)
		console.log('===================')

		const callingFuncMatch = /\$this\->\w+->(\w+\1)/
		const onHovering = targetLine?.match(callingFuncMatch)[1] // get the function name eg: $this->store_items->index(), this will get index

		const findPositionMatch = /->\w*\(/
		const startPos = targetLine?.match(findPositionMatch).index + 2
		const endPos = startPos + onHovering?.length

		if (targetChar >= startPos && targetChar <= endPos) {
			const onHoverResult = allFunctions.filter(item => item.funcNames === onHovering)

			if (onHoverResult.length > 0) {
				console.log('triggering the onDefinition')
				console.log(onHoverResult);
				console.log('triggering the onDefinition')

				return {
					uri: documentPosition,
					range: onHoverResult[0].range
				}
			}
		}
	} catch (error) {
		console.log(error)	
	}
});

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
