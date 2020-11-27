# Trongate VSCode Intellisense
> This is a Trongate Framework specific Intellisense, it does not contain PHP intellisense, we recommand you to use `PHP Intelephense` for better experience.

<hr>

## Quick Start:

* Make sure you have opened Trongate project in your workspace

* The current intellisense supports **Autocomplete**, **Function Signature**, **Hover Over**, **Jump to Definition**

### Current Support:
**Note:** The trigger phrases are `' " ( >`, if the autocomplete disappears and you want it to pop up again, just try to simple remove the trigger phrase and type again, the popup should show again. For example: when you type `$data['view_module'] = `, right after you type single quote or double quote, the autocomplete will be triggered, if it is gone and you want it to popup again like this case `$data['view_module'] = ''`, remove the `''` at the end and once you type `'` again, whatever you are after will popup again.

* Pop up all the modules (within your modules folder):
  * `$data['view_module'] = '';` 
  
* Pop up all the view file which within the `view_module` (you need to do `$data['view_module'] = 'something';` to let the intellisense which module's view file you are after):
  * `$data['view_file'] = '';`

* When you trys to load up a module:
  * `$this->module('');` 
  
* When you trys to load all the public functions within this module you just loaded, for example: `$this->module('something');`:
  * `$this->something->`

* Show all the public functions from the `templates/controllers/Templates.php`:
  * `$this->template('');` 

* Show function signature:
  * `$this->your_loaded_module->this_is_an_exmaple_function();`

* Hover for detail
  
* Jump to definition


<hr>

## Running the Intellisense and see the ins and outs (Devlopers)

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press F5 and it will open another VSCode instance which you can have a play with.

## Bug Report:
If you encountered any bug or challenges, please submit an issue to us, we appricate your help and support!
