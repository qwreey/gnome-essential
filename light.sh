#/bin/sh
# terminal theme
profile="b1dcc9dd-5262-4d8d-a863-c897e6d979b9"
termbase="/org/gnome/terminal/legacy/profiles:/:$profile"
dconf write "$termbase/palette" "['#262626','#E356A7','#42E66C','#E4F34A','#9B6BDF','#E64747','#75D7EC','#EFA554','#7A7A7A','#FF79C6','#50FA7B','#F1FA8C','#BD93F9','#FF5555','#8BE9FD','#FFB86C']" &
# dconf write "$termbase/palette" "['#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be', '#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc']" &
dconf write "$termbase/background-color" "'#eff1f5'" &
dconf write "$termbase/foreground-color" "'#4c4f69'" &
dconf write "$termbase/highlight-background-color" "'#eff1f5'" &
dconf write "$termbase/highlight-foreground-color" "'#acb0be'" &
dconf write "$termbase/cursor-background-color" "'#dc8a78'" &
dconf write "$termbase/cursor-foreground-color" "'#eff1f5'" &

# gedit
dconf write "/org/gnome/gedit/preferences/editor/scheme" "'catppuccin_latte'" &

# libadwaita
ln -sf "${HOME}/.themes/Colloid-Purple-Light-Compact/gtk-4.0/gtk.css" "${HOME}/.config/gtk-4.0/gtk.css" &

