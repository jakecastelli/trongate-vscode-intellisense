// @ts-nocheck
import {TextDocumentPositionParams, TextDocuments} from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument';

export function getTargetLine(documents: TextDocuments<TextDocument>, textDocPos: TextDocumentPositionParams) {
	try{
	const lines = documents.get(textDocPos.textDocument.uri).getText().split('\n');
	const targetLine = lines[textDocPos.position.line];
	return targetLine;
	} catch (err) {
		console.log(err)
	}
}