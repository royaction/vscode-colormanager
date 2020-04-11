![](https://www.dropbox.com/s/scoon50tx1d2sap/color_manager_demo.gif?raw=1)

# Description

- `color picker and color palette (opens in a side-view and adapts to the window-width and your vscode color theme)`
- `works in all languages`	
- `supports CSS-Colors, HEX, RGBa and HSLa`
- `AUTO-COMPLETE: insert color-values by meaningful names from vscode's intellisense-widget`
- `no need to select color values (just place the cursor within a color value)`
- `sort and convert options`
- `comes with factory palettes (CSS Colors, Google Material Palette, ...)`
- `customizable user-interface`

My main goal was to insert colors by meaningful names ... i dont wanna know how many hours i've lost by copying and pasting color values in the past 😩

The model of the color picker is different to the one in vscode. It's a recreation from one of the color pickers in Affinity Designer (a nice graphic app i'm using for mockups).

No Node-Modules! The main extension is plain Vanilla JS and has only a few KiloBytes `... it's installed in a few seconds - so check it out!`

# Changelog

- v0.5.7 git repo added
- v0.5.5 support for Hex-Colors with prefix "0x" (see docs-> "Usage" -> 5th sub-headline)
- v0.5.4 performance improvements, lots of fixes
- v0.5.3 the extensions saves and remembers its state when you close vscode without closing the extension before, some other bugfixes
- v0.5.0 the colors of the user-interface can be customized (see docs below)
- v0.4.8 keyboard shortcuts changed (see docs below)
- v0.4.5 new autocomplete/intellisense feature (see docs below), keyboard shortcuts
- v0.3.? new command 'restore factory palettes' to reset the factory palettes or to get new palettes that were included with an update, two new palettes added ("Google Material Palette 2014" and "coolors.co best picks")

# Buy me a coffee
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/royaction)


# add color palettes to autocoplete:

> since v0.4.5 there is a auto-complete feature that lets you insert palette-colors from the intellisense-widget:

