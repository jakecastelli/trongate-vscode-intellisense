// @ts-nocheck
import {readdirSync} from 'fs';
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

export function getAllTheModuleFolders(pathStr) {
	const filePath = pathStr
	return getDirectories(filePath + '/modules')
}

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

export function checkIsTrongateProject(filePath) {
	const allModules = getDirectories(filePath)
	const TRONGATE_FILE_REQUIREMENT = ['config', 'engine', 'modules', 'public', 'templates']
	const result = TRONGATE_FILE_REQUIREMENT.every(item => allModules.includes(item)) 
	return result;
}