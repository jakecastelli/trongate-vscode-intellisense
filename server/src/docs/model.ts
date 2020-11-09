export const model = [
	{
		label: 'get',
		kind: 'function',
		data: 1,
		doc: 'Trongate function > get();\r\n\r\nget rows from db as an array\r\n\r\n$data[\'rows\'] = $this->model->get();\r\n\r\nIf you don\'t add params - returns all rows as an array reading the module name from the URL\r\n\r\n@param `$order_by` - Order by\r\n[optional] - default `id`\r\n\r\n@param `$target_tbl` - Target table\r\n[optional] - default module name\r\n\r\n@param `$limit` - Limit rows\r\n[optional]\r\n\r\n@param `$offset`\r\n[optional]\r\n\r\n@returns an array of rows',
		shortDoc: 'get([$order_by][, $target_tbl][, $limit][, $offset]);',
		signature: '([$order_by][, $target_tbl][, $limit][, $offset]);'
	},
	{
		label: 'get_where_custom',
		kind: 'function',
		data: 2
	},
	{
		label: 'get_where',
		kind: 'function',
		data: 3
	},
	{
		label: 'get_one_where',
		kind: 'function',
		data: 3
	},
	{
		label: 'get_many_where',
		kind: 'function',
		data: 3
	},
	{
		label: 'count',
		kind: 'function',
		data: 3
	},
	{
		label: 'count_where',
		kind: 'function',
		data: 3
	},
	{
		label: 'count_rows',
		kind: 'function',
		data: 3
	},
	{
		label: 'get_max',
		kind: 'function',
		data: 3
	},
	{
		label: 'resultSet',
		kind: 'function',
		data: 3
	},
	{
		label: 'show_query',
		kind: 'function',
		data: 3
	},
	{ label: 'insert',
		kind: 'function',
		data: 3
	},
	{ label: 'update',
		kind: 'function',
		data: 3
	},
	{ label: 'delete',
		kind: 'function',
		data: 3
	},
	{ label: 'query',
		kind: 'function',
		data: 3
	},
	{ label: 'query_bind',
		kind: 'function',
		data: 3
	},
	{ label: 'insert_batch',
		kind: 'function',
		data: 3
	},
	{ label: 'exec',
		kind: 'function',
		data: 3
	},




]