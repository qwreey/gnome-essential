#/bin/sh
# terminal theme
profile="b1dcc9dd-5262-4d8d-a863-c897e6d979b9"
termbase="/org/gnome/terminal/legacy/profiles:/:$profile"
dconf write "$termbase/palette" "['#262626','#E356A7','#42E66C','#E4F34A','#9B6BDF','#E64747','#75D7EC','#EFA554','#7A7A7A','#FF79C6','#50FA7B','#F1FA8C','#BD93F9','#FF5555','#8BE9FD','#FFB86C']" &
# dconf write "$termbase/palette" "[['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de', '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8']" &
dconf write "$termbase/background-color" "'#171421'" &
dconf write "$termbase/foreground-color" "'#cdd6f4'" &
dconf write "$termbase/highlight-background-color" "'#1e1e2e'" &
dconf write "$termbase/highlight-foreground-color" "'#585b70'" &
dconf write "$termbase/cursor-background-color" "'#f5e0dc'" &
dconf write "$termbase/cursor-foreground-color" "'#1e1e2e'" &

# gedit
dconf write "/org/gnome/gedit/preferences/editor/scheme" "'catppuccin_mocha'" &

# libadwaita
ln -sf "${HOME}/.themes/Colloid-Purple-Dark-Compact/gtk-4.0/gtk.css" "${HOME}/.config/gtk-4.0/gtk.css" &

