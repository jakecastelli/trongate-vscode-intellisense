// @ts-nocheck
import { verify } from "crypto";
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
  Position,
} from "vscode-languageserver";

import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import * as loader from "./control";
import { model } from "./docs";
import {
  getTargetLine,
  getAllTheModuleFolders,
  checkIsTrongateProject,
  getViewFiles,
  isFalseLine,
  parseModule,
  extractFunctions,
  hasLoadedModule,
  autoCompele,
  functionSignature,
  functionHover,
  functionOnDefinition
} from "./utils/index";

let GLOBAL_SETTINGS = {
  allModules: [],
  isTrongateProject: false,
  projectLocation: null,
  parser: null,
  reader: null,
};

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const availableList = {
  model: model,
};

// Document listen ---------

// --------------- no idea what this junk is..

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

// --------------- no idea what this junk is..

connection.onInitialize((params: InitializeParams) => {
  console.log("======================================");
  console.log(params);
  console.log("======================================");
  // let projectPath = params.workspaceFolders[0].uri.fsPath

  const engine = require("php-parser");

  const DocParser = require("doc-parser");
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

  let projectPath = params.rootPath;
  if (checkIsTrongateProject(projectPath)) {
    // Update GLOBAL_SETTINGS
    GLOBAL_SETTINGS.projectLocation = projectPath;
    GLOBAL_SETTINGS.allModules = [...getAllTheModuleFolders(projectPath)];
    GLOBAL_SETTINGS.parser = parser;
    GLOBAL_SETTINGS.reader = reader;
  }
  loader.loader.root = URI.parse(params.rootUri);
  console.log(loader.loader.root);
  //Seems here is the magic starting to happen...
  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: TextDocumentSyncKind.Full,
      // documentSymbolProvider:true,
      definitionProvider: true,
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", "'", '"'],
        retriggerCharacters: [","],
      },
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [">", "'", '"'],
        // leave :: for another day
        // triggerCharacters:['>',':']
      },
    },
  };

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
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
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

connection.onDidChangeConfiguration((change) => {
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
      section: "languageServerExample",
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  // validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
});

// This handler provides the initial list of the completion items.

connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    console.log("--------------------------------------");
    console.log(GLOBAL_SETTINGS.allModules);
    console.log("--------------------------------------");

    /** ROAD MAP
		 * 
		 *  ' or " or > to trigger auto complete 
		 * 	1.  $this->module('')     =>    show all the modules with module's folder (not considering super module at the moment)
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
    try {
      if (!GLOBAL_SETTINGS.projectLocation) return;
      if (GLOBAL_SETTINGS.allModules.length === 0) return;
      GLOBAL_SETTINGS["documents"] = documents;
      GLOBAL_SETTINGS["_textDocumentPosition"] = _textDocumentPosition;

      return autoCompele(GLOBAL_SETTINGS);
    } catch (error) {
      console.log(error);
    }
  }
);

connection.onSignatureHelp(
  (_textDocumentPosition: TextDocumentPositionParams): SignatureHelp => {
    if (!GLOBAL_SETTINGS.projectLocation) return;
    if (GLOBAL_SETTINGS.allModules.length === 0) return;

    try {
		GLOBAL_SETTINGS['documents'] = documents
		GLOBAL_SETTINGS['_textDocumentPosition'] = _textDocumentPosition
		return functionSignature(GLOBAL_SETTINGS)
    } catch (error) {
      console.log(error);
    }
  }
);

connection.onHover(
  (_textDocumentPosition: TextDocumentPositionParams): Hover => {
    // console.log('=====================================')
    // console.log(_textDocumentPosition)
    // console.log('=====================================')

    try {
      if (!GLOBAL_SETTINGS.projectLocation) return;
	  if (GLOBAL_SETTINGS.allModules.length === 0) return;
	  GLOBAL_SETTINGS['documents'] = documents
	  GLOBAL_SETTINGS['_textDocumentPosition'] = _textDocumentPosition

	  return functionHover(GLOBAL_SETTINGS)
   
    } catch (error) {
      console.log(error);
    }
  }
);

/**
 * Jump to defination
 */
connection.onDefinition(
  (_textDocumentPosition: TextDocumentPositionParams): Location => {
    try {
      if (!GLOBAL_SETTINGS.projectLocation) return;
      if (GLOBAL_SETTINGS.allModules.length === 0) return;

	  GLOBAL_SETTINGS['documents'] = documents
	  GLOBAL_SETTINGS['_textDocumentPosition'] = _textDocumentPosition
     return functionOnDefinition(GLOBAL_SETTINGS) 
    } catch (error) {
      console.log(error);
    }
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = "TypeScript details";
      item.documentation = "TypeScript documentation";
    } else if (item.data === 2) {
      item.detail = "JavaScript details";
      item.documentation = "JavaScript documentation";
    }
    return item;
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
