// @ts-nocheck
import {readdirSync} from 'fs';
import {TextDocumentPositionParams, TextDocuments} from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument';

export function getTargetLine(documents: TextDocuments<TextDocument>, textDocPos: number, uri) {
	try{
	const lines = documents.get(uri).getText().split('\n');
	// const targetLine = lines[textDocPos.position.line];
	const targetLine = lines[textDocPos];
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
	
const getFiles = source =>
	readdirSync(source, { withFileTypes: true })
		.filter(file => file.isFile())
		.map(file => {
			const viewFileName = file.name.split('.')[0]
			return viewFileName
		})

export function checkIsTrongateProject(filePath) {
	const allModules = getDirectories(filePath)
	const TRONGATE_FILE_REQUIREMENT = ['config', 'engine', 'modules', 'public', 'templates']
	const result = TRONGATE_FILE_REQUIREMENT.every(item => allModules.includes(item)) 
	return result;
}

export function getViewFiles(doc, pos, projectLocation, uri) {
	let lookUpLine = pos - 1
	let viewModuleName = ''

	while(true) {
		const oneLineAbove = getTargetLine(doc, lookUpLine, uri)
		if (isFalseLine(oneLineAbove)) {
			// comments // or *
				lookUpLine -= 1
				continue
			}
		if (isLastLine(oneLineAbove)) {
			// function xxx () {
			break
		}

		if (findViewModule(oneLineAbove)) {
			const resultModuleName = getModuleName(oneLineAbove)
			if (resultModuleName !== '') {
				viewModuleName = resultModuleName;
				break;
			}
		}

		// nothing here, one line above again
		lookUpLine -= 1
	}
	if (viewModuleName === '') return;

	const viewFileLocation = `${projectLocation}/modules/${viewModuleName}/views`
	const viewFileArr = getFiles(viewFileLocation)
	return viewFileArr
}

function isFalseLine(line: string) {
	const findCommentsMatch = /^\s*(\/\/|\*)/
	if (line.match(findCommentsMatch)) {
		return true
	} 
	return false
}

function isLastLine(line: string) {
	const findFunctionDecorationMatch = /\s*function\s*\w*\s*\(/
	if(line.match(findFunctionDecorationMatch)) {
		return true
	} 
	return false
}

function findViewModule(line: string) {
	const findViewModuleMatch = /\$data\[('view_module'|"view_module")\]\s*=\s*('\w*'|"\w*")/
	if (line.match(findViewModuleMatch)) {
		return true
	}
	return false
}

function getModuleName(line: string) {
	const findViewModuleMatch = /\$data\[('view_module'|"view_module")\]\s*=\s*('\w*'|"\w*")/
	const match = line.match(findViewModuleMatch)[2]
	const result = match.split('').filter(i => i !== '\'' && i !== '"').join('')
	return result
}