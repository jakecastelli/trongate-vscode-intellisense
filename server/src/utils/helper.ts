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
	return getDirectories(path.join(filePath, 'modules'))
	// return getDirectories(filePath + '/modules')
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


export function hasLoadedModule(doc, pos, uri, verifyingModuleName) {
	let lookUpLine = pos - 1
	const loadModuleMatch = /\$this->module\((('\w+'|"\w+"\1))\)/

	while (true) {
		const oneLineAbove = getTargetLine(doc, lookUpLine, uri)
		if (isFalseLine(oneLineAbove)) {
			// comments // or /* or * 
			lookUpLine -= 1
			continue
		}
		if (isLastLine(oneLineAbove)) {
			// function xxx () 
			break;
		}

		// check the verifying module name matches the current line loaded module name
		if (oneLineAbove?.match(loadModuleMatch)) {
			const currentLoadedModuleName = oneLineAbove.match(loadModuleMatch)[1].split('').filter(item => item !== '\'' && '"').join('')
			if (verifyingModuleName === currentLoadedModuleName) return true
		}

		// nothing here, one line above again
		lookUpLine -= 1
		if (lookUpLine < 0) break; // no line above, so it ended
	}

	// return false means we could not find any match
	return false
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

	const viewFileLocation = path.join(projectLocation, 'modules', viewModuleName, 'views')
	// const viewFileLocation = `${projectLocation}/modules/${viewModuleName}/views`
	const viewFileArr = getFiles(viewFileLocation)
	return viewFileArr
}


/**
 * the function constructor for the regexMatch check
 * 
 * @param regexMatch 
 */
const regexMatchConstruct = regexMatch => line => {
	const regexPattern = regexMatch
	if (line.match(regexPattern)) return true

	return false
}


/**
 * We do not want to check a line if it is a comment  
 * 
 * match // or /* or *
 * regex pattern: /^\s*(\/\/|\/\*|\*)/ 
 * 	
 * @param line 
 */
export const isFalseLine = regexMatchConstruct(/^\s*(\/\/|\/\*|\*)/)


/**
 * If this line is the function definition it means we have hit the end of this function scope
 * 
 * regex pattern: /\s*function\s*\w+\s*\(/
 * 
 * @param line
 */
export const isLastLine = regexMatchConstruct(/\s*function\s*\w+\s*\(/)

/**
 * regex pattern: /\$data\[('view_module'|"view_module")\]\s*=\s*('\w+'|"\w+")/
 * 
 * @param line
 */
export const findViewModule = regexMatchConstruct(/\$data\[('view_module'|"view_module")\]\s*=\s*('\w+'|"\w+")/)

function getModuleName(line: string) {
	const findViewModuleMatch = /\$data\[('view_module'|"view_module")\]\s*=\s*('\w*'|"\w*")/
	const match = line.match(findViewModuleMatch)[2]
	const result = match.split('').filter(i => i !== '\'' && i !== '"').join('')
	return result
}


export function parseModule(line: string, GLOBAL_SETTINGS) {

	const moduleName = line.split('->')[1];
	const firstUpperModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
	if (!GLOBAL_SETTINGS.allModules.includes(moduleName)) return // no match found, terminate the parsing
	
	// const targetModuleControllerFileLocation = GLOBAL_SETTINGS.projectLocation

	const targetControllerLocation = path.join(GLOBAL_SETTINGS.projectLocation, 'modules', moduleName, 'controllers', firstUpperModuleName + '.php')

	// console.log(targetControllerLocation)

	// Read file & Extract functions and more
	try {
		const targetControllerContent = readFileSync(targetControllerLocation, { encoding: 'utf8' });
		// console.log(targetControllerContent)
		const functionResult = extractFunctions(targetControllerContent, GLOBAL_SETTINGS)
		functionResult['document_uri'] = targetControllerLocation
		return functionResult

	} catch (error) {
		console.log(error)
	}
}


export function extractFunctions(content: string, GLOBAL_SETTINGS) {

	const result = GLOBAL_SETTINGS.parser.parseCode(content, {
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
			// if it is a private method, we do not want to expose
			return []
		}

		const parameters = item.arguments.map((arg, index) => {
			if (index === 0) {
				return `[$${arg.name.name}${arg.value ? '=' + arg.value.raw : ''}]`
			}
			return `[, $${arg.name.name}${arg.value ? '=' + arg.value.raw : ''}]`
			// return `[, $${arg.name.name}]`
		}).join('')

		let rowDocs = '';
		let docs;
		/**
		 * parsedDoc is unused for now, but later when we bring custom docs and
		 * other cool stuff, we might need it, so keep it here for now
		 */
		let parsedDoc;
		try {
			if (item.leadingComments) {
				rowDocs = item.leadingComments[0].value
				// console.log(GLOBAL_SETTINGS.reader.parse(rowDocs))
				parsedDoc = GLOBAL_SETTINGS.reader.parse(rowDocs)
			}

			// docs = ''
			// docs += item.arguments.map(arg => {
			// 	if (parsedDoc && parsedDoc.body) {
			// 		const filterResult = parsedDoc.body.filter(parsedArg => parsedArg.name === arg.name.name)
			// 		if (filterResult.length > 0) {
			// 			return `\n@param ${filterResult[0]?.type?.name} $${filterResult[0].name} ${filterResult[0].description}`
			// 		} else {
			// 			return `\n@param mix $${arg.name.name}`
			// 		}
			// 	} else {
			// 		return `\n@param mix $${arg.name.name}`
			// 	}
			// }).join('')

			docs = GLOBAL_SETTINGS.reader.parse(rowDocs).summary

		} catch (error) {
			console.log(error)
		}

		return {
			funcNames: identifier,
			params: `(${parameters});`,
			docs: docs,
			shortDocs: `${identifier}(${parameters})`,
			range: {
				start: {
					line: item.loc.start.line,
					character: item.loc.start.column
				},
				end: {
					line: item.loc.end.line,
					character: item.loc.end.column
				}
			}
		}
	})

	return refine
}