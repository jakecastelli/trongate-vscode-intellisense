// @ts-nocheck
import * as path from 'path'
import { readdirSync, readFileSync } from 'fs';
import { TextDocumentPositionParams, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument';

export function getTargetLine(documents: TextDocuments<TextDocument>, textDocPos: number, uri) {
	try {
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

	while (true) {
		const oneLineAbove = getTargetLine(doc, lookUpLine, uri)
		if (isFalseLine(oneLineAbove)) {
			// comments // or *
			lookUpLine -= 1
			continue
		}
		if (isLastLine(oneLineAbove)) {
			// function xxx () 
			break;
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
		if (lookUpLine < 0) break; // no line above, so it ended
	}
	if (viewModuleName === '') return;

	const viewFileLocation = `${projectLocation}/modules/${viewModuleName}/views`
	const viewFileArr = getFiles(viewFileLocation)
	return viewFileArr
}

export function isFalseLine(line: string) {
	/**
	 * match // or /* or *
	 */
	const findCommentsMatch = /^\s*(\/\/|\/\*|\*)/
	if (line.match(findCommentsMatch)) {
		return true
	}
	return false
}

function isLastLine(line: string) {
	const findFunctionDecorationMatch = /\s*function\s*\w*\s*\(/
	if (line.match(findFunctionDecorationMatch)) {
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

export function parseModule(line: string, GLOBAL_SETTINGS) {

	const moduleName = line.split('->')[1];
	const firstUpperModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
	console.log('===>')
	console.log(moduleName)
	console.log('<===')
	if (!GLOBAL_SETTINGS.allModules.includes(moduleName)) {
		// no match found, terminate the parsing
		return
	}
	// const targetModuleControllerFileLocation = GLOBAL_SETTINGS.projectLocation

	const targetControllerLocation = path.join(GLOBAL_SETTINGS.projectLocation, 'modules', moduleName, 'controllers', firstUpperModuleName + '.php')
	console.log(targetControllerLocation)

	// Read file
	try {
		const targetControllerContent = readFileSync(targetControllerLocation, { encoding: 'utf8' });
		// console.log(targetControllerContent)
		const functionResult = extractFunctions(targetControllerContent)
		return functionResult

	} catch (error) {
		console.log(error)
	}
}

function extractFunctions(content: string) {

	console.log('hello ??????????????????')

	const engine = require("php-parser");

	var DocParser = require('doc-parser');
	var reader = new DocParser();

	const parser = new engine({
		parser: {
			extractDoc: true,
			php7: true,
		},
		ast: {
			withPositions: true,
		},
	});
	// const result = parser.tokenGetAll(content).filter((token: Array<any>) => {
	// 	return (

	// 		// token[0] === "T_STRING"
	// 		// token[0] === "" 


	// 		token[0] !== "T_WHITESPACE" &&
	// 		token[0] !== "T_COMMENT" &&
	// 		token[0] !== "T_OPEN_TAG" &&
	// 		token[0] !== "T_INLINE_HTML"
	// 	);
	// })
	// 	.map((token: Array<any>, index: number) => {
	// 		if (Array.isArray(token)) {
	// 			return [...token, index];
	// 		}
	// 	})
	const result = parser.parseCode(content, {
		parser: {
			debug: false,
			locations: false,
			extractDoc: true,
			suppressErrors: false
		},
		lexer: {
			all_tokens: false,
			comment_tokens: false,
			mode_eval: false,
			asp_tags: false,
			short_tags: false
		}
	})
	console.log(result)

	const allMethods = result['children'][0]['body'].filter(item => item.kind === 'method')
	const refine = allMethods.map(item => {
		const identifier = item.name.name


		if (identifier.charAt(0) === '_' || item.visibility === 'private') {
			// private method
			return []
		}

		const parameters = item.arguments.map((arg, index) => {
			if (index === 0) {
				return `[$${arg.name.name}]`
			}
			return `[, $${arg.name.name}]`
		}).join('')

		const rowDocs = item.leadingComments[0].value
		const docs = reader.parse(rowDocs).summary

		console.log('------>>>>>>>>>>>>')
		console.log('------>>>>>>>>>>>>')
		console.log(docs)
		console.log('------>>>>>>>>>>>>')
		console.log('------>>>>>>>>>>>>')

		return {
			funcNames: identifier,
			params: `${identifier}(${parameters})`,
			docs: docs
		}
	})

	console.log('(((((((((((((((((((((((')
	console.log(refine)
	console.log(')))))))))))))))))))))))')
	return refine

	// const parser = new engine({
	// 	// some options :
	// 	parser: {
	// 		extractDoc: true,
	// 		php7: true
	// 	},
	// 	ast: {
	// 		withPositions: true
	// 	}
	// });

	// const result = parser.tokenGetAll(content)
	// console.log(result)


	// return
	/**
	 * TODO: remove the function with private decoration
	 * 		 extract parameters -- in progress
	 * 		 extract PHPDocs if possible
	 * 		 extract location for jump to defination
	 */
	// const funcMatch = /function\s*(?!_)\w*/g
	// const funcMatch = /function\s*(?!_)\w*\s*\((.*?)\)/

	/*
	const funcMatch = /function\s*(?!_)(\w*\1)\s*\((.*?\2)\)/g
	const regexResult = content.match(funcMatch)
	console.log(regexResult)
	// const publicFunctions = regexResult?.filter(item => item !== 'function').map(item => item.split(' ')[1])
	
	const result = regexResult?.map(item => {
		return {
			funcNames: item[1],
			params: item[2]
		}
	})
	
	return result;
	*/

	// const funcNames = regexResult?.map(item => item[1])
	// const params = regexResult?.map(item => item[2])

	// return {
	// 	funcNames: funcNames,
	// 	params: params
	// }
}