![](https://www.dropbox.com/s/ril3t7p0x5mexqg/color_manager_autocomplete.png?raw=1)

# customizable UI colors: 

![](https://www.dropbox.com/s/1jufe8iw15dssma/color_manager_custom.png?raw=1)




# Usage:

## Commands:
 
- open color palette
- open color picker
- edit in color manager (place the cursor on a color value in your document ... doesnt have to be selected)
- intellisense add palette
- intellisense remove palette
- restore factory palettes

... the "restore factory palettes"-command can also be used to check if new palettes were included with an update. But beware if you have customized existing factory palettes! In this case you should rename them, otherwise they will be overwritten.

## Edit a color value in your document | store a document color in a palette:

Place the cursor on a color value in your document (doesnt have to be selected). Run the command "edit in color manager" or choose it from vscode's context menu. Use the "insert"-button on the bottom of the color picker to replace the document color. 

The button "add color to palette" will store the document-color to the currently loaded palette. It will be inserted at the position of the currently selected palette-color (red frame) ... or at the beginning if no color is selected.

## Insert a palette-color into your document:

Run the command "open color palette" or choose it from vscode's context menu. Place the cursor on a color value in your document ... doesnt have to be selected`*`. Left-click on a color field in the the color palette (if you are in order-mode or convert-mode this will be disabled).

`*=` The extension will detect if the cursor in your document is placed within a color value. In this case the color value in your document will be replaced. If the cursor is not placed within a color value, the color will be inserted at the current position. Selections will always be replaced.

## Edit a color that is saved in a palette:

The extension has it's own context-menu: right-click on the color and chose 'edit with color picker'. The button "replace palette color" on the top of the color picker will replace the currently selected color.

## Edit and Insert a Hex-Color with the prefix "0x" instead of "#":

`Attention!` Hex-Colors within the Webview-Extension are still handeled with the prefix "#", but you can edit "0x"-values in your document, and you can insert "#"-HexColors as "0x"-HexColors with the setting below (this also affects the Autocomplete-feature) 

```json
"color-manager.insertClassicHex": true, 
```

If you want to toggle that setting on the fly, then I recommend the extension "Settings Cycler". I think this is the best solution, because it avoids double-entries in the palette for different languages. And it did less work for me :)


## Sort colors:

- The extension itself has a basic ordering-mode. You can move a single color up and down by drag and drop and there are 4 buttons (by name, by value, by hue, reverse)

- `For extensive changes click on the button with the pencil-icon`. This will open the current selected palette in a new file-tab. Re-order the colors as you wish and then just save the file. The extension will automatically refresh the view as you save the file (this only works, if the palette-file is opened from the extension)

## Editing gradients:

Gradients can only be edited by the inputs. Maybe I'll include a gradient generator in a future release.

## Buttons
![](https://www.dropbox.com/s/otjmwbt1zi6oiuu/color_manager_buttons.jpg?raw=1) 

Okay ... one user gave me a bad review because he didnt know how to add a palette. So here is an image that explains all the buttons. The buttons also have hover-tooltips.

1. toggle edit-options 
2. load palette (you can also type in chars to filter the palettes)
3. toggle view mode (in the compact-view the color fields have hover-tooltips that will show you the name and the color value)
4. filter colors (searches in all inputs ... names and values)
5. add new color to the palette (will be inserted at the current selection, or at the beginning if no color is selected)
6. toggle sort mode
7. toggle palette converter
8. randomize palette
9. open palette manager (add, delete and rename palettes)
10. open palette in textmode (see description under "Sort colors" above)
11. restore palette (will restore the last save-state of the palette)
12. save current palette
 
## Shortcuts within the webview extension:

- 'ctrl + shift + s' will save the current palette
- 'ctrl + s' will save the active document in vscode (this is a custom implementation ... it usually doesnt work within webview extensions)
- 'ctrl + w' will close the webview extension (vscode's standard shortcut for closing file tabs)

I would have implemented more shortcuts but some of them will overlap with vscode's existing shortcuts (like ctrl + e).  

## Add color-palettes to vscode's autocomplete/intellisense:

Run the command "intellisense add palette". It will add the last loaded palette to vscode's automplete-widget, so the webview-extension itself doesnt have to be opened for that command. 

If you do changes to the currently active palette it will automatically refresh the intellisense entries. If you want to load another palette to intellisense, then open Color Manager, load another palette and run the command "intellisense add palette" again. 

Remove palette from autocomplete: run the command "intellisense remove palette". When you close vscode the palettes are removed from autocomplete ... so you have to run the command everytime you start vscode.

`Attention! This will only work if you have specified some languages in your settings. Heres an example-configuration: ` 

```json
"color-manager.languages": [ "css", "html", "javascript", "json", "scss" ] 
```

# Customize the colors of the user-interface:

By default the extension adapts to your vscode theme. I recognized that in some themes it just doesnt look good, so since v0.5.0 you can completely customize the colors of the extension.

Here is an example that you can paste into your settings ... looks like shit, but should give you a good overview!

`Info! You dont have to use all of the properties! If you just want to change the appearence of the buttons, then just set the "button..."-properties`

```json
"color-manager.styles": {  
	"selectionBorder": "blue",  
	"background": "LightGrey",  
	"foreground": "green", // labels and lines  
	"popupBorder": "Fuchsia", // border for colorpicker, palette-manager and dialogbox  
	"inputForeground": "#000", // input-text  
	"inputBackground": "white", // dropdown input on top and inputs in Palette Manager  
	"inputBorder": "tomato",  
	"buttonBackground": "DarkGray",  
	"buttonForeground": "tomato", // button-icons and button-text  
	"buttonBorder": "tomato",  
	"buttonHoverBackground": "hsla(0, 61%, 50%, 0.51)",  
	"dropdownForeground": "tomato",  
	"dropdownBackground": "white",  
	"dropdownHoverBackground": "hsla(0, 61%, 50%, 0.51)",  
	"overlayBackground": "hsla(0, 61%, 50%, 0.51)" // overlay for dialogbox   
},
```

# Don't pollute my context-menu!!! :(

If you dont like the entries in vscode's context-menu, open the 'settings.json' in the extension directory and delete the 'menus'-section (line 26 to 41), but be careful! Hopefully Microsoft will give us an option for this in the future ... my context-menu would take half of the screen, if I wouldnt do this with other extensions.


# Why does hex- to hsl- and back to hex-conversion gives me a different hex value???

This does not have to be but can be, depending on the specific color value. This has something to do with the different sizes of the color systems. All you should know is, that this behavior is the same in professional graphic- and image-editing apps and that the deviations are very small ... so dont worry.

# Moving color palettes to a different computer:

The color palettes are stored in the global user directory:

\user-data\User\globalStorage\royaction.color-manager\

... I choosed the scss-language as file format, because of the built-in syntax highlighting for scss.

# Performance:

The largest palette I have tested had 5000 colors. If you are in the list-view and your palette has more then 200 colors, then there will be a dynamic scroll function, which hides colors that are not visible and compensates the space with padding. The performance in this view-mode is surprisingly good. I didnt implement a paging- or dynamic loading-function, because color palettes in desktop apps also dont have such stuff.

If you are in the float-view (the view-mode with the small color fields) then there will be no performance-helper, because a window with a 700 x 900px can already contain around 1000 color fields. So a dynamic scroll function wouldn't make much sense and performance can be sluggish in this view-mode (with very large palettes only)

# Future releases:

I hope that Microsoft will give us an option to open a webview-extensions in it's own side-panel. I know that the current solution with the split-view is not perfect. There's a feature request on github. Support that request, if you like the idea:
https://github.com/Microsoft/vscode/issues/46585