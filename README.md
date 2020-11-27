# Trongate VSCode IntelliSense
> This is a Trongate Framework specific IntelliSense.  It does not contain a general PHP IntelliSense, so recommend you to use `PHP Intelephense` for a better experience.

<hr>

## Quick Start:

* Make sure you have an opened Trongate project in a VSCode workspace.  The extension will be looking for `config`, `engine`, `modules`, `public` , `templates` folders as they are the core anatomy of the Trongate Framework.

* The current IntelliSense supports **Autocomplete**, **Function Signature**, **Hover Over**, **Jump to Definition**

### Current Support:
**Note:** The trigger phrases are `' " ( >`

If the autocomplete disappears and you want it to pop up again, just simply remove the trigger phrase and type again.  The popup should show up again.

For example: when you type `$data['view_module'] = `, right after you type a single or double quote, the autocomplete will be triggered.  If it disappears and you want it to popup again as per our previous example.  `$data['view_module'] = ''`, just remove the `''` at the end and once you type `'` again, it will appear again.

## Use examples:
* Pop up all the modules, within your modules folder:
  * `$data['view_module'] = '';` 
  
* Pop up all the view files which are within the `view_module` *(you need to do* `$data['view_module'] = 'something';` *to let the IntelliSense know which module's view file you are after)*:
  * `$data['view_file'] = '';`

* When you try to load up a module:
  * `$this->module('');` 
  
* When you try to load all the public functions within the module you just loaded, for example: `$this->module('something');`:
  * `$this->something->`

* Show all the public functions from the `templates/controllers/Templates.php`:
  * `$this->template('');` 

* Show function signature:
  * `$this->your_loaded_module->this_is_an_exmaple_function();`

* Hover for detail
  
* Jump to definition


<hr>

## Running the IntelliSense in debug-mode and see the ins and outs (For Developers)

- Run `npm install` in the installed IntelliSense folder. This will install all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press `F5` and it will open another VSCode instance which you can have a play with.

## Bug Report:
If you encounter any bugs or challenges, please submit an issue in our repo.  We appreciate your help and support!
