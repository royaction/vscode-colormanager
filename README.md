![](https://www.dropbox.com/s/scoon50tx1d2sap/color_manager_demo.gif?raw=1)

# Description

- `color picker and color palette (opens in a side-view and adapts to the window-width and your vscode color theme)`
- `works in all languages`	
- `supports CSS-Colors, HEX, RGBa and HSLa`
- `AUTO-COMPLETE: insert color-values by meaningful names from vscode's intellisense-widget`
- `no need to select color values (just place the cursor within a color value)`
- `sort and convert options`
- `comes with factory palettes (around 5000 colors)`
- `customizable user-interface`

My main goal was to insert colors by meaningful names. I dont wanna know how many hours i've lost by copying and pasting color values in the past ...

The model of the color picker is different to the one in vscode. It's a recreation from one of the color pickers in Affinity Designer (a nice graphic app i'm using for mockups).

No Node-Modules! The main extension is plain Vanilla JS and has only a few KiloBytes ... it's installed in a few seconds - so check it out!

# Changelog

- v0.6.3 fix double context menu
- v0.6.2 You can now customize the width of the user-interface (run command "color manager help" for more infos). Fixed error in Command "find colors in selection"
- v0.6.1 select multiple colors with CRTL or SHIFT, new command "find colors in selection", 3 new palettes with around 3500 colors, new command "color manager help", new command "color manager changelog", 
- v0.5.7 git repo added
- v0.5.5 support for Hex-Colors with prefix "0x"
- v0.5.4 performance improvements, lots of fixes
- v0.5.3 the extensions saves and remembers its state when you close vscode without closing the extension before, some other bugfixes
- v0.5.0 the colors of the user-interface can be customized
- v0.4.8 keyboard shortcuts changed
- v0.4.5 new autocomplete/intellisense feature, keyboard shortcuts
- v0.3.? new command 'restore factory palettes' to reset the factory palettes or to get new palettes that were included with an update, 2 new palettes added

# Buy me a coffee
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/royaction)


# add color palettes to autocoplete:

> since v0.4.5 there is a auto-complete feature that lets you insert palette-colors from the intellisense-widget:

![](https://www.dropbox.com/s/ril3t7p0x5mexqg/color_manager_autocomplete.png?raw=1)

# customizable UI colors: 

![](https://www.dropbox.com/s/1jufe8iw15dssma/color_manager_custom.png?raw=1)


# Commands:
 
- open color palette
- open color picker
- edit in color manager (place the cursor on a color value in your document ... doesnt have to be selected)
- find colors in selection
- intellisense add palette
- intellisense remove palette
- restore factory palettes
- color manager help
- color manager changelog


# Usage / Help:
 
Run the command "color manager help" to see the manual!